# 18 — Docker, AWS and deployment

**Goal:** take BookNest from "runs on my laptop" to "runs in the cloud, deploys many times a day, survives failures".

---

## 1. Build tools: Maven in 2 minutes

```text
pom.xml          ← project: groupId, artifactId, version, dependencies, plugins
src/main/java    ← code
src/main/resources
src/test/java
target/          ← build output (never commit)
```

Lifecycle: `validate → compile → test → package → verify → install → deploy`.

```bash
mvn clean verify            # compile, unit tests, package, integration tests
mvn -pl order-service -am package    # build one module and what it depends on
mvn dependency:tree         # who brought in which library version
```

- **Scopes:** `compile` (default), `test` (only tests), `provided` (the server supplies it, e.g. servlet API in a WAR), `runtime`.
- **BOM** (`<dependencyManagement>` import) pins versions for a family of libraries (Spring Boot BOM, Quarkus BOM).
- Multi-module projects: a parent `pom.xml` with `<modules>`.
- Gradle does the same with a Kotlin/Groovy build script; faster incremental builds.

### JAR vs WAR

| | Fat / executable JAR | WAR |
|---|---|---|
| Contains | App + embedded server (Tomcat/Netty) | App only |
| Runs with | `java -jar app.jar` | Deployed into an external Tomcat/JBoss |
| Era | Modern (Spring Boot, Quarkus) | Classic Java EE / legacy |

Migration from WAR on an app server to a container with a JAR is a very common modernization project.

---

## 2. Docker: plain words

- **Image:** a read-only package: OS libs + Java + your app. Built from a `Dockerfile`.
- **Container:** a running instance of an image. Isolated process, own filesystem view.
- **Registry:** where images are stored (Docker Hub, AWS ECR).
- Containers are not VMs: they share the host kernel, start in milliseconds/seconds.

### A good Dockerfile for a Spring Boot app

```dockerfile
# ---- build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -q dependency:go-offline           # cached layer: only reruns when pom.xml changes
COPY src ./src
RUN mvn -q package -DskipTests

# ---- run stage ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /src/target/order-service.jar app.jar
USER app                                    # never run as root
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
```

Why each part:

- **Multi-stage:** the final image has a JRE, not Maven and source code → smaller, fewer vulnerabilities.
- **Layer order:** dependencies before source so code changes do not re-download everything.
- **Non-root user:** limits damage if the app is compromised.
- **`MaxRAMPercentage`:** the JVM sizes its heap from the container's memory limit, leaving room for non-heap memory.
- **`exec`:** Java becomes PID 1 and receives `SIGTERM` for graceful shutdown.
- `.dockerignore` excludes `target/`, `.git`, `.env`.

Quarkus can produce a **native** binary (GraalVM) in a tiny image: starts in ~50 ms, low memory — good for Lambda / scale-to-zero (guide 06).

### Local stack with docker compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: booknest, POSTGRES_USER: app, POSTGRES_PASSWORD: localonly }
    ports: ["5432:5432"]
    healthcheck: { test: ["CMD", "pg_isready", "-U", "app"], interval: 5s }
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  order-service:
    build: ./order-service
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/booknest
      SPRING_DATA_REDIS_HOST: redis
    depends_on:
      postgres: { condition: service_healthy }
    ports: ["8080:8080"]
```

(Containers talk by **service name** — `postgres`, not `localhost`.)

---

## 3. Graceful shutdown (deploys without dropped requests)

```text
Orchestrator sends SIGTERM
→ readiness goes DOWN (load balancer stops new traffic)
→ app finishes in-flight requests (e.g. up to 20 s)
→ consumers stop polling, commit offsets
→ close DB pool → exit
→ after the grace period, SIGKILL
```

```yaml
server.shutdown: graceful
spring.lifecycle.timeout-per-shutdown-phase: 20s
```

---

## 4. Kubernetes in one screen

| Object | What it is |
|---|---|
| Pod | One or more containers running together (usually one app container) |
| Deployment | "Keep 3 pods of version X running", does rolling updates |
| Service | Stable name + load balancing to pods |
| Ingress | HTTP routing from outside into Services |
| ConfigMap / Secret | Config and secrets injected as env vars or files |
| HPA | Horizontal Pod Autoscaler (scale on CPU / custom metrics) |

```yaml
resources:
  requests: { cpu: "500m", memory: "768Mi" }   # what the scheduler reserves
  limits:   { memory: "768Mi" }                 # exceed → OOMKilled
