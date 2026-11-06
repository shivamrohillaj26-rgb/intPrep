# 14 — gRPC and Protobuf

**Goal:** let BookNest's order service call the catalog service with a fast, typed contract.

---

## 1. Plain words

- **Protobuf (Protocol Buffers):** a way to describe data in a `.proto` file and encode it as compact binary. Like JSON, but with a schema and much smaller/faster.
- **gRPC:** a remote-procedure-call framework. You define service methods in `.proto`; tools generate client and server code. Calls go over **HTTP/2**.

Calling a gRPC method feels like calling a local method: `catalog.getBook(request)`.

---

## 2. A `.proto` file

```protobuf
syntax = "proto3";

package booknest.catalog.v1;

option java_multiple_files = true;
option java_package = "com.booknest.catalog.v1";

service CatalogService {
  rpc GetBook (GetBookRequest) returns (Book);                       // unary
  rpc ListBooks (ListBooksRequest) returns (ListBooksResponse);       // unary with paging
  rpc WatchStock (WatchStockRequest) returns (stream StockUpdate);    // server streaming
  rpc ImportBooks (stream Book) returns (ImportSummary);              // client streaming
  rpc Chat (stream ChatMessage) returns (stream ChatMessage);         // bidirectional
}

message GetBookRequest {
  int64 id = 1;
}

message Book {
  int64 id = 1;
  string title = 2;
  string author = 3;
  int32 price_cents = 4;
  repeated string tags = 5;          // list
  optional string subtitle = 6;      // presence tracking
  Format format = 7;
  google.protobuf.Timestamp published_at = 8;
  reserved 9;                        // was "isbn10", never reuse
  reserved "isbn10";
}

enum Format {
  FORMAT_UNSPECIFIED = 0;            // 0 must exist and mean "unknown"
  FORMAT_PAPERBACK = 1;
  FORMAT_EBOOK = 2;
}

message ListBooksRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message ListBooksResponse {
  repeated Book books = 1;
  string next_page_token = 2;
}
```

(`google.protobuf.Timestamp` needs `import "google/protobuf/timestamp.proto";` at the top.)

**The numbers are the wire identity, not the names.** Field `title = 2` is sent as "field 2". That is why you must never change or reuse a number.

---

## 3. Schema evolution rules

| Change | Safe? |
|---|---|
| Add a new field with a new number | ✅ old clients ignore it |
| Remove a field | ✅ if you `reserved` its number and name |
| Rename a field | ✅ on the wire (binary), ❌ breaks JSON mapping and code |
| Change a field's type | ❌ |
| Reuse an old number | ❌ silent data corruption |
| Add an enum value | ✅, old code sees it as unknown |

In proto3, missing scalars read as default (0, "", false). Use `optional` or wrapper types when you must know "not set" vs "zero".

---

## 4. Generating code

Maven:

```xml
<plugin>
  <groupId>org.xolstice.maven.plugins</groupId>
  <artifactId>protobuf-maven-plugin</artifactId>
  <configuration>
    <protocArtifact>com.google.protobuf:protoc:${protobuf.version}:exe:${os.detected.classifier}</protocArtifact>
    <pluginId>grpc-java</pluginId>
    <pluginArtifact>io.grpc:protoc-gen-grpc-java:${grpc.version}:exe:${os.detected.classifier}</pluginArtifact>
  </configuration>
  <executions><execution><goals><goal>compile</goal><goal>compile-custom</goal></goals></execution></executions>
</plugin>
```

Quarkus: add `quarkus-grpc`, put `.proto` in `src/main/proto`, generation is automatic. **Buf** (`buf generate`, `buf lint`, `buf breaking`) is the modern tool to lint protos and detect breaking changes in CI.

Teams often keep protos in a **shared contracts repo/module** that every service depends on.

---

## 5. Server (grpc-java)

```java
public class CatalogGrpcService extends CatalogServiceGrpc.CatalogServiceImplBase {
    private final BookRepository repo;

    @Override
    public void getBook(GetBookRequest req, StreamObserver<Book> out) {
        repo.findById(req.getId()).ifPresentOrElse(
            b -> { out.onNext(toProto(b)); out.onCompleted(); },
            () -> out.onError(Status.NOT_FOUND
                    .withDescription("book " + req.getId() + " not found")
                    .asRuntimeException()));
    }

    private Book toProto(BookEntity b) {
        return Book.newBuilder()
            .setId(b.getId()).setTitle(b.getTitle()).setAuthor(b.getAuthor())
            .setPriceCents(b.getPriceCents())
            .build();                                // protobuf messages are immutable
    }
}
```

Quarkus version:

```java
@GrpcService
public class CatalogGrpcService implements CatalogService {          // Mutiny-based interface
    @Inject BookRepository repo;

    @Override
    @Blocking                                                          // JDBC call → worker thread
    public Uni<Book> getBook(GetBookRequest req) {
        return Uni.createFrom().item(() -> toProto(repo.findByIdOptional(req.getId())
            .orElseThrow(() -> Status.NOT_FOUND.asRuntimeException())));
    }
}
```

