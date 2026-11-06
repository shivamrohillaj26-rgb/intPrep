# 25 — AWS services and how they talk to each other

**Goal:** know what each major AWS service does, **how one service triggers or calls another**, who holds the permission for that call, and be able to draw complete BookNest flows on AWS from the browser to the database and back.

Read guide 24 (IAM, VPC, KMS) first — every connection below uses those.

---

## 1. The three ways AWS services connect

Almost every integration is one of these:

| Model | How it works | Examples | Who needs permission |
|---|---|---|---|
| **Synchronous push** | Caller waits for the answer | API Gateway → Lambda, ALB → ECS, app → DynamoDB, Step Functions → Lambda (request/response) | Caller's role (or target's resource policy for service principals) |
| **Asynchronous push (event)** | Source fires and forgets; AWS queues it internally and retries | S3 → Lambda, SNS → Lambda/SQS, EventBridge → targets, Lambda async invoke | **Target's resource policy** allows the source service (`aws:SourceArn`) — or a role EventBridge assumes |
| **Poll-based (event source mapping)** | A poller (run by Lambda, or your code) reads from a queue/stream in batches | SQS → Lambda, Kinesis → Lambda, DynamoDB Streams → Lambda, MSK → Lambda, ECS worker polling SQS | **Consumer's role** needs read permissions on the queue/stream |

Retry behavior differs per model — this is a favorite interview question (section 3.4).

---

## 2. Compute

### 2.1 EC2 (virtual machines)

- **AMI** (image) + **instance type** (`m7g.large` = general purpose, Graviton, large) + **EBS** disk + SG + subnet.
- **Launch template** + **Auto Scaling Group (ASG)**: keeps N healthy instances across AZs, scales on metrics (target tracking: "keep CPU at 50%"), replaces failed ones, registers them in ALB target groups.
- Pricing: On-Demand, **Savings Plans / Reserved** (commit 1–3 years, ~up to 70% off), **Spot** (spare capacity, up to ~90% off, can be reclaimed with 2-minute notice — batch, stateless workers).
- **IMDSv2** for instance metadata (session token; blocks SSRF credential theft).

### 2.2 ECS (Elastic Container Service)

```text
Cluster
 └─ Service "order-service"  (desired count 3, rolling or blue/green, attached to ALB target group)
     └─ Tasks (running copies) ← from Task Definition: image, CPU/mem, env, secrets, ports, roles, log config
Launch type: Fargate (serverless, per-task billing) or EC2 (you manage instances, capacity providers)
```

```json
{
  "family": "order-service",
  "networkMode": "awsvpc",
  "cpu": "512", "memory": "1024",
  "executionRoleArn": "arn:aws:iam::111122223333:role/order-exec",
  "taskRoleArn": "arn:aws:iam::111122223333:role/order-task",
  "containerDefinitions": [{
    "name": "app",
    "image": "111122223333.dkr.ecr.ap-south-1.amazonaws.com/order-service:9f2c1ab",
    "portMappings": [{ "containerPort": 8080 }],
    "environment": [{ "name": "SPRING_PROFILES_ACTIVE", "value": "prod" }],
    "secrets": [{ "name": "DB_PASSWORD",
                  "valueFrom": "arn:aws:secretsmanager:ap-south-1:111122223333:secret:prod/orders/db" }],
    "logConfiguration": { "logDriver": "awslogs",
      "options": { "awslogs-group": "/ecs/order-service", "awslogs-region": "ap-south-1", "awslogs-stream-prefix": "app" } },
    "healthCheck": { "command": ["CMD-SHELL", "wget -qO- localhost:8080/actuator/health/liveness || exit 1"] }
  }]
}
```

- `awsvpc` mode: each task gets its own ENI, private IP and security group.
- Autoscaling: Application Auto Scaling on CPU, memory, ALB requests per target, or SQS queue depth (custom metric "backlog per task").
- **ECS Service Connect / Cloud Map**: services find each other by name (`http://payment-service:8080`).
- Deployments: rolling (min/max healthy %), **circuit breaker** auto-rollback, or blue/green via CodeDeploy.

### 2.3 EKS (Kubernetes)

Managed control plane; worker nodes as managed node groups, **Karpenter** autoscaling, or Fargate. Pods get AWS permissions via **IRSA / Pod Identity**. **AWS Load Balancer Controller** creates ALBs/NLBs from Ingress/Service objects. Choose EKS when you need the Kubernetes ecosystem or portability; ECS is simpler for AWS-only teams.

### 2.4 Lambda (functions)

**Invocation models (memorize):**

| Model | Who calls | Retries on error | Failure handling |
|---|---|---|---|
| **Synchronous** | API Gateway, ALB, SDK `Invoke` (RequestResponse), Cognito triggers | **None by Lambda** — caller gets the error and decides | Caller retries |
| **Asynchronous** | S3, SNS, EventBridge, SDK `Invoke` (Event) | Lambda retries **2 more times** (with delays), keeps event up to 6 h (configurable) | **On-failure destination** (SQS/SNS/EventBridge/Lambda) or DLQ |
| **Event source mapping (poll)** | SQS, Kinesis, DynamoDB Streams, MSK, MQ | **SQS:** message reappears after visibility timeout until `maxReceiveCount` → queue's DLQ. **Streams:** retries the batch until success or expiry — **blocks the shard** | Streams: bisect batch, max retry attempts, max record age, on-failure destination, `ReportBatchItemFailures` |

**Concurrency:** each concurrent request = one execution environment. Account default limit per region (often 1,000, raisable).
- **Reserved concurrency:** guarantee and cap for a function (cap protects a downstream DB).
- **Provisioned concurrency:** pre-initialized environments → no cold start (costs money).
- SQS ESM scales pollers up gradually; set **maximum concurrency** on the mapping to protect downstream.

