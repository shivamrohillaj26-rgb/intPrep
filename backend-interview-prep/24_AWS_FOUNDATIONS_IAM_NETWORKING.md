# 24 — AWS foundations: accounts, IAM, networking, encryption

**Goal:** understand the three things *every* AWS conversation sits on — **who may call what (IAM)**, **how packets get there (VPC)**, and **how data is protected (KMS)**. Once these click, every service in guide 25 is easy.

---

## 1. The global layout

```text
AWS
 └─ Region (ap-south-1 = Mumbai, us-east-1 = N. Virginia)      ← data stays here unless you copy it
     └─ Availability Zones (ap-south-1a, 1b, 1c)                ← separate data centers, low-latency links
         └─ your subnets, instances, DB nodes live in one AZ each
 Edge locations (CloudFront, Route 53, Global Accelerator)     ← hundreds of POPs worldwide
```

| Scope | Services |
|---|---|
| **Global** | IAM, Route 53, CloudFront, Organizations, WAF (for CloudFront) |
| **Regional** | S3 buckets (names are global), Lambda, SQS, SNS, DynamoDB, API Gateway, KMS keys |
| **AZ** | EC2 instances, subnets, EBS volumes, an RDS instance node |

High availability = spread across **≥ 2 AZs**. Disaster recovery = copy to **another region**.

---

## 2. Accounts and organizations (how companies structure AWS)

An **AWS account** is a hard boundary for resources, permissions and billing. Companies use **many accounts**:

```text
AWS Organization (management account — billing only, nobody works here)
 ├─ OU Security:  log-archive account (CloudTrail from all accounts), security-tooling account
 ├─ OU Infra:     networking account (Transit Gateway, shared VPCs), shared-services (CI/CD, ECR)
 ├─ OU Workloads
 │   ├─ booknest-dev
 │   ├─ booknest-staging
 │   └─ booknest-prod                ← a bug in dev cannot touch prod: different account
 └─ OU Sandbox:   per-developer experiments with budgets
```

- **SCPs (Service Control Policies):** guardrails at the org level, e.g. "no one in Workloads may disable CloudTrail" or "only use ap-south-1 and us-east-1". SCPs **limit** permissions; they never grant.
- **Control Tower** sets this up with best-practice defaults ("landing zone").
- **IAM Identity Center (SSO):** humans log in once with the company IdP and pick an account + role. No IAM users with passwords per account.

---

## 3. IAM — who can do what

### The vocabulary

| Term | Meaning |
|---|---|
| **Principal** | Who is calling: an IAM user, an IAM **role** session, an AWS service, a federated user |
| **IAM user** | Long-lived identity with password/access keys. Avoid for apps and for humans (use SSO) |
| **IAM role** | An identity with permissions but **no long-term credentials**; you *assume* it and get temporary credentials |
| **Policy** | JSON document of Allow/Deny statements |
| **Identity-based policy** | Attached to a user/role: "this role may do X" |
| **Resource-based policy** | Attached to a resource: "this bucket/queue/key/function allows principal Y to do X" |
| **Trust policy** | A special resource policy on a role: **who may assume this role** |
| **STS** | Security Token Service: issues temporary credentials (`AssumeRole`) |
| **Permission boundary** | Max permissions a role can ever have (used to let teams create roles safely) |

### A policy, line by line

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadCovers",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::booknest-covers/*"
    },
    {
      "Sid": "SendOrderEvents",
      "Effect": "Allow",
      "Action": ["sqs:SendMessage"],
      "Resource": "arn:aws:sqs:ap-south-1:111122223333:order-events",
      "Condition": { "Bool": { "aws:SecureTransport": "true" } }
    }
  ]
}
```

- **Effect** Allow/Deny, **Action** `service:Operation`, **Resource** an **ARN** (`arn:partition:service:region:account:resource`), optional **Condition** (IP, tags, MFA, TLS, VPC endpoint, org ID…).

### How AWS decides (evaluation logic)

```text
1. Explicit DENY anywhere (SCP, boundary, identity, resource policy)?  → DENIED
2. Allowed by SCPs AND permission boundary (if any)?                    → if not, DENIED
3. Allowed by an identity policy OR (same account) a resource policy?   → ALLOWED
4. Otherwise                                                            → DENIED (default deny)
```

**Cross-account** access needs **both sides** to agree: the caller's identity policy allows it **and** the target's resource policy (or the role's trust policy) allows the caller's account/role.

### Roles in practice: how your code gets credentials

```text
ECS task        → "task role"        → credentials via the container metadata endpoint
Lambda          → "execution role"   → credentials in environment of the function
EC2             → "instance profile" → credentials via instance metadata (IMDSv2)
EKS pod         → IRSA / EKS Pod Identity → service account mapped to a role
GitHub Actions  → OIDC federation    → AssumeRoleWithWebIdentity, no stored keys
Human           → IAM Identity Center → short-lived session in the chosen account
```

The **AWS SDK default credential chain** finds them automatically (env vars → profile files → web identity → container/instance metadata). Your code just does `S3Client.create()`. **Never put access keys in code or images.**

Trust policy for a Lambda execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
```