livenessProbe:  { httpGet: { path: /actuator/health/liveness,  port: 8080 } }
readinessProbe: { httpGet: { path: /actuator/health/readiness, port: 8080 } }
```

On AWS: **EKS** (managed Kubernetes) or **ECS** (AWS's simpler container orchestrator; **Fargate** = no servers to manage).

---

## 5. AWS services a backend engineer actually uses

This is the short overview. Guide 24 covers IAM, VPC and KMS in depth. Guide 25 covers every service, how they trigger each other, and full end-to-end flows.

### Compute

| Service | What | Use for |
|---|---|---|
| EC2 | Virtual machines | Full control, legacy apps |
| ECS / Fargate | Run containers | Most services |
| EKS | Kubernetes | Big platforms, K8s skills in-house |
| **Lambda** | Run a function per event, pay per ms | Event handlers, glue, spiky low traffic |

### Lambda in detail

```java
public class ThumbnailHandler implements RequestHandler<S3Event, Void> {
    private static final S3Client s3 = S3Client.create();     // outside the handler: reused across warm invocations

    @Override
    public Void handleRequest(S3Event event, Context ctx) {
        for (var record : event.getRecords()) {
            String bucket = record.getS3().getBucket().getName();
            String key = record.getS3().getObject().getUrlDecodedKey();
            // download, resize, upload to thumbnails/
        }
        return null;
    }
}
```

- Triggers: API Gateway (HTTP), S3, SQS, Kinesis, DynamoDB streams, EventBridge schedules.
- **Cold start:** first call on a new instance loads the runtime + your app (Java: hundreds of ms to seconds). Mitigate with SnapStart, provisioned concurrency, smaller dependencies, or Quarkus native.
- Limits: 15 min max run, memory 128 MB–10 GB (CPU scales with memory), concurrency limits per account.
- Create SDK clients and DB pools **outside** the handler. Use **RDS Proxy** for databases, since thousands of Lambdas can exhaust Postgres connections.
- Must be idempotent: async triggers retry.

### Storage and data

| Service | What |
|---|---|
| **S3** | Object storage: files, images, videos, backups, data lake. 11 nines durability |
| RDS / Aurora | Managed Postgres/MySQL: backups, replicas, failover |
| DynamoDB | Managed key-value / document DB, massive scale, design by access pattern |
| ElastiCache | Managed Redis / Memcached |
| OpenSearch Service | Managed OpenSearch |

S3 essentials:

- Buckets + keys (`books/42/cover.jpg`), no real folders.
- **Presigned URLs:** the backend signs a short-lived URL; the browser uploads/downloads **directly** to S3. Your servers never carry the bytes.

```java
PresignedPutObjectRequest p = presigner.presignPutObject(r -> r
    .signatureDuration(Duration.ofMinutes(5))
    .putObjectRequest(o -> o.bucket("booknest-uploads").key("covers/42.jpg").contentType("image/jpeg")));