**Other features:** layers (shared libs), extensions (agents like secrets caching, telemetry), **SnapStart** (Java: snapshot after init, restore fast), **function URLs** (simple HTTPS endpoint), **aliases + versions** (`prod` alias → version 42; weighted alias for canary), container image packaging (up to 10 GB), `/tmp` up to 10 GB, **Lambda in VPC** (ENIs in your subnets → can reach RDS/ElastiCache; needs NAT or endpoints for internet/AWS APIs).

SQS consumer with partial batch failure:

```java
public class OrderEventsHandler implements RequestHandler<SQSEvent, SQSBatchResponse> {
    @Override
    public SQSBatchResponse handleRequest(SQSEvent event, Context ctx) {
        List<SQSBatchResponse.BatchItemFailure> failures = new ArrayList<>();
        for (SQSEvent.SQSMessage m : event.getRecords()) {
            try {
                process(m.getBody());                       // idempotent!
            } catch (Exception e) {
                failures.add(new SQSBatchResponse.BatchItemFailure(m.getMessageId()));
            }
        }
        return new SQSBatchResponse(failures);              // only failed messages return to the queue
    }
}
```
(Requires `ReportBatchItemFailures` enabled on the event source mapping.)

### 2.5 Other compute

| Service | Use |
|---|---|
| **App Runner** | Give it a container image or repo, get an HTTPS service with autoscaling. Simplest container hosting |
| **Elastic Beanstalk** | Older PaaS: upload a JAR/WAR, it builds EC2 + ASG + ALB for you |
| **AWS Batch** | Queue of batch jobs run on EC2/Spot/Fargate (nightly imports, reports, ML) |
| **Lightsail** | Simple VPS bundles for small projects |

**Compute decision:**

```text
Event-driven, spiky, short (< 15 min)           → Lambda
Long-running HTTP service / consumer, AWS-only   → ECS Fargate
Need Kubernetes ecosystem / multi-cloud          → EKS
Full OS control, special hardware, legacy        → EC2 + ASG
Just run my container with minimum setup         → App Runner
Big batch jobs                                   → AWS Batch / Step Functions + Fargate
```

---

## 3. Front doors and identity

### 3.1 API Gateway

| | REST API | HTTP API | WebSocket API |
|---|---|---|---|
| Cost / latency | Higher | Lower (~70% cheaper) | Per message + connection minutes |
| Features | Usage plans + API keys, request validation, caching, WAF, transformations, private APIs, X-Ray | JWT authorizers built-in, Lambda/HTTP/private integrations, simpler | Routes by message (`$connect`, `$disconnect`, `$default`, custom) |
| Choose when | Need the extra features | Most new Lambda/HTTP APIs | Real-time push to clients |

**Integrations:** Lambda proxy (whole request → event), HTTP proxy (forward to a URL), **VPC Link** (to a private ALB/NLB — reach ECS services privately), **direct AWS service integrations** (e.g. API → SQS `SendMessage` or → Step Functions `StartExecution` without any Lambda).

**Authorizers:**

| Type | How |
|---|---|
| IAM (SigV4) | Callers sign requests with AWS credentials — service-to-service, internal tools |
| Cognito user pool authorizer (REST) / **JWT authorizer** (HTTP) | Validates the OIDC JWT (issuer, audience, expiry) at the edge |
| **Lambda authorizer** | Your function validates any token/header, returns an IAM policy (cached by token for N seconds). Use for custom tokens or session lookups |
| Resource policy | Allow only certain VPCs/IPs/accounts |

**Throttling:** account-level and per-stage/route rate + burst (token bucket); usage plans per API key for partners. Returns 429.

WebSocket API flow: client connects → `$connect` Lambda stores `connectionId` (DynamoDB) → backend pushes with `POST @connections/{connectionId}` via the API Gateway Management API → `$disconnect` cleans up.

### 3.2 AppSync

Managed **GraphQL** (and Pub/Sub "Events" APIs): resolvers to DynamoDB, Lambda, RDS, HTTP; subscriptions over WebSockets; Cognito/IAM/OIDC/API key auth. Good for BFF-style client-driven queries and real-time.

### 3.3 Cognito

| | **User pools** | **Identity pools** |
|---|---|---|
| Is | A user directory + OIDC/OAuth2 auth server | A credentials broker |
| Gives | ID / access / refresh **JWTs** | **Temporary AWS credentials** (STS) |
| Use | Sign-up/sign-in, MFA, social/SAML/OIDC federation, hosted UI, app clients | Let a browser/mobile app call S3/IoT/etc. directly with scoped IAM roles |
| Hooks | Lambda triggers: pre sign-up, post confirmation, pre token generation (add claims), custom auth | Role mapping by group/claims |

Typical: SPA uses **auth code + PKCE** with a user pool → sends access token to API Gateway → JWT authorizer validates it → Lambda/ECS gets claims (`sub`, `cognito:groups`).

### 3.4 Retry semantics summary (who retries what)

```text
Browser → API GW → Lambda (sync)        : nobody retries automatically → client decides (use idempotency keys)
S3 / SNS / EventBridge → Lambda (async) : Lambda retries 2× → destination/DLQ
SNS → SQS                               : SNS retries delivery with backoff (many attempts); SQS stores durably
EventBridge → target                    : retries with backoff up to 24 h / 185 attempts (configurable) → target DLQ
SQS → Lambda (ESM)                      : visibility timeout cycles → maxReceiveCount → SQS DLQ
Kinesis/DDB Streams → Lambda (ESM)      : retries batch in order (blocks shard) → bisect / max age / on-failure destination
Step Functions Task                     : your Retry/Catch config per state
AWS SDK calls                           : SDK retries throttling/5xx with backoff
```