Trust policy letting GitHub Actions in one repo deploy:

```json
{
  "Effect": "Allow",
  "Principal": { "Federated": "arn:aws:iam::111122223333:oidc-provider/token.actions.githubusercontent.com" },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
    "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:my-org/booknest:ref:refs/heads/main" }
  }
}
```

### ECS: task role vs execution role (classic confusion)

| Role | Used by | For |
|---|---|---|
| **Task execution role** | ECS agent | Pull image from ECR, write logs to CloudWatch, read secrets to inject as env |
| **Task role** | **Your application code** | Call S3, SQS, DynamoDB… at runtime |

### Who is allowed to invoke whom (service-to-service)

When one AWS service calls another *on your behalf*, permission comes from one of two places:

- **The service assumes a role you give it:** Step Functions uses its state machine role to call Lambda; EventBridge uses a role to put to Kinesis; Lambda's execution role is used to *read* from SQS/Kinesis in event source mappings.
- **The target has a resource policy allowing the service:** S3 → Lambda notifications need a **Lambda resource policy** (`lambda:InvokeFunction` for principal `s3.amazonaws.com`, condition `aws:SourceArn` = the bucket); SNS → SQS needs an **SQS queue policy** allowing `sns.amazonaws.com` with `aws:SourceArn` = the topic.

Always add `aws:SourceArn` / `aws:SourceAccount` conditions so *only your* bucket/topic can trigger it (prevents the "confused deputy" problem).

### Least privilege habits

- One role per service/function; scope `Resource` to exact ARNs.
- Use **IAM Access Analyzer** to find public/cross-account access and to generate policies from CloudTrail activity.
- Tag-based access control (ABAC): `"Condition": {"StringEquals": {"aws:ResourceTag/team": "${aws:PrincipalTag/team}"}}`.

---

## 4. VPC — your private network in AWS

### The pieces

```text
VPC 10.0.0.0/16  (65k private IPs, one region)
 ├─ AZ a
 │   ├─ public subnet   10.0.0.0/24   → route 0.0.0.0/0 → Internet Gateway     (ALB, NAT gateway)
 │   ├─ private subnet  10.0.10.0/24  → route 0.0.0.0/0 → NAT gateway (in public a)   (ECS tasks, Lambda ENIs)
 │   └─ data subnet     10.0.20.0/24  → no internet route                    (RDS, ElastiCache)
 └─ AZ b  (same three subnets, mirrored)
```

| Piece | What it does |
|---|---|
| **CIDR block** | IP range of the VPC/subnet (`/16`, `/24`). Plan ranges so they do not overlap with other VPCs/offices (needed for peering/VPN) |
| **Subnet** | A slice of the VPC in **one AZ**. "Public" just means its route table points to an IGW |
| **Route table** | Rules: destination CIDR → target (local, IGW, NAT, TGW, peering, endpoint) |
| **Internet Gateway (IGW)** | Two-way internet for resources with public IPs |
| **NAT gateway** | Lets private resources make **outbound** internet calls (to Stripe, to Docker Hub) without being reachable from outside. Per-AZ for HA; charges per hour + per GB |
| **Elastic IP** | Static public IPv4 |
| **Security group (SG)** | **Stateful** firewall on an ENI (instance, task, Lambda, RDS). Allow rules only. Return traffic automatically allowed. Can reference **other SGs** |
| **Network ACL (NACL)** | **Stateless** firewall on a subnet. Allow + deny rules, numbered order; must allow return (ephemeral) ports. Coarse backup layer |
| **ENI** | Elastic network interface — a virtual network card with a private IP |
| **VPC Flow Logs** | Record of accepted/rejected connections, for debugging and security |

### Security groups by reference (the clean way)

```text
sg-alb:   inbound 443 from 0.0.0.0/0
sg-app:   inbound 8080 from sg-alb            ← only the load balancer can reach the app
sg-db:    inbound 5432 from sg-app            ← only the app can reach Postgres
sg-redis: inbound 6379 from sg-app
```

No IPs to maintain; scales with autoscaling.

### SG vs NACL

| | Security group | NACL |
|---|---|---|
| Attached to | ENI / resource | Subnet |
| State | Stateful | Stateless |
| Rules | Allow only | Allow and deny |
| Typical use | Main control | Block a bad IP range, compliance |

### Reaching AWS services privately: VPC endpoints