return p.url().toString();
```

- Block public access by default; serve public files through CloudFront.
- Storage classes + lifecycle rules (move to Glacier after 90 days, delete after N).
- S3 event notifications → SQS/Lambda for processing pipelines.

### Messaging

SQS (queue), SNS (pub/sub fan-out), Kinesis (stream), EventBridge (event bus with routing rules), MSK (managed Kafka). Details in guide 12.

### Networking and edge

- **VPC:** your private network. Public subnets (load balancers), private subnets (apps, DBs). DBs are never public.
- **Security groups:** per-resource firewalls ("DB accepts 5432 only from the app's security group").
- **ALB** (HTTP load balancer, path routing), **NLB** (TCP, very high performance).
- **Route 53** (DNS), **CloudFront** (CDN), **API Gateway** (managed API front door), **WAF** (block bad traffic).
- NAT gateway lets private subnets reach the internet (and costs money per GB — a classic surprise bill).

### Security and config

- **IAM:** who can do what. Apps get permissions through **roles** (task role, Lambda execution role), never long-lived access keys in code. Least privilege: `s3:GetObject` on one bucket, not `s3:*`.
- **Secrets Manager / SSM Parameter Store:** DB passwords, API keys, with rotation.
- **KMS:** encryption keys.
- **CloudWatch:** logs, metrics, alarms. **X-Ray:** tracing. **CloudTrail:** audit of every AWS API call.

---

## 6. Configuration: the 12-factor rules that matter

1. One codebase, many deploys (dev/stage/prod differ only in config).
2. **Config in the environment**, not in the code or image.
3. Backing services (DB, Redis, queues) are attached resources via URLs.
4. Build once, promote the **same image** dev → stage → prod.
5. Stateless processes: no local files or in-memory sessions that matter.
6. Logs to stdout; the platform collects them.
7. Fast start, graceful shutdown.

---

## 7. CI/CD pipeline

```text
PR opened
  → build + unit tests + lint + static analysis (SonarQube) + dependency/container scan
  → integration tests (Testcontainers) + contract tests
  → review + merge to main
main
  → build image once, tag with git SHA, push to ECR
  → deploy to staging (migrations job first) → smoke tests
  → deploy to production (progressively) → automatic rollback on alarms
```

Tools: GitHub Actions, GitLab CI, Jenkins, AWS CodePipeline, Argo CD (GitOps: the cluster follows a git repo).

**Infrastructure as Code:** Terraform, AWS CDK or CloudFormation. Infra changes are reviewed PRs, reproducible, and environments are consistent.

---

## 8. Deployment strategies

| Strategy | How | Pros / cons |
|---|---|---|
| Recreate | Stop old, start new | Simple; downtime |
| **Rolling** | Replace instances a few at a time | No downtime; old + new run together (needs compatible schema/APIs) |
| **Blue/green** | Full new environment, switch traffic at once | Instant rollback; double resources |
| **Canary** | 1% → 10% → 50% → 100%, watching metrics | Limits blast radius; needs good metrics |
| **Feature flags** | Deploy code dark, turn features on separately | Decouples deploy from release; flag debt to clean up |

Rollback must be fast and boring. Database migrations must be backward compatible so rolling back code is possible (guide 09).

---

## 9. High availability and disaster recovery

- Run across **multiple Availability Zones** (separate data centers in a region): ≥2 app instances, Multi-AZ RDS.
- Backups: automated snapshots + point-in-time recovery, and **test restores**.
- **RPO** = how much data you can lose (time since last backup/replica). **RTO** = how long until you are back up.
- Multi-region active-passive or active-active for the strictest needs — expensive and complex.

---

## 10. Cost awareness

Right-size instances, autoscale, use Graviton (ARM), Spot for batch work, S3 lifecycle rules, watch NAT/data-transfer costs, set budgets and alerts, tag resources by team/service.

---

## Common mistakes

| Mistake | Fix |
|---|---|
| Fat images with build tools | Multi-stage builds |
| Running as root | `USER app` |
| Config/secrets baked into the image | Env vars + Secrets Manager |
| Access keys in code | IAM roles |
| Public database | Private subnets + security groups |
| Rebuilding per environment | Build once, promote the same image |
| No graceful shutdown | SIGTERM handling + readiness drain |
| Lambda opening a new DB connection per call | Reuse outside the handler, RDS Proxy |

---

## Spoken answer (45s)

> I package services as executable JARs in multi-stage Docker images that run as non-root, with the JVM sized from the container limit and graceful shutdown on SIGTERM. Images are built once per commit, pushed to ECR, and promoted unchanged through environments, with config from the environment and secrets from Secrets Manager. Services run on ECS Fargate or EKS across multiple availability zones behind an ALB, in private subnets with IAM roles and least privilege. Files go to S3 through presigned URLs, and event glue runs on Lambda with clients reused outside the handler. The pipeline runs tests, scans and contract checks, applies migrations as a separate step, and deploys with rolling or canary releases plus automatic rollback on alarms. Infrastructure lives in Terraform or CDK.