Because of all these retries, **every handler must be idempotent**.

---

## 4. Messaging and integration services

### 4.1 SQS (queue)

- **Standard:** nearly unlimited throughput, at-least-once, best-effort ordering.
- **FIFO:** ordering per `MessageGroupId`, exactly-once *processing within a 5-minute dedup window* (`MessageDeduplicationId`), lower throughput (high-throughput mode available).
- **Visibility timeout:** after a consumer receives a message, it is hidden for N seconds; delete it when done or it reappears. Set ≥ 6× the Lambda timeout for Lambda consumers.
- **Long polling** (`WaitTimeSeconds=20`): fewer empty responses, lower cost.
- Batch send/receive/delete up to 10 messages. Max message 256 KB (claim check for bigger: S3 + pointer).
- **Delay queues / message timers**, **retention** up to 14 days.
- **DLQ** via redrive policy (`maxReceiveCount`), plus **DLQ redrive** back to the source after a fix.

```java
sqs.sendMessage(r -> r.queueUrl(queueUrl)
    .messageBody(json)
    .messageAttributes(Map.of("type", MessageAttributeValue.builder().dataType("String").stringValue("OrderPlaced").build())));

ReceiveMessageResponse res = sqs.receiveMessage(r -> r.queueUrl(queueUrl).maxNumberOfMessages(10).waitTimeSeconds(20));
for (Message m : res.messages()) {
    handle(m.body());                                                  // idempotent
    sqs.deleteMessage(d -> d.queueUrl(queueUrl).receiptHandle(m.receiptHandle()));
}
```

### 4.2 SNS (pub/sub)

- Topic → subscriptions: **SQS, Lambda, HTTP/S, email, SMS, mobile push, Firehose**.
- **Fan-out:** `order-events` topic → `email-queue`, `analytics-queue`, `warehouse-queue`. Each consumer gets its own durable queue and processes at its own pace.
- **Filter policies** on a subscription (by message attributes or body): warehouse queue only receives `{"type": ["OrderPlaced"]}`.
- FIFO topics → FIFO queues for ordered fan-out.
- Raw message delivery to avoid the SNS JSON envelope in SQS.
- Permission: the SQS **queue policy** must allow `sns.amazonaws.com` with `aws:SourceArn` = topic ARN.

### 4.3 EventBridge (event bus + router)

```text
Sources: your apps (PutEvents), AWS services (EC2 state change, S3 via EventBridge, CodePipeline…), SaaS partners
   ▼
Event bus (default / custom "booknest" / partner)
   ▼ rules: event pattern match
   { "source": ["booknest.orders"], "detail-type": ["OrderPlaced"], "detail": { "totalCents": [{ "numeric": [">", 100000] }] } }
   ▼ up to 5 targets per rule, with input transformation
Targets: Lambda, SQS, SNS, Step Functions, Kinesis, Firehose, ECS task, API destinations (any HTTP API), another bus (cross-account/region)
```

- **Archive and replay** events, **schema registry** (discover event shapes, generate code bindings).
- **EventBridge Pipes:** point-to-point source (SQS, Kinesis, DynamoDB Streams, MSK) → optional filter → enrichment (Lambda/API) → target. Replaces glue Lambdas.
- **EventBridge Scheduler:** cron/rate/one-time schedules at scale invoking 270+ AWS APIs ("cancel this order in 15 minutes" as a one-time schedule).
- vs SNS: EventBridge = rich content routing, many targets, SaaS/AWS sources, replay; SNS = higher throughput, lower latency fan-out, mobile/SMS/email.

```java
eventBridge.putEvents(r -> r.entries(PutEventsRequestEntry.builder()
    .eventBusName("booknest")
    .source("booknest.orders")
    .detailType("OrderPlaced")
    .detail("{\"orderId\":501,\"totalCents\":2598}")
    .build()));
```

### 4.4 Kinesis family

| Service | What |
|---|---|
| **Kinesis Data Streams** | Ordered, replayable shards (guide 12). Consumers: KCL apps, Lambda ESM, Firehose, Managed Flink. On-demand or provisioned capacity |
| **Data Firehose** | Zero-code delivery: buffer records (by size/time) → optional Lambda transform → **S3 / Redshift / OpenSearch / Splunk / HTTP**. Converts JSON → Parquet with Glue schema. Near-real-time (seconds–minutes) |
| **Managed Service for Apache Flink** | Stateful stream processing (windows, joins) on streams |
| **Kinesis Video Streams** | Ingest and store video from devices; playback/processing |

Classic pipeline: producers → Data Streams → (Lambda real-time alerts) + (Firehose → S3 Parquet partitioned by date) → Athena queries.

### 4.5 MSK and Amazon MQ

- **MSK:** managed Apache Kafka (provisioned or serverless). Use when you want Kafka APIs/ecosystem (Kafka Connect, Streams). **MSK Connect** for connectors (Debezium CDC).
- **Amazon MQ:** managed ActiveMQ/RabbitMQ for lift-and-shift apps using JMS/AMQP/MQTT.

### 4.6 Step Functions (workflow orchestration)

Visual state machines in JSON (Amazon States Language).

