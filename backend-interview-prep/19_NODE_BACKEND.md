# 19 — Node.js backend (for full-stack work)

**Goal:** build the BookNest API in Node + TypeScript, and know when Node is the right choice versus Java.

You already know JavaScript and the browser event loop (`javascript-interview-prep/`). This guide is what changes on the server.

---

## 1. How Node runs a server

```text
One main thread runs your JavaScript (the event loop)
   │  incoming request → your handler runs
   │  handler awaits a DB query → Node hands the I/O to the OS / libuv thread pool
   │  main thread is FREE to handle other requests meanwhile
   │  query finishes → callback queued → handler continues
```

- Great at **many concurrent I/O-bound requests** with little memory (no thread per request).
- Terrible if you **block the main thread**: a 2-second CPU loop (big JSON parse, image resize, bcrypt with sync API, a heavy regex) freezes **every** user.

### Event loop phases (server side)

```text
timers (setTimeout) → pending callbacks → poll (I/O) → check (setImmediate) → close callbacks
between each callback: process.nextTick queue, then Promise microtasks
```

`process.nextTick` runs before promises; overusing it can starve I/O.

### CPU-heavy work

- `worker_threads` for CPU tasks (or a separate worker service / queue).
- Use async versions (`bcrypt.hash` not `hashSync`, `fs.promises` not `readFileSync` in handlers).
- Run several processes to use all cores: one container per core, or the `cluster` module / PM2.

---

## 2. A typed Express API

```ts
// src/app.ts
import express from 'express';
import { z } from 'zod';
import { pool } from './db';

export const app = express();
app.use(express.json({ limit: '100kb' }));

const CreateBook = z.object({
  title: z.string().min(1).max(200),
  author: z.string().min(1),
  priceCents: z.number().int().positive(),
});

app.post('/v1/books', async (req, res, next) => {
  try {
    const input = CreateBook.parse(req.body);                 // throws ZodError on bad input
    const { rows } = await pool.query(
      'INSERT INTO books (title, author, price_cents) VALUES ($1, $2, $3) RETURNING id, title, author, price_cents',
      [input.title, input.author, input.priceCents],          // parameters → no SQL injection
    );
    res.status(201).location(`/v1/books/${rows[0].id}`).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.get('/v1/books/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ title: 'invalid id' });
    const { rows } = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ title: 'book not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// error middleware: 4 arguments
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ title: 'validation failed', errors: err.issues });
  }
  console.error(err);
  res.status(500).json({ title: 'internal error' });
});
```

```ts
// src/db.ts
import { Pool } from 'pg';
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
```

```ts
// src/server.ts
import { app } from './app';
import { pool } from './db';

const server = app.listen(Number(process.env.PORT ?? 3000));

process.on('SIGTERM', () => {
  server.close(async () => {          // stop accepting, finish in-flight requests
    await pool.end();
    process.exit(0);
  });
});
```

Express 5 forwards rejected promises from async handlers to the error middleware automatically; with Express 4 you need the `try/catch` + `next(err)` shown above (or a wrapper).

**Middleware** = functions in a chain `(req, res, next)`: logging, auth, CORS (`cors` package), security headers (`helmet`), rate limiting. Same idea as servlet filters.

---

## 3. NestJS (structured Node, feels like Spring/Angular)

```ts
@Controller('v1/books')
export class BooksController {
  constructor(private readonly books: BooksService) {}          // DI, like Spring/Angular

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.books.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateBookDto) {                          // validated with class-validator
    return this.books.create(dto);
  }
}

@Injectable()
export class BooksService {
  constructor(@InjectRepository(Book) private readonly repo: Repository<Book>) {}

  async get(id: number) {
    const book = await this.repo.findOneBy({ id });
    if (!book) throw new NotFoundException(`book ${id} not found`);
    return book;
  }
}

@Module({ imports: [TypeOrmModule.forFeature([Book])], controllers: [BooksController], providers: [BooksService] })
export class BooksModule {}
```

| Spring | NestJS |
|---|---|
| `@RestController` | `@Controller` |
| `@Service` | `@Injectable` |
| Filter / interceptor | Middleware / interceptor |
| Spring Security | Guards (`@UseGuards`) |
| Bean Validation | Pipes + class-validator |
| `@RestControllerAdvice` | Exception filters |

For an Angular developer, NestJS is the fastest way to be productive on the backend.

Fastify is a faster alternative to Express with built-in JSON-schema validation.

---

## 4. Data access in Node

| Tool | Style |
|---|---|
| `pg` / `mysql2` | Raw SQL with parameters |
| **Prisma** | Schema file → generated typed client; migrations included |
| Drizzle | SQL-like typed query builder |
| Knex | Query builder + migrations |
| TypeORM / MikroORM | Decorator-based ORMs (JPA-like) |

