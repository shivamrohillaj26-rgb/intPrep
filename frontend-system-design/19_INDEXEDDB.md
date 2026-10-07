# IndexedDB — Interview Ready Guide

Browser **NoSQL** storage for larger structured data (offline drafts, caches, queues). Async, origin-scoped, much bigger than `localStorage`.

---

## 1. One-liner

> IndexedDB is a client-side key–value / object-store database in the browser. I use it when I need megabytes of structured data, indexes, or offline persistence — not for tiny flags (use `localStorage`) and not for secrets (still XSS-readable).

---

## 2. When to use it

| Use IndexedDB | Prefer something else |
|---|---|
| Offline draft forms / outbox of failed API posts | Tiny theme flag → `localStorage` |
| Cache large API lists / media metadata | Auth tokens → HttpOnly cookie / memory ([auth guide](./10_FRONTEND_AUTH_SECURITY.md)) |
| Searchable local records (indexes) | Sync server state of truth → network + optional IDB cache |
| Service Worker caching of structured JSON | Static assets → Cache API |

Typical FE stories: offline-first PWA, “save draft while offline”, resume upload queue, large filter option cache.

---

## 3. Mental model

```text
Origin (https://app.example.com)
  └── Database ("idms-drafts")
        └── Object store ("drafts")     ← like a table
              keyPath: "id"
              indexes: ["updatedAt"]
              records: { id, payload, updatedAt }
```

| Term | Meaning |
|---|---|
| **Database** | Named DB per origin |
| **Object store** | Collection of objects |
| **Key** | Primary key (`keyPath` or out-of-line) |
| **Index** | Secondary lookup (e.g. by `updatedAt`) |
| **Transaction** | Atomic read/write batch (`readonly` / `readwrite`) |

API is **callback-based** natively → wrap in Promises (or use `idb` library).

---

## 4. Short usage example (Promise wrapper)

```js
const DB_NAME = 'demo-db';
const STORE = 'notes';
const VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putNote(db, note) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(note); // upsert by id
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getNote(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result); // undefined if missing
    req.onerror = () => reject(req.error);
  });
}

// usage
const db = await openDb();
await putNote(db, { id: 'n1', text: 'Offline draft', updatedAt: Date.now() });
const note = await getNote(db, 'n1');
console.log(note);
```

Flow:

```text
open (create store on upgrade)
  → transaction(readwrite)
  → store.put({ id, ... })
  → later store.get(id)
```

---

## 5. IndexedDB vs `localStorage` vs Cache API

| | `localStorage` | **IndexedDB** | Cache API (SW) |
|---|---|---|---|
| API | Sync string key/value | Async objects | Request/Response |
| Size | ~5MB | Much larger (browser-dependent, 100s MB+) | Large |
| Query | By key only | Keys + **indexes** | By URL |
| Blocks UI? | Sync get/set can jank | Async — better for big data | Async |
| Best for | Tiny prefs | App data / offline drafts | HTTP asset/response cache |

---

## 6. Angular usage sketch

```ts
@Injectable({ providedIn: 'root' })
export class NotesDb {
  private dbPromise = openDb(); // same helpers as above

  async save(note: { id: string; text: string }) {
    const db = await this.dbPromise;
    await putNote(db, { ...note, updatedAt: Date.now() });
  }

  async load(id: string) {
    const db = await this.dbPromise;
    return getNote(db, id);
  }
}
```

Or use the small **`idb`** npm helper (Promise API). Don’t put secrets/tokens in IDB — XSS can still read it.

With Service Worker: SW often uses **Cache API** for network responses; page JS uses **IndexedDB** for domain objects. See [06_SERVICE_WORKERS.md](./06_SERVICE_WORKERS.md).

---

## 7. Gotchas (interview gold)

1. **Version + `onupgradeneeded`** — schema changes bump `VERSION`; only create/migrate stores there  
2. **Transactions auto-commit** — do work inside the tx; don’t `await` unrelated stuff mid-tx or it may close  
3. **Same-origin only** — no cross-site IDB  
4. **Not encrypted by default** — sensitive data still risky on shared devices  
5. **Private / storage eviction** — browsers can clear under pressure; don’t treat as durable forever  
6. Prefer libraries (`idb`) in production to avoid callback bugs  

---

## 8. Spoken answers

### 20s

> IndexedDB is the browser’s async object database for larger structured data — offline drafts, local caches, queues. Unlike localStorage it’s not sync strings; I open a DB, use object stores and transactions, and often wrap it in Promises.

### 45s

> I’d use IndexedDB when localStorage’s size and sync API aren’t enough. Open with a version, create object stores in onupgradeneeded, then readwrite transactions to put/get by key. For Angular I’d wrap that in a small service. Auth tokens still don’t go there — XSS can read IDB. For HTTP caching I’d use the Cache API via a service worker; IDB is for app-shaped records.

---

## 9. Q&A

**Q: Is IndexedDB a SQL database?**  
A: No — object stores + keys/indexes (NoSQL-ish). No joins like SQL.

**Q: Sync or async?**  
A: Async (events / Promises). That’s a big win vs localStorage for large writes.

**Q: Can Service Worker use IndexedDB?**  
A: Yes — SW and page share origin storage; coordinate carefully.

**Q: Why not always IDB?**  
A: More complex than localStorage; overkill for a theme string.

---

## 10. Practice checklist

- [ ] One-liner + when vs localStorage  
- [ ] Sketch open → upgrade → put → get  
- [ ] Name transaction + object store  
- [ ] Say “not for secrets”  
- [ ] Mention Cache API vs IDB  

---

## Cheat card

```text
IndexedDB = async browser DB (objects, indexes, big)
open(name, version) → onupgradeneeded createObjectStore
transaction → put / get / delete
vs localStorage: bigger, async, structured
vs Cache API: app data vs HTTP responses
Security: still readable by JS on the page (XSS)
```