```json
{
  "StartAt": "ReserveStock",
  "States": {
    "ReserveStock": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": { "FunctionName": "reserve-stock", "Payload.$": "$" },
      "Retry": [{ "ErrorEquals": ["States.TaskFailed"], "IntervalSeconds": 2, "MaxAttempts": 3, "BackoffRate": 2 }],
      "Catch": [{ "ErrorEquals": ["OutOfStock"], "Next": "CancelOrder" }],
      "Next": "ChargePayment"
    },
    "ChargePayment": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": { "FunctionName": "charge-payment", "Payload.$": "$" },
      "Catch": [{ "ErrorEquals": ["PaymentDeclined"], "Next": "ReleaseStock" }],
      "Next": "ConfirmOrder"
    },
    "ReleaseStock":  { "Type": "Task", "Resource": "arn:aws:states:::lambda:invoke",
                       "Parameters": { "FunctionName": "release-stock", "Payload.$": "$" }, "Next": "CancelOrder" },
    "CancelOrder":   { "Type": "Task", "Resource": "arn:aws:states:::dynamodb:updateItem",
                       "Parameters": { "TableName": "orders", "Key": { "pk": { "S.$": "$.orderKey" } },
                                       "UpdateExpression": "SET #s = :c",
                                       "ExpressionAttributeNames": { "#s": "status" },
                                       "ExpressionAttributeValues": { ":c": { "S": "CANCELLED" } } },
                       "End": true },
    "ConfirmOrder":  { "Type": "Task", "Resource": "arn:aws:states:::sns:publish",
                       "Parameters": { "TopicArn": "arn:aws:sns:ap-south-1:111122223333:order-confirmed", "Message.$": "States.JsonToString($)" },
                       "End": true }
  }
}
```

- That is a **saga orchestrator** (guide 13) with compensations, managed for you.
- State types: Task, Choice, Parallel, **Map** (fan out over items; Distributed Map for millions of S3 objects), Wait, Pass, Succeed, Fail.
- **Standard** workflows: up to 1 year, exactly-once state transitions, auditable history, priced per transition. **Express**: up to 5 minutes, high volume, at-least-once, priced per duration — for event processing.
- **Direct SDK integrations** (DynamoDB, SQS, SNS, ECS RunTask, Glue, Athena, Bedrock…) without Lambda.
- **Wait for callback (task token):** `.waitForTaskToken` pauses until an external system (human approval, partner webhook) calls `SendTaskSuccess(token)`.
- **`.sync`**: start an ECS task / Glue job / another workflow and wait until it finishes.

### 4.7 Messaging decision

```text
One worker per job, buffer spikes                        → SQS
Same event to several consumers                          → SNS → SQS fan-out, or EventBridge
Route by content, AWS/SaaS events, schedules, replay     → EventBridge
Ordered, replayable, high-volume stream, many readers    → Kinesis Data Streams (or MSK if Kafka ecosystem)
Just land streaming data in S3/OpenSearch/Redshift       → Data Firehose
Multi-step business workflow with retries/compensations  → Step Functions
Legacy JMS/AMQP                                          → Amazon MQ
```

---

## 5. Data services

### 5.1 RDS and Aurora (relational)

| | RDS (Postgres/MySQL/…) | Aurora (Postgres/MySQL compatible) |
|---|---|---|
| Storage | EBS per instance | Shared distributed storage: 6 copies across 3 AZs, auto-grows |
| HA | **Multi-AZ**: synchronous standby, automatic failover (~1–2 min); standby not readable (classic) or readable (Multi-AZ cluster) | Failover to a reader in ~30 s |
| Read scaling | Up to 15 read replicas (async) | Up to 15 low-lag readers; **reader endpoint** load-balances |
| Extras | — | Global Database (cross-region < 1 s lag), Serverless v2 (scales in ACUs), backtrack (MySQL), fast cloning |

Remember: **Multi-AZ = availability** (standby), **read replicas = read scaling** (async lag).

- Endpoints: Aurora **cluster (writer) endpoint**, **reader endpoint**, custom endpoints. Apps send writes to the writer, reads to the reader.
- **Automated backups + point-in-time recovery** (1–35 days), manual snapshots, cross-region copies.
- **RDS Proxy:** pools and shares DB connections for Lambda/many small clients, speeds failover, supports IAM auth.
- Parameter groups (DB config), Performance Insights (top SQL by wait), Enhanced Monitoring.

### 5.2 DynamoDB (key-value / document, serverless)

**Model:** table → items (≤ 400 KB) → attributes. Every item has a **partition key** (PK) and optional **sort key** (SK).

```text
PK                 SK                       attributes
USER#7             PROFILE                  name, email
USER#7             ORDER#2026-11-06#501     status=PAID, total=2598
USER#7             ORDER#2026-11-01#488     status=SHIPPED
ORDER#501          ITEM#42                  qty=2, price=1299
ORDER#501          ITEM#77                  qty=1, price=499
BOOK#42            META                     title, author, stock=12
```

This is **single-table design**: model by **access patterns**, not by entities.

| Access pattern | Operation |
|---|---|
| Get user profile | `GetItem PK=USER#7, SK=PROFILE` |
| User's orders, newest first | `Query PK=USER#7, SK begins_with ORDER#, ScanIndexForward=false` |
| Items of an order | `Query PK=ORDER#501, SK begins_with ITEM#` |
| Orders by status (admin) | **GSI**: GSI1PK=`STATUS#PAID`, GSI1SK=`2026-11-06#501` |

- **Query** (by key, efficient) vs **Scan** (reads the whole table — avoid in request paths).
- **GSI** (global secondary index): different PK/SK, eventually consistent, own capacity; add anytime. **LSI**: same PK, different SK, created with the table only, strongly consistent reads possible.
- **Capacity:** on-demand (pay per request, spiky) or provisioned + auto scaling (steady, cheaper). Throttling if a **hot partition** gets too much traffic — spread keys (add a suffix/shard).
- **Conditional writes** = optimistic locking and "no oversell":

```java
dynamo.updateItem(r -> r.tableName("booknest")
    .key(Map.of("PK", s("BOOK#42"), "SK", s("META")))
    .updateExpression("SET stock = stock - :q")
    .conditionExpression("stock >= :q")                       // fails atomically if not enough
    .expressionAttributeValues(Map.of(":q", n("2"))));
// ConditionalCheckFailedException → out of stock
```

