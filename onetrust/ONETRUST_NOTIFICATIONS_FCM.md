# OneTrust / NUX — how notifications work (not WebSocket, not polling)

**One file for:** “Push notifications — polling or WebSocket?” · “How does the bell drawer get data?” · FCM vs SSE vs WS.

**Source of truth:** `cloud-front-end` / `dashboard` (`NotificationsService`, `FirebaseMessagingService`, `firebase-messaging-sw.js`).  
**Do not say** folder names like Ternary.

---

## 0. 30s opener (say this first)

> The **in-app notification drawer** is **not** a live WebSocket feed and **not** a `setInterval` poller. The list is **HTTP GET** `users/notification/list` when the user **opens the drawer**, when **tenant changes**, or when a **push event** tells us to refresh.  
> **Push** (OS/browser toast + “something new arrived”) is **Firebase Cloud Messaging (FCM)** — Web Push via a **service worker**, VAPID token, backend `POST users/notification/subscribe` with `appMode: 'WEB'` and `fcmId`. Foreground: `onMessage`. Background: SW `onBackgroundMessage` → `client.postMessage` → we dispatch `window` event `fcm-notification`.  
> **Not** Socket.IO / native WebSocket for this feature. Preferences (email / which alerts) are a **separate settings API**, not the transport.

---

## 1. Two different products (don’t mix them)

| What the user sees | Transport | When it runs |
|---|---|---|
| **Bell drawer** — cards: notifications / alerts / reports | **Pull:** REST `GET .../users/notification/list?tenantId=&notificationCategory=` | Open drawer, tenant change, FCM ping |
| **Browser / OS push** | **Push:** **FCM** (Web Push + service worker) | Server → Google → browser, even if drawer is closed |
| **Account notification preferences** | REST settings (channels, alert types, emails) | User saves prefs — not live delivery |
| **Email** | Backend mail | Off-browser |

If they say “are you polling?”:

> We **pull on demand**, not on a timer. That’s **not** polling in the interview sense (`setInterval` every 5s). It’s refresh-when-needed.

If they say “WebSocket?”:

> We **could** have used WS for the drawer. We didn’t. FCM already solves **background** delivery and **multi-device** tokens. A WS would only help while the tab is open, and we’d still need push for minimized tabs.

---

## 2. What we are **not** using

| Idea | In NUX notifications? |
|---|---|
| `setInterval` / RxJS `timer` on the list | **No** (none in the notifications feature) |
| WebSocket / Socket.IO for the bell | **No** |
| SSE (`EventSource`) | **No** |
| Long-polling | **No** |

`faye-websocket` in `package-lock` is a **transitive** dep, not our notification client.

---

## 3. In-app list (HTTP + RxJS)

`NotificationsService` (`providedIn: 'root'`).

**Load triggers** (`combineLatest` of tenant + `refreshSubject`):

1. Selected **tenant** changes  
2. User **opens** the drawer (`open()` bumps `refreshSubject`)  
3. Window event **`fcm-notification`** (FCM arrived) → same refresh

Then **`forkJoin`** three category pages: `notifications` | `alerts` | `reports`.

```text
GET {restServer}/users/notification/list
    ?tenantId=
    &notificationCategory=notifications|alerts|reports
    &endTime=   ← only for “load more” (cursor = oldest created - 1)
```

**Seen / dismiss:** `PUT .../users/notification/viewed` body `{ tenantId, hash }` (`hash` = `notification_id`). Dismissed IDs also cached in **localStorage** so the carousel doesn’t show them again without a refetch.

**Click a card:** optional sub-tenant switch → mark viewed → route to alerts player or mapped dashboard URL (`nd_source=push` on some video-request links).

**Spoken:** drawer is a **ViewModel + HTTP Model**. FCM only **invalidates** the list; the **payload of the list** still comes from REST.

---

## 4. Push = FCM (how it actually works)

```text
  IDMS backend
       │  send to this user's FCM token
       ▼
  Firebase / Google (FCM)
       │
       ├── tab in foreground  →  AngularFire onMessage(payload)
       └── tab in background  →  Service Worker onBackgroundMessage
                                      │
                                      ▼
                            client.postMessage(payload)
                                      │
                                      ▼
                    FirebaseMessagingService.processNotification
                                      │
                                      ▼
                    window 'fcm-notification' CustomEvent
                                      │
                                      ▼
                    NotificationsService.refreshSubject++  →  GET list
```