Transactions with `pg`:

```ts
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const { rowCount } = await client.query(
    'UPDATE books SET stock = stock - $1 WHERE id = $2 AND stock >= $1', [qty, bookId]);
  if (rowCount === 0) throw new Error('out of stock');
  await client.query('INSERT INTO orders (user_id, book_id, qty) VALUES ($1, $2, $3)', [userId, bookId, qty]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();          // forget this → pool leak → app hangs
}
```

All the database lessons (indexes, N+1, isolation, migrations) from guides 07–09 apply unchanged.

---

## 5. Production concerns specific to Node

- **Unhandled promise rejections** crash the process in modern Node. Always handle errors; log and exit on `uncaughtException` (state is unknown) and let the orchestrator restart.
- **Config:** env vars validated at startup (`zod` schema over `process.env`), fail fast if missing.
- **Logging:** `pino` (fast structured JSON) with a request ID; `AsyncLocalStorage` carries request context through async calls (Node's MDC).
- **Observability:** OpenTelemetry Node SDK auto-instruments http, pg, express, kafkajs.
- **Memory:** default heap is limited; set `--max-old-space-size` to fit the container. Leaks often come from module-level caches and listeners.
- **Security:** `helmet`, rate limits, body size limits, `npm audit` / Dependabot, lockfiles committed, avoid `eval` and prototype pollution (validate input, do not deep-merge user objects into config).
- **Streams** for big files: pipe S3 → response instead of loading into memory.

```ts
import { pipeline } from 'node:stream/promises';
await pipeline(fs.createReadStream(path), zlib.createGzip(), res);    // handles backpressure and errors
```

---

## 6. Monorepos with pnpm + Turborepo

```text
apps/
  web/            (Angular / React front end)
  api/            (NestJS / Express)
packages/
  shared-types/   (DTO types used by both!)
  eslint-config/
pnpm-workspace.yaml
turbo.json
```

- **pnpm workspaces:** one install, packages link to each other (`"@booknest/shared-types": "workspace:*"`), strict and disk-efficient.
- **Turborepo:** runs `build`/`test`/`lint` across packages in dependency order, **caches** results, and only rebuilds what changed (`turbo run build --filter=api...`).
- Big full-stack win: share types or Zod schemas between frontend and backend so API changes are type-checked on both sides (or generate a client from OpenAPI).

---

## 7. Real-time from Node

Node is a natural fit for WebSockets / Server-Sent Events (many idle connections, little CPU).

```ts
// Server-Sent Events: one-way server → browser updates
app.get('/v1/orders/:id/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (status: string) => res.write(`data: ${JSON.stringify({ status })}\n\n`);
  const unsubscribe = orderEvents.subscribe(req.params.id, send);
  req.on('close', unsubscribe);
});
```

With several instances, connected users are spread across servers → broadcast through Redis pub/sub (or a managed service). Details: `frontend-system-design/13_WEBSOCKETS_HOW_THEY_WORK.md`.

---

## 8. Node vs Java — when to pick which

| Pick Node when | Pick Java (Spring/Quarkus) when |
|---|---|
| I/O-heavy APIs, BFFs, real-time, glue | CPU-heavy work, complex domains, large teams |
| Same language as the front end, shared types | Strong typing + mature enterprise ecosystem |
| Fast prototyping, serverless with tiny cold starts | Heavy concurrency with virtual threads, long-running stream processors |
| Team is mostly JS/TS | Existing JVM platform, libraries (Kafka Streams, Hibernate) |

Many companies use both: Node/TS BFF for the web app, Java services behind it.

---

## Common mistakes

| Mistake | Fix |
|---|---|
| CPU work on the main thread | Worker threads / separate service |
| Sync APIs in handlers (`readFileSync`, `hashSync`) | Async versions |
| Unhandled promise rejections | `try/catch`, error middleware, process handlers |
| Not releasing pool clients | `finally { client.release() }` |
| No input validation | Zod / class-validator at the edge |
| String-built SQL | Parameters `$1, $2` |
| Loading big files into memory | Streams + `pipeline` |

---

## Spoken answer (35s)

> Node runs JavaScript on one event loop and pushes I/O to the OS, so it handles many concurrent I/O-bound requests cheaply, but any CPU-heavy synchronous work blocks every user — that goes to worker threads or a separate service. I build typed APIs with NestJS or Express plus Zod validation, parameterized SQL or Prisma, structured pino logs with AsyncLocalStorage for request context, OpenTelemetry, and graceful shutdown. In a pnpm and Turborepo monorepo I share types between the frontend and the API. I pick Node for BFFs, real-time and glue services, and Java for CPU-heavy work, complex domains and long-running stream processing.