- **Transactions** (`TransactWriteItems`, up to 100 items): all-or-nothing across items/tables — e.g., create order + decrement stock + write idempotency record.
- **TTL:** auto-delete items after a timestamp (sessions, idempotency keys, reservations).
- **DynamoDB Streams:** ordered change log per item (24 h) → Lambda/Pipes → outbox-style events, search sync, aggregates. Kinesis Data Streams integration for longer retention.
- **Global tables:** multi-region active-active replication (last-writer-wins).
- **DAX:** in-memory cache in front of DynamoDB (microsecond reads).
- Read consistency: eventually consistent by default, strongly consistent on request (base table/LSI only).
- Backups: on-demand + PITR (35 days), export to S3 for analytics.

**Postgres vs DynamoDB:** Postgres when queries are varied/ad-hoc, relations and joins matter, moderate scale. DynamoDB when access patterns are known, scale/latency must be predictable at any size, and you want zero DB operations.

### 5.3 ElastiCache / MemoryDB

- **ElastiCache for Redis/Valkey or Memcached:** managed cache (guide 11). Cluster mode shards keys across nodes; replicas + Multi-AZ failover. Serverless option.
- **MemoryDB:** Redis-compatible **durable** primary database (multi-AZ transaction log).

### 5.4 OpenSearch Service

Managed OpenSearch domains (or serverless collections). Fed by Firehose, Lambda indexers, DynamoDB zero-ETL integration, or Logstash/Data Prepper. Fine-grained access control, UltraWarm/cold storage for old log data. (Guide 15.)

### 5.5 S3 in depth

- **Strong read-after-write consistency** for all operations (since 2020).
- Keys like `covers/2026/11/42.jpg`; performance scales per prefix (3,500 writes / 5,500 reads per second per prefix — spread prefixes for very high rates).
- **Storage classes:** Standard → Intelligent-Tiering (auto) → Standard-IA / One Zone-IA → Glacier Instant / Flexible / Deep Archive. **Lifecycle rules** transition and expire.
- **Versioning** (undo deletes/overwrites), **MFA delete**, **Object Lock** (WORM compliance), **replication** (same-region / cross-region, needs versioning).
- **Multipart upload** for large files (parallel parts, resume); presigned multipart from browsers.
- **Access:** Block Public Access (on), bucket policy (resource-based), IAM, access points, **CloudFront Origin Access Control** for private buckets served via CDN, presigned URLs (valet key).
- **Events:** S3 Event Notifications → Lambda / SQS / SNS (per bucket, prefix/suffix filters), or **send all events to EventBridge** for rich routing to many targets.
- **S3 Select / Athena** query data in place; **S3 Object Lambda** transforms on read.
- Encryption: SSE-S3 (default), SSE-KMS (audited keys), client-side.

### 5.6 Other storage

**EBS** (block disk for one EC2, per AZ, snapshots), **EFS** (shared NFS file system across instances/Lambda/ECS), **FSx** (Windows/Lustre/NetApp), **Backup** (central backup policies across services).

### 5.7 Analytics and data lake

```text
Sources (DB exports, Firehose, app logs, DynamoDB export)
   ▼
S3 data lake (raw → cleaned → curated, Parquet, partitioned by date)
   ▼ AWS Glue: crawlers discover schemas → Glue Data Catalog (tables); Glue ETL jobs (Spark) transform
   ▼ Lake Formation: fine-grained permissions on catalog tables
Query: Athena (serverless SQL on S3, pay per TB scanned) · Redshift (warehouse; Spectrum queries S3) · EMR (Spark/Hadoop)
Visualize: QuickSight
```

- Partition by date and store Parquet to cut Athena scan costs by 10–100×.
- **Zero-ETL integrations:** Aurora/DynamoDB → Redshift/OpenSearch without pipelines.
- **Timestream** for time-series, **Neptune** for graphs, **DocumentDB** for MongoDB-compatible documents, **Keyspaces** for Cassandra.

---

## 6. Observability on AWS

| Service | Use |
|---|---|
| **CloudWatch Logs** | Log groups per service (`/ecs/order-service`), retention policy (set it! default never expires), **Logs Insights** queries, metric filters, **subscription filters** → Lambda/Firehose/OpenSearch |
| **CloudWatch Metrics** | Namespaces + dimensions; AWS services publish automatically (SQS `ApproximateAgeOfOldestMessage`, Lambda `Errors`/`Throttles`/`IteratorAge`, ALB `TargetResponseTime`/`HTTPCode_Target_5XX_Count`) |
| **Embedded Metric Format (EMF)** | Write a JSON log line → CloudWatch extracts custom metrics (cheap from Lambda) |
| **Alarms** | Threshold/anomaly detection → SNS → PagerDuty/Slack; **composite alarms** reduce noise |
| **X-Ray / ADOT** | Distributed tracing; AWS Distro for OpenTelemetry collector exports to X-Ray or other backends |
| **Container Insights / Lambda Insights** | Resource metrics for ECS/EKS/Lambda |
| **Synthetics canaries** | Scripted checks of endpoints every minute |
| **RUM** | Real-user monitoring for the frontend |

Logs Insights example:

```text
fields @timestamp, level, orderId, durationMs
| filter service = "order-service" and level = "ERROR"
| stats count() by bin(5m)
```

Key alarms per integration: SQS **age of oldest message** and DLQ `ApproximateNumberOfMessagesVisible > 0`; Lambda **Errors, Throttles, IteratorAge** (streams); Kinesis `WriteProvisionedThroughputExceeded`; DynamoDB `ThrottledRequests`; RDS CPU, `FreeableMemory`, `DatabaseConnections`, replica lag; ALB 5xx and p99 latency; API Gateway 4xx/5xx/latency.