### 4a. Token (this device)

1. Browser **Notification permission** (`default` / `granted` / `denied`). Drawer shows **enable push** / **blocked** banners.  
2. Register SW: `firebase-messaging-sw.js` (compat Firebase JS 12).  
3. `getToken(messaging, { vapidKey, serviceWorkerRegistration })`.  
4. **POST** `{restServer}/users/notification/subscribe` `{ appMode: 'WEB', fcmId: token }`.  
5. Persist `ndUserFcmId` + subscribed tenant in **localStorage**. Re-sync on **navigation** and on **window focus** (60s cooldown) if token/tenant drifted.

Init: `App` calls `initialize()`; after **session create**, `initialize(true)` forces token refresh.

### 4b. Foreground vs background

| Tab | API | Then |
|---|---|---|
| Visible | `@angular/fire/messaging` **`onMessage`** | `processNotification` → `fcm-notification` |
| Hidden / other | SW **`messaging.onBackgroundMessage`** | `clients.matchAll` → `postMessage` → same handler |

Service worker **is not** a Web Worker for CPU. It’s the **push endpoint** the browser keeps alive. See `frontend-system-design/06_SERVICE_WORKERS.md` vs `05_WEB_WORKERS.md`.

### 4c. Why FCM instead of WebSocket

| | FCM (what we use) | WebSocket |
|---|---|---|
| Tab closed / background | **Yes** (SW + OS notification) | Connection dead |
| Our servers hold a socket per tab | **No** — Google fans out | **Yes** — scale, LB sticky, reconnect |
| Mobile web / permission model | Browser **Web Push** | Not the OS notification tray |
| Drawer contents | Still REST (source of truth) | Could stream items; we didn’t |

**Tradeoff to say:** FCM delivery is **best-effort** and needs permission. If user blocks notifications, they still get the list **when they open the bell** (pull). Email prefs still work independently.

---

## 5. Polling vs pull vs push (whiteboard)

```text
Polling:     every 5s GET /list          ← we do NOT do this
Pull:        GET /list on open / tenant  ← drawer
Push:        FCM → refresh GET /list     ← live hint
WebSocket:   server sends JSON anytime   ← not this feature
```

**Why not poll the list:** wasted REST, extra load on `users/notification/list`, battery; FCM already tells us *when*.

**Why still GET after FCM:** the FCM payload is a **ping / small data map**, not the full categorized carousel. REST stays the **source of truth** (pagination, categories, seen flags).

---

## 6. Files to name in an interview (no paths to Ternary)

| Piece | Role |
|---|---|
| `FirebaseMessagingService` | Permission, token, subscribe, `onMessage`, SW messages |
| `firebase-messaging-sw.js` | Background FCM |
| `NotificationsService` | List HTTP, `fcm-notification` listener, dismiss |
| `NotificationsDrawer` | UI + “Enable push” CTA |
| Personal notification preferences | Which events / channels — **settings**, not FCM plumbing |

---

## 7. Q bank

**Q: Polling or WebSocket?**  
Neither for live push. **FCM**. List is **HTTP pull** on open / tenant / FCM event.

**Q: How do you get the token to the backend?**  
`getToken` → `POST /users/notification/subscribe` `{ appMode: 'WEB', fcmId }`.

**Q: What if the tab is in the background?**  
Service worker `onBackgroundMessage`, then `postMessage` into the page if a client exists.

**Q: What if permission is denied?**  
Banner “blocked”; no token; user still **opens the drawer** and we GET the list.

**Q: Same as fleet live map?**  
**No.** Fleet tracking may poll locations. **Notifications are FCM + REST.** Don’t conflate.

**Q: IndexedDB?**  
Dismiss cache is **localStorage**, not IndexedDB.

---

## 8. Related prep files

- WebSocket mechanics: `frontend-system-design/13_WEBSOCKETS_HOW_THEY_WORK.md`  
- Service workers: `frontend-system-design/06_SERVICE_WORKERS.md`  
- Widget polling scenario (generic): `scenario-based-questions/01_DASHBOARD_WIDGETS_POLLING.md`  