## 6. Client

```java
ManagedChannel channel = ManagedChannelBuilder.forAddress("catalog-service", 9090)
    .usePlaintext()                       // inside a mesh with mTLS; otherwise use TLS
    .build();                             // create ONCE, reuse (it pools HTTP/2 connections)

CatalogServiceGrpc.CatalogServiceBlockingStub catalog =
    CatalogServiceGrpc.newBlockingStub(channel);

Book book = catalog
    .withDeadlineAfter(500, TimeUnit.MILLISECONDS)          // ALWAYS set a deadline
    .getBook(GetBookRequest.newBuilder().setId(42).build());
```

Quarkus: `@GrpcClient("catalog") CatalogService catalog;` and config `quarkus.grpc.clients.catalog.host=...`.

---

## 7. Status codes, deadlines, metadata

gRPC has its own status codes (not HTTP codes):

| gRPC status | Like HTTP | Use |
|---|---|---|
| `OK` | 200 | Success |
| `INVALID_ARGUMENT` | 400 | Bad input |
| `UNAUTHENTICATED` | 401 | No / bad credentials |
| `PERMISSION_DENIED` | 403 | Not allowed |
| `NOT_FOUND` | 404 | Missing |
| `ALREADY_EXISTS` | 409 | Duplicate |
| `FAILED_PRECONDITION` | 409/412 | Wrong state |
| `RESOURCE_EXHAUSTED` | 429 | Rate limited / quota |
| `DEADLINE_EXCEEDED` | 504 | Took too long |
| `UNAVAILABLE` | 503 | Retry-able transient failure |
| `INTERNAL` | 500 | Bug |

- **Deadline:** the caller says "I'll wait 500 ms total." It **propagates** to downstream calls, so the whole chain gives up together instead of doing useless work.
- **Metadata:** headers. Auth tokens (`authorization: Bearer ...`), trace IDs. Added with **interceptors** (like servlet filters) on client and server.
- Rich errors: `google.rpc.Status` with details (`BadRequest` field violations).

---

## 8. Load balancing gotcha

HTTP/2 keeps **one long-lived connection** and multiplexes calls over it. A normal L4 load balancer balances *connections*, so all calls from one client may hit one server pod.

Fixes: client-side load balancing (`dns:///catalog-service` with `round_robin` policy), an L7 proxy that understands HTTP/2 (Envoy, a service mesh, ALB with gRPC support), or a headless Kubernetes service + client LB.

---

## 9. gRPC vs REST vs GraphQL

| | REST + JSON | gRPC + Protobuf | GraphQL |
|---|---|---|---|
| Contract | OpenAPI (optional) | `.proto` (required) | Schema (required) |
| Payload | Text JSON, readable | Binary, small, fast | JSON |
| Streaming | SSE / WebSocket separately | Built-in, 4 types | Subscriptions |
| Browser support | Native | Needs gRPC-Web + proxy | Native |
| Caching | HTTP caching works | No HTTP caching | Hard |
| Best for | Public APIs, browsers | Internal service-to-service, high volume, polyglot | Flexible client-driven reads (BFF) |

Typical setup: **REST at the edge** (browsers, partners), **gRPC inside** between services. A gateway can transcode gRPC ↔ JSON (grpc-gateway, Envoy).

---

## 10. Testing

- Unit: call the service implementation directly with a fake `StreamObserver`.
- In-process: `InProcessServerBuilder` + `InProcessChannelBuilder` — a real gRPC call without the network.
- `grpcurl` is the curl of gRPC: `grpcurl -plaintext -d '{"id":42}' localhost:9090 booknest.catalog.v1.CatalogService/GetBook` (needs server reflection enabled).

---

## Common mistakes

| Mistake | Fix |
|---|---|
| No deadline | `withDeadlineAfter` on every call |
| New channel per request | One channel per target, reused |
| Reusing field numbers | `reserved` removed numbers/names |
| Enum without `_UNSPECIFIED = 0` | Always add it |
| L4 load balancer with HTTP/2 | Client-side LB or L7 proxy |
| Exposing gRPC directly to browsers | REST/gRPC-Web at the edge |

---

## Spoken answer (35s)

> gRPC defines services and messages in a proto file, generates typed clients and servers, and sends compact Protobuf over HTTP/2 with unary and streaming calls. I use it for internal service-to-service traffic and keep REST at the edge for browsers. Field numbers are the wire contract, so I only add fields, reserve removed ones and run buf breaking in CI. Every call has a deadline that propagates downstream, I map errors to proper gRPC status codes, I reuse channels, and I handle HTTP/2 load balancing with client-side round robin or an L7 proxy.