---

## 7. Delivery: CI/CD and infrastructure as code

### 7.1 Pipeline services

```text
CodeCommit/GitHub ─► CodePipeline (stages) ─► CodeBuild (buildspec.yml: test, build image, push ECR)
                                          ─► CodeDeploy (ECS blue/green with ALB traffic shift; Lambda alias canary 10% for 5 min)
                                          ─► CloudFormation deploy actions
```

ECR: private image registry, scan on push (Inspector), lifecycle policies to expire old images, cross-account pull via repository policy.

Lambda safe deploy: publish version → `prod` alias shifts `Canary10Percent5Minutes` via CodeDeploy → CloudWatch alarm fires → automatic rollback.

**AppConfig:** feature flags and dynamic config with validated, gradual rollouts and automatic rollback on alarms.

### 7.2 IaC choices

| Tool | Notes |
|---|---|
| **CloudFormation** | AWS native YAML/JSON; stacks, change sets, drift detection, StackSets for multi-account |
| **CDK** | Write infra in TypeScript/Java/Python → synthesizes CloudFormation; `grant*` methods write IAM for you |
| **SAM** | CloudFormation shorthand for serverless + local testing (`sam local invoke`) |
| **Terraform** | Multi-cloud, huge provider ecosystem; state file in S3 + lock table |

CDK wiring the "order events" pipeline — note how permissions and triggers are generated:

```ts
const dlq = new sqs.Queue(this, 'OrderEventsDlq', { retentionPeriod: Duration.days(14) });
const queue = new sqs.Queue(this, 'OrderEvents', {
  visibilityTimeout: Duration.seconds(180),
  deadLetterQueue: { queue: dlq, maxReceiveCount: 5 },
});

const topic = new sns.Topic(this, 'OrderTopic');
topic.addSubscription(new subs.SqsSubscription(queue, {
  rawMessageDelivery: true,
  filterPolicy: { type: sns.SubscriptionFilter.stringFilter({ allowlist: ['OrderPlaced'] }) },
}));                                                    // also writes the SQS queue policy for SNS

const table = new dynamodb.TableV2(this, 'Processed', {
  partitionKey: { name: 'messageId', type: dynamodb.AttributeType.STRING },
  timeToLiveAttribute: 'expiresAt',
});

const fn = new lambda.Function(this, 'WarehouseConsumer', {
  runtime: lambda.Runtime.JAVA_21,
  handler: 'com.booknest.WarehouseHandler',
  code: lambda.Code.fromAsset('build/warehouse.jar'),
  memorySize: 1024,
  timeout: Duration.seconds(30),
  snapStart: lambda.SnapStartConf.ON_PUBLISHED_VERSIONS,
  environment: { PROCESSED_TABLE: table.tableName },
});
table.grantReadWriteData(fn);                           // IAM policy scoped to this table
fn.addEventSource(new sources.SqsEventSource(queue, {
  batchSize: 10,
  reportBatchItemFailures: true,
  maxConcurrency: 20,                                   // protect downstream
}));                                                    // grants sqs:ReceiveMessage/DeleteMessage to the function role

new cloudwatch.Alarm(this, 'DlqNotEmpty', {
  metric: dlq.metricApproximateNumberOfMessagesVisible(),
  threshold: 1, evaluationPeriods: 1,
});
```

---

## 8. Other services you should be able to name

| Service | What |
|---|---|
| **SES** | Send (and receive) email; verify domains (SPF/DKIM/DMARC), handle bounces/complaints via SNS/EventBridge |
| **SNS SMS / mobile push**, **End User Messaging** | SMS and push notifications |
| **IoT Core** | Devices connect over **MQTT** with X.509 certificates; topics; **rules engine** routes messages (SQL-like) to Kinesis, Lambda, S3, DynamoDB, Timestream; **device shadows** store desired/reported state; jobs for OTA updates |
| **IoT Greengrass** | Run Lambda/containers on edge devices |
| **Transfer Family** | Managed SFTP/FTPS into S3 (partner file drops) |
| **DataSync / Snow family** | Bulk data migration |
| **DMS** | Database migration and continuous replication (CDC) between databases |
| **Rekognition, Textract, Transcribe, Comprehend** | Managed ML for images/video, documents, speech, text |
| **Bedrock / SageMaker** | Generative AI models via API / build-train-host ML models |
| **Location Service** | Maps, geocoding, geofencing |
| **Cost Explorer, Budgets, Compute Optimizer** | Cost visibility and right-sizing |

---

## 9. Connection map: "how does X talk to Y?"

