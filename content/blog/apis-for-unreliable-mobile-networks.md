---
title: "Designing APIs for Unreliable Mobile Networks"
date: "2026-08-16"
image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800"
excerpt: "Building for 3G, intermittent coverage and expensive data. Payload discipline, resumable writes, offline queues and the retry semantics that make a flaky connection survivable."
category: "Architecture"
tags: ["API Design", "Mobile", "Offline", "Performance", "Africa", "Architecture"]
---

## The network you are actually shipping to

Most API design assumes a connection that is fast, stable and cheap. Across much of Africa — and plenty of everywhere else — none of the three holds. Users are on 3G that drops in lifts and stairwells, coverage that vanishes between neighbourhoods, and data bought in bundles where every megabyte is a deliberate purchase.

An API that works beautifully on office wifi can be unusable on a matatu. The failures are not exotic; they are just outside what a fast-network development loop ever exercises.

Three constraints drive the design:

1. **Requests fail mid-flight** — not with an error, but by hanging until timeout.
2. **Bandwidth costs the user money** — a chatty API is a bill.
3. **Latency is high and variable** — 300–800ms round trips are normal, and each round trip compounds.

## Payload discipline

Every byte is billed to someone. The usual REST reflex — return the full resource and let the client pick — is expensive here.

**Let the client ask for what it needs:**

```
GET /api/orders?fields=id,status,total_cents,created_at&limit=20
```

An order list rendering four fields per row should not transfer nested customer objects, line items and audit metadata.

**Paginate with cursors, not offsets.** `?offset=2000` makes the database count 2,000 rows to discard them, and results shift when new records arrive mid-scroll:

```
GET /api/orders?after=eyJpZCI6MTQ0Mn0&limit=20
```

**Compress.** `Content-Encoding: gzip` on JSON typically cuts 60–80%. It is a server configuration line, and it is free.

**Support conditional requests.** A client refreshing a list that has not changed should transfer nothing:

```python
@app.route("/api/orders")
def list_orders():
    etag = compute_etag(user_id)
    if request.headers.get("If-None-Match") == etag:
        return "", 304                      # a few bytes instead of 40KB
    ...
```

`304 Not Modified` is dramatically underused, and on a metered connection it is the difference between a free refresh and a charged one.

## Timeouts that match reality

A default 30-second timeout is wrong in both directions: too long for a user staring at a spinner, too short for a large upload on a weak connection.

Separate the two:

```javascript
const TIMEOUTS = {
  read:   8000,    // GET — fail fast, the user is waiting
  write:  30000,   // POST — give it room, retrying is expensive
  upload: 120000,  // large bodies on a slow uplink
};
```

Crucially, **distinguish a timeout from a failure**. A read that times out can be retried freely. A write that times out is *unknown* — it may have succeeded with the response lost. Those need entirely different handling, which is the next section.

## Retries need idempotency, or they cause damage

Retrying blindly is how one payment becomes three. Any write a client might retry must carry an idempotency key so the server can recognise a repeat:

```javascript
async function createOrder(order) {
  const key = crypto.randomUUID();          // ONE key per intent

  return retryWithBackoff(() =>
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': key },  // reused on every attempt
      body: JSON.stringify(order),
    })
  );
}
```

Generating the key inside the retry loop defeats the mechanism entirely — each attempt then looks like a new order. This is the most common version of the bug.

Retry only what is safe to retry:

```javascript
function isRetriable(error, response) {
  if (error?.name === 'TimeoutError') return true;
  if (error?.name === 'NetworkError') return true;
  if (!response) return false;
  return response.status === 429 || response.status >= 500;
}
```

A `400` will be a `400` forever. Retrying client errors wastes the user's data and delays the honest error message.

And honour `Retry-After` when the server sends it, rather than guessing.

## Write locally first, sync later

The strongest pattern for genuinely intermittent connectivity: never let the network block the interface. Persist the user's action locally, confirm it immediately, sync in the background.

```javascript
async function submitReading(reading) {
  const record = { ...reading, id: crypto.randomUUID(), syncState: 'PENDING' };
  await localDB.put('readings', record);     // durable immediately
  showInList(record);                        // user sees it now
  scheduleSync();                            // best-effort
}

async function scheduleSync() {
  if (!navigator.onLine) return;             // will retry on reconnect

  for (const record of await localDB.getAllPending('readings')) {
    try {
      await fetch('/api/readings', {
        method: 'POST',
        headers: { 'Idempotency-Key': record.id },   // the local id IS the key
        body: JSON.stringify(record),
      });
      await localDB.patch('readings', record.id, { syncState: 'SYNCED' });
    } catch {
      return;                                // still offline; try again later
    }
  }
}

window.addEventListener('online', scheduleSync);
```

Using the locally-generated ID as the idempotency key is the neat part: the record's identity and its deduplication key are the same value, so re-syncing is inherently safe.

Show sync state in the interface. A user who can see "3 pending" understands the system; one who sees no difference between saved and synced will assume data is lost the first time they check on another device.

## Make status visible, not silent

Two rules that cost little and change how the app feels:

**Distinguish "no data" from "cannot load."** An empty list because the request failed must not look like an empty list because there is nothing there. The first needs a retry affordance; the second needs an explanation.

**Never show a bare spinner past two seconds.** Say what is happening — "Still loading, your connection seems slow" — and offer cancel. Ambiguity is what makes people force-quit and lose work.

## Test on the network you ship to

Almost none of this surfaces on a development machine. Chrome DevTools' "Slow 3G" throttling is the minimum bar, and it is not enough on its own — it simulates bandwidth and latency, not the interesting failures.

Test explicitly for: the connection dropping mid-request; a request that succeeds while its response is lost; going offline mid-flow and returning ten minutes later; and two devices syncing the same local record.

That last set is where real users live, and where an untested app quietly corrupts or duplicates data.

## The underlying shift

Designing for unreliable networks means abandoning the assumption that a request either succeeds or fails. It can also **succeed invisibly** — the work done, the confirmation lost.

Once you design for that third outcome, most of the rest follows: idempotency keys so retries are safe, local-first writes so the user is never blocked, explicit sync state so nothing is ambiguous, and payload discipline because someone is paying for every byte.

It is better engineering generally. It is merely non-negotiable here.
