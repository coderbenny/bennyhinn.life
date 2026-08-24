---
title: "Rate Limiting with Redis: Fixed Window, Sliding Window and Token Bucket"
date: "2026-06-07"
image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=800"
excerpt: "Three algorithms, their failure modes, and working Redis implementations — including the boundary burst that makes the simplest approach allow double what you configured."
category: "Backend"
tags: ["Redis", "Rate Limiting", "API Design", "Python", "Lua", "Backend"]
---

## Why the simplest version is not enough

Rate limiting looks like a solved problem until you look at what your implementation actually permits.

The standard first attempt — count requests per minute, reset the counter each minute — allows **twice your configured limit** in a burst, and it does so by design rather than by bug. Understanding why leads naturally to the alternatives.

## Fixed window

Bucket time into fixed intervals. Count within each.

```python
def fixed_window(user_id, limit=100, window=60):
    bucket = int(time.time() // window)
    key = f"rl:{user_id}:{bucket}"

    count = redis.incr(key)
    if count == 1:
        redis.expire(key, window)
    return count <= limit
```

Cheap, obvious, one round trip. And here is the flaw:

A limit of 100/minute. A client sends 100 requests at 11:00:59, then 100 more at 11:01:00. Both windows are individually within limit. But 200 requests arrived within one second — double your intended rate, at exactly the moment a burst hurts most.

This **boundary burst** is inherent to the approach. Fixed window is fine for coarse quotas where a transient 2× does no harm. It is not fine for protecting a fragile downstream service.

## Sliding window log

Store the timestamp of every request. Count those inside a rolling window.

```python
def sliding_window_log(user_id, limit=100, window=60):
    key = f"rl:{user_id}"
    now = time.time()

    pipe = redis.pipeline()
    pipe.zremrangebyscore(key, 0, now - window)   # drop what aged out
    pipe.zcard(key)                                # count what remains
    pipe.zadd(key, {str(uuid4()): now})            # record this one
    pipe.expire(key, window)
    _, count, _, _ = pipe.execute()

    return count < limit
```

This is exact. There is no boundary burst — the window genuinely slides, and at any instant the true count over the trailing 60 seconds is enforced.

The cost is memory: one sorted-set member per request, per user. At 100 requests/minute across 10,000 active users that is a million members held continuously. For high-volume public APIs, that is too much.

There is also a subtle correctness issue: the pipeline is not atomic. Between `zcard` and `zadd`, a concurrent request can slip through. Under heavy contention the limit leaks slightly. Fixing it properly requires Lua — see below.

## Sliding window counter

The practical compromise. Keep two fixed-window counters and interpolate between them by how far into the current window you are.

```python
def sliding_window_counter(user_id, limit=100, window=60):
    now = time.time()
    current = int(now // window)
    elapsed = (now % window) / window          # 0.0 → 1.0 through the window

    pipe = redis.pipeline()
    pipe.get(f"rl:{user_id}:{current - 1}")
    pipe.incr(f"rl:{user_id}:{current}")
    pipe.expire(f"rl:{user_id}:{current}", window * 2)
    prev, curr, _ = pipe.execute()

    estimate = int(prev or 0) * (1 - elapsed) + curr
    return estimate <= limit
```

Twenty seconds into the current window, the previous window contributes two-thirds of its count. The estimate glides rather than resetting, so the boundary burst mostly disappears — while memory stays at two integers per user regardless of traffic.

It assumes requests were spread evenly across the previous window, so it is an approximation. In practice the error is small and it is what most production rate limiters use, including several well-known CDNs.

## Token bucket

A different model, and the one to reach for when you want to *permit* bursts rather than merely smooth them.

A bucket holds tokens up to a capacity and refills at a steady rate. Each request takes one. Empty bucket means rejection.

```lua
-- token_bucket.lua — atomic, runs entirely inside Redis
local key      = KEYS[1]
local rate     = tonumber(ARGV[1])   -- tokens per second
local capacity = tonumber(ARGV[2])
local now      = tonumber(ARGV[3])
local cost     = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(bucket[1]) or capacity
local ts     = tonumber(bucket[2]) or now

tokens = math.min(capacity, tokens + (now - ts) * rate)

local allowed = tokens >= cost
if allowed then tokens = tokens - cost end

redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', key, math.ceil(capacity / rate) * 2)

return { allowed and 1 or 0, tokens }
```

```python
bucket_script = redis.register_script(open("token_bucket.lua").read())

def token_bucket(user_id, rate=2, capacity=20, cost=1):
    allowed, remaining = bucket_script(
        keys=[f"tb:{user_id}"], args=[rate, capacity, time.time(), cost]
    )
    return bool(allowed), remaining
```

Two properties make this attractive. **Bursts are allowed up to capacity** — a client idle for a minute can immediately send 20 requests, which matches how real clients behave (a page load fires several requests at once, then nothing). And **cost is variable**: an expensive endpoint can charge 5 tokens while a cheap one charges 1, so you are limiting *work* rather than request count.

The Lua script also solves the atomicity problem. Redis executes it as a single operation, so there is no window between read and write.

## Choosing

| Algorithm | Memory | Exact? | Allows bursts | Use when |
|---|---|---|---|---|
| Fixed window | 1 int | No — 2× at boundary | Accidentally | Coarse quotas, low stakes |
| Sliding log | 1 entry/request | Yes | No | Low volume, strict limits |
| Sliding counter | 2 ints | Very close | No | **General-purpose default** |
| Token bucket | 2 fields | Yes | Deliberately | Bursty clients, weighted costs |

Start with the sliding window counter. Move to token bucket when clients are naturally bursty or endpoints have very different costs.

## Details that matter in production

**Return the right headers.** A rate limiter that rejects without explanation forces clients to guess:

```python
response.headers["RateLimit-Limit"] = str(limit)
response.headers["RateLimit-Remaining"] = str(max(0, remaining))
response.headers["RateLimit-Reset"] = str(int(reset_at))
response.headers["Retry-After"] = str(int(reset_at - time.time()))
```

`429 Too Many Requests` with `Retry-After` lets a well-behaved client back off correctly instead of hammering you.

**Choose the key deliberately.** Per-IP punishes everyone behind one NAT — common on shared office and university connections. Per-user is fairer but useless pre-authentication. Most systems need both: a generous per-IP limit protecting the login endpoint, and a per-user limit after that.

**Fail open, usually.** If Redis is unavailable, decide deliberately whether requests are allowed or denied. For most APIs, failing open is right — a rate limiter outage should not become a total outage. For login endpoints, fail closed; an unprotected authentication endpoint is worse than a brief unavailability.

**Limit the expensive thing.** Rate limiting requests is a proxy for limiting cost. If one endpoint triggers a 30-second report generation, counting it the same as a health check misses the point — which is exactly what token bucket's variable cost is for.