| From → To | Mechanism | Permission lives on |
|---|---|---|
| Browser → CloudFront → S3 | HTTPS; CloudFront signs origin requests with **OAC** | **Bucket policy** allows the CloudFront distribution |
| Browser → S3 upload | **Presigned URL** generated by backend | Backend role's `s3:PutObject` (URL inherits it) |
| Browser → API Gateway | HTTPS + JWT | JWT/Cognito authorizer config |
| API Gateway → Lambda | Sync invoke | **Lambda resource policy** (`apigateway.amazonaws.com`, SourceArn) |
| API Gateway → private ECS | **VPC Link** → internal ALB/NLB | Security groups |
| ALB → ECS tasks | Target group (IP targets) + health checks | SG: tasks allow ALB SG |
| ECS task → RDS | TCP 5432 inside VPC | SG: DB allows task SG; DB credentials from Secrets Manager (task execution role reads it) |
| ECS task → S3/SQS/DynamoDB | SDK HTTPS calls (via gateway/interface endpoint or NAT) | **Task role** policy |
| Lambda → RDS | Lambda in VPC subnets → **RDS Proxy** → DB | SG + IAM DB auth or secret |
| S3 → Lambda | Async event notification | **Lambda resource policy** for `s3.amazonaws.com` |
| S3 → SQS / SNS | Event notification | **Queue/topic policy** for `s3.amazonaws.com` |
| S3 → EventBridge → many | Bucket setting "send to EventBridge" + rules | Rules' targets (resource policies / role) |
| SNS → SQS | Push subscription | **SQS queue policy** for `sns.amazonaws.com` |
| SNS → Lambda | Async invoke | Lambda resource policy |
| EventBridge → Lambda/SQS/SNS | Async target | Target resource policy |
| EventBridge → Step Functions/Kinesis/ECS | Async target | **IAM role EventBridge assumes** |
| SQS → Lambda | **Event source mapping** (poll) | **Lambda execution role** (`sqs:ReceiveMessage`, `DeleteMessage`, `GetQueueAttributes`) |
| Kinesis / DynamoDB Streams → Lambda | Event source mapping (poll, per shard, ordered) | Lambda execution role (read stream) |
| Step Functions → Lambda/DynamoDB/ECS/… | Task states (sync, `.sync`, callback) | **State machine role** |
| Lambda → Lambda | Prefer queue/EventBridge/Step Functions; direct `Invoke` if needed | Caller role `lambda:InvokeFunction` |
| Service A (ECS) → Service B (ECS) | Service Connect / Cloud Map DNS, internal ALB, or VPC Lattice; or async via SQS/SNS/EventBridge | SGs (+ auth tokens / SigV4 / Lattice auth policies) |
| Account A → resource in account B | Resource policy naming account A, **or** A assumes a role in B (trust policy) | Both sides |
| VPC A ↔ VPC B | Peering / Transit Gateway / PrivateLink | Route tables + SGs (+ endpoint service acceptance) |
| On-prem ↔ AWS | Site-to-Site VPN / Direct Connect (+ TGW) | Routes + SGs/NACLs |
| IoT device → AWS | MQTT over TLS to IoT Core, **rules engine** → Kinesis/Lambda/S3 | Device certificate + IoT policy; rule's IAM role |
| GitHub Actions → AWS | OIDC → `AssumeRoleWithWebIdentity` | Deploy role trust policy |
| App → Secrets Manager / KMS | SDK calls (interface endpoints) | Role policy + **KMS key policy** |
| Logs → OpenSearch/S3 | CloudWatch subscription filter → Firehose → destination | Firehose role |

---

## 10. End-to-end BookNest flows on AWS

### 10.1 A user loads a book page and places an order (synchronous path)

```text
1  Browser resolves booknest.com            → Route 53 alias → CloudFront
2  GET / (Angular app)                       → CloudFront cache → (miss) S3 bucket via OAC
3  Login                                     → Cognito hosted UI, auth code + PKCE → tokens in the SPA
4  GET /api/books/42                         → CloudFront (behavior /api/* → no cache or short TTL) → WAF
                                             → ALB (TLS cert from ACM, public subnets in 2 AZs)
                                             → target group → catalog-service task (ECS Fargate, private subnet)
                                             → ElastiCache Redis (hit) or Aurora reader endpoint (miss)
5  POST /api/orders (Idempotency-Key)        → ALB → order-service task
                                             → validates JWT against Cognito JWKS (cached)
                                             → Aurora writer: conditional stock update + order + outbox row (one transaction)
                                             → 202 Accepted { orderId }
6  Every hop logs JSON to CloudWatch Logs; ADOT sidecar sends traces to X-Ray; ALB/ECS/RDS metrics → alarms
```

### 10.2 After the order (asynchronous path)

```text
outbox relay (in order-service) or Aurora → (DMS/Debezium on MSK)  ─► SNS topic "order-events"
   ├─► SQS payment-queue    ─► payment-service (ECS workers) → payment provider API via NAT (idempotency key)
   │                            → publishes PaymentSucceeded / PaymentFailed to SNS/EventBridge
   ├─► SQS email-queue      ─► Lambda (ESM, batch 10, partial failures) → SES
   ├─► SQS analytics-queue  ─► Lambda → Firehose → S3 (Parquet) → Athena / QuickSight
   └─► EventBridge rule "big orders > ₹1,00,000" → Step Functions fraud-review workflow (task token waits for a human)
EventBridge Scheduler one-time schedule at order time + 15 min → Lambda "cancel if still PENDING"
Each queue has a DLQ + alarm; each consumer stores processed message IDs (DynamoDB with TTL)
```

### 10.3 Cover image upload pipeline (pipes and filters + valet key)

```text
1  Admin UI → POST /api/books/42/cover-upload-url → backend returns presigned PUT URL (5 min, content-type fixed)
2  Browser PUTs the file directly to s3://booknest-uploads/raw/42.jpg  (servers never carry bytes)
3  S3 event → SQS cover-queue (buffer + retries) → Lambda:
      validate type/size → scan → resize (3 sizes) → write s3://booknest-covers/42/{s,m,l}.webp
4  Lambda emits CoverReady to EventBridge → catalog-service updates the book row; CloudFront path invalidated
5  Lifecycle rule deletes raw/ objects after 7 days
```

### 10.4 Device or high-volume telemetry ingestion (generic IoT pattern)

```text
Devices (MQTT, X.509 certs) ─► IoT Core ─► rules engine
                                   ├─► Kinesis Data Streams (partition key = deviceId → ordered per device)
                                   │      ├─► Lambda / Flink: real-time alerts → SNS/EventBridge
                                   │      └─► Firehose → S3 (Parquet, partitioned by date/hour) → Glue Catalog → Athena
                                   └─► DynamoDB: latest state per device (or device shadow)
Large binary uploads (videos/images): device asks API for a presigned URL → S3 → S3 event → processing queue
```