Without endpoints, a private task calling S3 goes **through the NAT gateway** to the public S3 endpoint (costs NAT data charges).

| Endpoint type | For | How |
|---|---|---|
| **Gateway endpoint** (free) | **S3, DynamoDB** only | A route-table entry to the service |
| **Interface endpoint** (PrivateLink, hourly + GB) | Most other services: SQS, SNS, Secrets Manager, ECR, CloudWatch Logs, STS, KMS… | An ENI with a private IP in your subnet; private DNS makes `sqs.ap-south-1.amazonaws.com` resolve to it |

Endpoint policies + bucket policy condition `aws:SourceVpce` = "this bucket only accepts traffic from our VPC endpoint".

A fully private subnet (no NAT at all) works if you add endpoints for ECR (api + dkr), S3 (image layers), CloudWatch Logs, STS and Secrets Manager.

### Connecting networks

| Need | Use |
|---|---|
| VPC ↔ VPC, a few | **VPC peering** (one-to-one, non-transitive: A–B and B–C does not give A–C) |
| Many VPCs and accounts, hub-and-spoke | **Transit Gateway** (central router, transitive, route tables per attachment) |
| Expose **one service** to other VPCs/accounts/customers without network merging | **PrivateLink** (NLB in provider VPC → endpoint service → interface endpoints in consumers). Overlapping CIDRs are fine |
| Office/data center ↔ AWS | **Site-to-Site VPN** (over internet, quick) or **Direct Connect** (dedicated line, consistent latency) |
| Share subnets across accounts | **VPC sharing** (RAM) |
| Service-to-service across VPCs at the app layer | **VPC Lattice** (managed service networking with auth policies) |

### DNS inside AWS

- Every VPC has a resolver at `.2` of its range (`10.0.0.2`).
- **Route 53 private hosted zones:** `orders.internal.booknest` resolvable only inside attached VPCs.
- **Route 53 Resolver endpoints** forward DNS between on-prem and AWS.
- Services get DNS names (RDS endpoint, ALB DNS); never hard-code IPs.

### Load balancers

| | ALB (Application) | NLB (Network) | GWLB (Gateway) |
|---|---|---|---|
| Layer | 7 (HTTP/HTTPS, gRPC, WebSocket) | 4 (TCP/UDP/TLS) | 3 (inline appliances) |
| Routing | Host, path, header, query, weighted target groups | Port | — |
| Features | TLS termination, auth (OIDC/Cognito), redirects, WAF | Static IPs, millions req/s, preserves client IP, PrivateLink | Firewalls/IDS fleets |
| Targets | Instances, IPs (ECS tasks), Lambda | Instances, IPs, ALB | Appliances |

**Target groups** hold the targets + health checks. **Listeners** (port 443) have **rules** → target groups. Weighted target groups enable canary/blue-green at the ALB.

### Public edge

```text
User ─► Route 53 (DNS, health checks, routing policies)
     ─► CloudFront (CDN, TLS with ACM cert, WAF, caching, Lambda@Edge/CloudFront Functions)
     ─► Origin: S3 (static site via Origin Access Control) or ALB / API Gateway (dynamic)
```

Route 53 routing policies: **simple**, **weighted** (canary between stacks), **latency** (nearest region), **failover** (primary/secondary with health checks), **geolocation/geoproximity**, **multivalue**. **Alias** records point to AWS resources (ALB, CloudFront) at the zone apex for free.

**Global Accelerator:** two static anycast IPs routing over AWS's backbone to the nearest healthy regional endpoint — for non-HTTP or when you need fixed IPs and fast regional failover.

**ACM (Certificate Manager):** free public TLS certificates with auto-renewal for ALB, CloudFront (must be in us-east-1 for CloudFront), API Gateway.

---

## 5. Encryption and secrets

### KMS and envelope encryption

```text
Encrypt:  app asks KMS GenerateDataKey(KMS key "booknest-prod")
          ← plaintext data key + encrypted data key
          app encrypts the file with the plaintext data key (AES-256), throws plaintext key away
          stores: ciphertext + encrypted data key

Decrypt:  app sends encrypted data key to KMS Decrypt (if IAM + key policy allow)
          ← plaintext data key → decrypt the file locally
```

Why: KMS never sees your big data (only 4 KB max per direct encrypt), the master key **never leaves KMS**, and access to data = access to the key, which is audited in CloudTrail.

- **AWS managed keys** (`aws/s3`) vs **customer managed keys** (you control the **key policy**, rotation, cross-account grants).
- **Key policy** is the resource policy of a KMS key; IAM alone is not enough unless the key policy delegates to IAM.
- S3 SSE-KMS, RDS, EBS, DynamoDB, SQS, Secrets Manager all integrate — tick a box, choose a key.
- Deleting a key = data unreadable forever (mandatory 7–30 day waiting period).

