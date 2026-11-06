# Backend — from zero to senior (full course)

**Who this is for:** a frontend engineer moving to full stack or backend.  
**How it is written:** plain words first, a picture or analogy, then real code, then the mistakes people make, then a short spoken answer for interviews.

**One example app runs through every guide:** **BookNest**, a small online bookstore.  
Users sign up, browse books, place orders, pay, and get an email. That one app is enough to explain every backend idea.

**Stack used in examples:** Java 21, Spring Boot 3, Quarkus (where it differs), PostgreSQL, Redis, Kafka / AWS Kinesis, gRPC, OpenSearch, Docker, AWS. Node.js gets its own guide for full-stack work.

---

## Reading order

Read top to bottom the first time. Later, jump to the topic you need.

| # | Guide | You will be able to |
|---|---|---|
| 01 | [How a request travels](./01_HOW_A_REQUEST_TRAVELS.md) | Explain everything between "user clicks" and "JSON comes back" |
| 02 | [HTTP and REST API design](./02_HTTP_REST_API_DESIGN.md) | Design clean endpoints, status codes, errors, pagination, versioning |
| 03 | [Java for backend](./03_JAVA_FOR_BACKEND.md) | Write the Java a backend actually uses: classes, records, collections, streams, exceptions |
| 04 | [Java concurrency](./04_JAVA_CONCURRENCY.md) | Threads, thread pools, `CompletableFuture`, locks, virtual threads, race conditions |
| 05 | [Spring Boot](./05_SPRING_BOOT.md) | Build a real API: DI, controller → service → repository, config, validation, errors |
| 06 | [Quarkus](./06_QUARKUS.md) | Same API in Quarkus, and when to pick it over Spring |
| 07 | [Databases and SQL](./07_DATABASES_SQL.md) | Tables, keys, joins, indexes, `EXPLAIN`, transactions, isolation, locks |
| 08 | [JPA and Hibernate](./08_JPA_HIBERNATE.md) | Entities, relations, lazy loading, the N+1 problem, transactions in code |
| 09 | [Database migrations](./09_DATABASE_MIGRATIONS.md) | Change a live database safely with Flyway / Liquibase |
| 10 | [Auth and security](./10_AUTH_SECURITY.md) | Passwords, sessions, JWT, OAuth2, SSO (OIDC / SAML), roles, OWASP top issues |
| 11 | [Caching](./11_CACHING.md) | Caffeine (in-memory) and Redis, cache patterns, invalidation, stampede |
| 12 | [Messaging and streaming](./12_MESSAGING_STREAMING.md) | Queues vs streams, Kafka / Kinesis / SQS, retries, idempotency, DLQ, outbox |
| 13 | [Microservices and architecture](./13_MICROSERVICES_ARCHITECTURE.md) | Monolith vs services, DB per service, gateway, sagas, circuit breakers |
| 14 | [gRPC and Protobuf](./14_GRPC_PROTOBUF.md) | Write `.proto`, generate code, call services, compare with REST |
| 15 | [Search with OpenSearch](./15_SEARCH_OPENSEARCH.md) | Inverted index, mappings, full-text queries, keeping search in sync |
| 16 | [Testing the backend](./16_TESTING_BACKEND.md) | Unit, mocks, integration, Testcontainers, WireMock, contract, ArchUnit |
| 17 | [Observability](./17_OBSERVABILITY.md) | Logs, metrics, traces, correlation IDs, alerts, Sentry |
| 18 | [Docker, AWS and deployment](./18_DOCKER_AWS_DEPLOY.md) | Containers, S3, Lambda, SQS, RDS, config, secrets, CI/CD |
| 19 | [Node.js backend](./19_NODE_BACKEND.md) | Event loop on the server, Express / NestJS, TypeScript APIs |
| 20 | [Backend system design](./20_BACKEND_SYSTEM_DESIGN.md) | Scaling, replication, sharding, rate limits, consistency, a full walk-through |
| 21 | [Interview question bank](./21_INTERVIEW_QUESTION_BANK.md) | 100+ questions with short answers, grouped by topic |
| 22 | [Architecture patterns catalog](./22_ARCHITECTURE_PATTERNS_CATALOG.md) | Every architecture pattern (styles, integration, data, messaging, resilience, deployment, security) with problem → pattern map |
| 23 | [SOLID, design patterns, LLD](./23_DESIGN_PATTERNS_SOLID_LLD.md) | SOLID with before/after code, GoF patterns used in backends, low-level design round method |
| 24 | [AWS foundations: IAM, networking, KMS](./24_AWS_FOUNDATIONS_IAM_NETWORKING.md) | Accounts/Organizations, IAM roles and policy evaluation, VPC, endpoints, peering/TGW/PrivateLink, load balancers, DNS, KMS, security services |
| 25 | [AWS services and how they connect](./25_AWS_SERVICES_HOW_THEY_CONNECT.md) | ECS/Lambda/API Gateway/Cognito/SQS/SNS/EventBridge/Kinesis/Step Functions/RDS/DynamoDB/S3 and more, invocation and retry models, "X talks to Y" map, full end-to-end flows |

Guides 22–25 are reference guides. Read them after 13 and 18, and come back to them before system design rounds.

---

## The one picture to keep in your head

```text
Browser / mobile app
      │  HTTPS request
      ▼
Load balancer  ──►  API gateway (auth check, rate limit)
                        │
          ┌─────────────┼──────────────┐
          ▼             ▼              ▼
     Order service  Book service   User service       ← each is a small backend app
          │             │              │
          ▼             ▼              ▼
     Orders DB      Books DB +     Users DB           ← each service owns its data
                    Search index
          │
          └──► message stream (Kafka / Kinesis) ──► Email service, Analytics
                    "OrderPlaced" event
```

Every guide zooms into one box or one arrow of this picture.

---

## How to study

1. Read one guide. Type the code yourself, do not copy-paste.
2. Say the "spoken answer" at the end of the guide out loud.
3. Answer that topic's questions in guide 21 without looking.
4. After guides 05, 07, 10 and 12, build the matching piece of BookNest on your laptop.

Frontend links you already have: auth from the browser side is in `frontend-system-design/10_FRONTEND_AUTH_SECURITY.md`. WebSockets are in `frontend-system-design/13_WEBSOCKETS_HOW_THEY_WORK.md`.