### 10.5 Nightly sales report (scheduled batch)

```text
EventBridge Scheduler (cron 02:00 IST) → Step Functions:
   Athena StartQueryExecution (.sync) over S3 data lake → result CSV in S3
   → Lambda builds the PDF → SES emails a presigned link to finance
   Retry + Catch per step → failure notifies SNS on-call topic
```

### 10.6 Deploy flow

```text
git push main → GitHub Actions (OIDC role) → tests → docker build → push ECR (tag = git SHA)
→ CDK/Terraform apply (infra changes) → ECS service update (rolling with deployment circuit breaker)
   or CodeDeploy blue/green (10% canary for 5 min, ALB alarms → auto rollback)
→ run DB migration as a one-off ECS task before shifting traffic
```

---

## 11. Multi-account, multi-region shapes

- **Hub-and-spoke network:** networking account owns Transit Gateway + egress VPC (central NAT/firewall); workload VPCs attach to it.
- **Central observability:** CloudWatch cross-account observability or log shipping to a log-archive/security account.
- **Cross-account events:** a central EventBridge bus receives events from all workload accounts (bus resource policy allows the org ID).
- **Multi-region:** Route 53 latency/failover routing, Aurora Global Database or DynamoDB global tables, S3 cross-region replication, regional stacks deployed identically by IaC.

---

## 12. Cost gotchas (interviewers like these)

| Gotcha | Fix |
|---|---|
| NAT gateway data processing for S3/DynamoDB traffic | Gateway endpoints |
| CloudWatch Logs with no retention | Set retention per log group; debug logs off |
| Cross-AZ data transfer between chatty services | Keep chatty paths AZ-local, cache |
| DynamoDB Scans | Query with keys/GSIs |
| Athena scanning raw JSON | Parquet + partitions |
| Idle provisioned capacity | Autoscaling, Serverless v2, on-demand |
| Lambda over-provisioned memory (or too little → slower and pricier) | Power-tune |
| Forgotten dev resources | Budgets, tags, scheduled shutdown |

---

## 13. Quick interview Q&A

1. **SQS vs SNS vs EventBridge vs Kinesis?** Queue for work; fan-out pub/sub; content-based routing bus with AWS/SaaS sources and replay; ordered replayable stream.
2. **How does SQS → Lambda handle failures?** Message reappears after the visibility timeout; after `maxReceiveCount` it goes to the DLQ; partial batch responses retry only failed messages.
3. **Why might a Kinesis Lambda consumer stop progressing?** A failing record blocks the shard; use bisect-on-error, max retries/record age and an on-failure destination; watch IteratorAge.
4. **Lambda async vs sync retries?** Sync: none, caller handles. Async: 2 retries then destination/DLQ.
5. **Multi-AZ vs read replica?** Availability with synchronous standby vs read scaling with async lag.
6. **How do you avoid exhausting DB connections from Lambda?** RDS Proxy, reserved concurrency cap, reuse connections outside the handler.
7. **How do private ECS tasks reach S3 without internet?** Gateway VPC endpoint.
8. **Task role vs execution role?** App permissions vs ECS agent permissions (pull image, logs, secrets).
9. **How does S3 get permission to trigger Lambda?** Lambda resource policy for `s3.amazonaws.com` with SourceArn.
10. **How would you design DynamoDB for "user's orders newest first"?** PK `USER#id`, SK `ORDER#<date>#<id>`, Query descending.
11. **How do you prevent overselling in DynamoDB?** Conditional update `stock >= :q`, or a transaction with the order write.
12. **Step Functions Standard vs Express?** Long-running, exactly-once, auditable vs short, high-volume, at-least-once.
13. **How do you give a browser upload access without exposing credentials?** Presigned URL (or Cognito identity pool with scoped role).
14. **How do you connect 30 VPCs across accounts?** Transit Gateway (hub-and-spoke); PrivateLink if you only expose specific services.
15. **How do you make a private S3 bucket serve a website?** CloudFront with Origin Access Control + bucket policy allowing only that distribution.
16. **API Gateway REST vs HTTP API?** HTTP API cheaper/faster with JWT authorizers; REST for usage plans, caching, request validation, transformations, private APIs.
17. **How does CI deploy to AWS without stored keys?** OIDC federation to an IAM role with a trust policy scoped to the repo/branch.
18. **Where do you store DB passwords and how do apps get them?** Secrets Manager with rotation; ECS secrets injection or SDK/extension with caching.
19. **What would you alarm on for a queue-based worker?** Age of oldest message, DLQ depth, consumer errors/throttles, processing latency.
20. **How do you review an AWS architecture?** Walk the Well-Architected pillars: operations, security, reliability, performance, cost, sustainability.

---

## Spoken answer (60s): "Walk me through how your system runs on AWS"

> Users hit Route 53 and CloudFront; static assets come from a private S3 bucket through Origin Access Control and API calls pass WAF to an ALB with an ACM certificate. Services run as ECS Fargate tasks in private subnets across two AZs; security groups only allow the ALB to reach tasks and tasks to reach Aurora and Redis. Tasks get AWS access through task roles, secrets from Secrets Manager, and reach S3 and DynamoDB through gateway endpoints. Writes go to the Aurora writer with an outbox; events fan out through SNS to per-consumer SQS queues or through EventBridge rules, consumed by ECS workers or Lambdas through event source mappings with DLQs and idempotent handlers. Long workflows with compensations are Step Functions, schedules are EventBridge Scheduler, uploads use presigned URLs with S3 events into a processing queue, and analytics flow through Firehose into S3 for Athena. Everything is in CDK or Terraform, deployed by a pipeline that assumes a role through OIDC, with CloudWatch, X-Ray and alarms on errors, latency, queue age and DLQs.