### Secrets Manager vs SSM Parameter Store

| | Secrets Manager | Parameter Store |
|---|---|---|
| For | DB passwords, API keys | Config values, also SecureString secrets |
| Rotation | Built-in (Lambda rotators, RDS native) | Manual |
| Cost | Per secret per month | Standard tier free |
| Cross-account | Resource policy | Limited |

Apps read secrets at startup (and cache them, refreshing on rotation) via SDK, the ECS `secrets` injection, or the Lambda extension. RDS can also use **IAM database authentication** (short-lived token instead of a password).

---

## 6. Security and governance services

| Service | What it answers |
|---|---|
| **CloudTrail** | Who called which AWS API, when, from where (audit). Org trail into a log-archive account |
| **AWS Config** | What did this resource's configuration look like over time? Rules flag non-compliance (public bucket, unencrypted volume) |
| **GuardDuty** | Threat detection from CloudTrail, VPC flow logs, DNS logs (crypto-mining, credential exfiltration) |
| **Security Hub** | Central dashboard of findings and best-practice checks |
| **Inspector** | Vulnerability scanning for EC2, ECR images, Lambda |
| **Macie** | Finds sensitive data (PII) in S3 |
| **WAF** | Layer-7 rules on CloudFront/ALB/API Gateway: SQLi/XSS managed rules, rate-based rules, geo blocks, bot control |
| **Shield** | DDoS protection (Standard free; Advanced paid with response team) |
| **IAM Access Analyzer** | Unintended public/cross-account access; unused permissions |
| **Detective** | Investigate findings with graph of activity |

---

## 7. Quotas, throttling and the SDK

- Every service has **quotas** (Lambda concurrency per region, API rates, ENIs per subnet). Check **Service Quotas** before launch; request increases ahead of big events.
- Throttled calls return `ThrottlingException` / `429` / `ProvisionedThroughputExceeded`. The **AWS SDK retries automatically** with exponential backoff and jitter (standard/adaptive retry modes). Configure max attempts and timeouts; do not wrap with a second retry loop.
- SDK clients are thread-safe and expensive to build — **create once, reuse**.
- Pagination: list APIs return a `NextToken`; SDK v2 has paginators (`s3.listObjectsV2Paginator(...)`).

```java
S3Client s3 = S3Client.builder()
    .region(Region.AP_SOUTH_1)
    .overrideConfiguration(c -> c
        .apiCallTimeout(Duration.ofSeconds(10))
        .retryStrategy(AwsRetryStrategy.standardRetryStrategy()))
    .build();
```

---

## 8. The Well-Architected Framework (six pillars)

| Pillar | Key questions |
|---|---|
| **Operational excellence** | IaC, small reversible changes, runbooks, observability |
| **Security** | Identity (least privilege), traceability, encryption, protect every layer |
| **Reliability** | Multi-AZ, auto recovery, scaling, backups tested, quotas managed |
| **Performance efficiency** | Right services/instance types, caching, serverless, measure |
| **Cost optimization** | Pay for what you use, right-size, Savings Plans/Spot, tag and track |
| **Sustainability** | Efficient resources, Graviton, scale down idle |

Interviewers love: "How would you review this architecture?" → walk the six pillars.

---

## Common mistakes

| Mistake | Fix |
|---|---|
| Access keys in code / CI secrets | Roles + OIDC federation |
| `"Action": "*"`, `"Resource": "*"` | Exact actions and ARNs |
| Databases in public subnets | Data subnets, SG from app SG only |
| All private traffic to S3 through NAT | Gateway endpoint (free) |
| Single AZ | Mirror subnets and capacity in ≥ 2 AZs |
| One account for everything | Separate dev/staging/prod accounts + SCPs |
| Lambda/S3/SNS triggers without `SourceArn` conditions | Add them (confused deputy) |
| Ignoring quotas | Service Quotas review before launch |

---

## Spoken answer (50s)

> Everything in AWS rests on accounts, IAM, networking and encryption. Companies use an Organization with separate accounts per environment and SCP guardrails, and humans log in through Identity Center. Workloads never hold access keys: ECS task roles, Lambda execution roles and IRSA give temporary STS credentials, and CI uses OIDC federation. Access is evaluated as default deny, explicit deny wins, and cross-account needs both the identity policy and the resource or trust policy. Networks are VPCs across at least two AZs with public subnets for load balancers, private subnets for apps behind NAT, and isolated data subnets, with security groups referencing each other, gateway endpoints for S3 and DynamoDB and PrivateLink endpoints for other services. Peering, Transit Gateway or PrivateLink connect VPCs. Data is encrypted with KMS envelope encryption, secrets live in Secrets Manager, and CloudTrail, Config, GuardDuty and WAF cover audit and threats.
