---
title: "Structured Logging in Python: From print() to Queryable Events"
date: "2026-07-19"
image: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&q=80&w=800"
excerpt: "Log lines you can grep are not the same as logs you can query. Correlation IDs, JSON formatters, context propagation across Celery, and what never to log."
category: "Backend"
tags: ["Python", "Logging", "Observability", "Debugging", "Flask", "Celery"]
---

## The 3am problem

A user reports that their payment failed twenty minutes ago. You have their email address. You open the logs and find:

```
INFO  Processing payment
ERROR Payment failed
INFO  Processing payment
INFO  Payment succeeded
```

Which line is theirs? What was the amount? Which of the four requests in flight produced the error? The logs recorded that *something* happened without recording *what*, and there is no way to recover it after the fact.

The problem is not verbosity. It is that these lines are prose. You can grep prose; you cannot query it.

## Structured logging: events with fields

A structured log line is a machine-readable event with named attributes:

```json
{"ts":"2026-07-19T14:23:01Z","level":"error","event":"payment_failed",
 "user_id":8842,"payment_id":"pay_7f3a","amount_cents":150000,
 "currency":"KES","provider":"mpesa","error_code":"1032",
 "request_id":"req_a1b2c3","duration_ms":847}
```

Now the question "what happened to this user's payment?" is a filter: `user_id=8842 AND event=payment_failed`. So is "how many payments failed with code 1032 this week?" and "what is p95 payment latency by provider?" — none of which the prose version can answer at all.

The shift is from *writing sentences about what happened* to *emitting records of what happened*.

## Setting it up

`structlog` is the most ergonomic option in Python:

```python
import structlog, logging, sys

def configure_logging(env="production"):
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=logging.INFO)

    processors = [
        structlog.contextvars.merge_contextvars,   # request-scoped context
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if env == "development":
        processors.append(structlog.dev.ConsoleRenderer())      # readable
    else:
        processors.append(structlog.processors.JSONRenderer())  # parseable

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        cache_logger_on_first_use=True,
    )
```

The environment split matters for adoption: JSON in production for your log aggregator, coloured key-value output locally so developers can actually read it. Force JSON everywhere and people quietly go back to `print()`.

Usage is ordinary:

```python
log = structlog.get_logger()

log.info("payment_initiated", payment_id=p.id, amount_cents=p.amount_cents,
         provider="mpesa")
```

Note the event name is a stable identifier — `payment_initiated`, not `"Initiating payment for user 8842"`. Identifiers group; sentences do not.

## Correlation IDs

A single request touches several functions and possibly several services. Without a shared identifier you cannot reassemble the story.

Assign one at the edge and bind it into logging context:

```python
@app.before_request
def bind_request_context():
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    g.request_id = request_id

    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        path=request.path,
        method=request.method,
        user_id=getattr(current_user, "id", None),
    )

@app.after_request
def log_response(response):
    structlog.get_logger().info(
        "request_completed",
        status=response.status_code,
        duration_ms=int((time.time() - g.start) * 1000),
    )
    response.headers["X-Request-ID"] = g.request_id
    return response
```

Every log line emitted during that request now carries `request_id` automatically — no threading it through function signatures. Returning it in the response header is a small touch with outsized value: a user reporting a problem can quote an ID that takes you straight to the relevant lines.

`clear_contextvars()` at the start is not optional. Workers are reused across requests, and stale context leaks one user's ID onto another user's logs.

## Propagating context into Celery

Context vars do not cross the queue boundary — a task logs with none of the request's context unless you pass it explicitly.

```python
class ContextTask(celery.Task):
    def apply_async(self, args=None, kwargs=None, **options):
        headers = options.setdefault("headers", {})
        ctx = structlog.contextvars.get_contextvars()
        headers["request_id"] = ctx.get("request_id")
        headers["user_id"] = ctx.get("user_id")
        return super().apply_async(args, kwargs, **options)

    def __call__(self, *args, **kwargs):
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=self.request.get("request_id"),
            task_name=self.name,
            task_id=self.request.id,
        )
        return self.run(*args, **kwargs)
```

Now a single `request_id` traces the whole causal chain — HTTP request, queued task, retries, downstream API calls. That is the difference between "the payment task failed" and "*this* user's payment failed *because* of this upstream timeout, on attempt three."

## What not to log

Structured logging makes it easy to attach whole objects, which makes it easy to leak.

**Never log:** passwords, tokens, API keys, full card numbers, CVVs, OTP codes, complete SMS bodies (they contain OTPs and transaction details), or full request bodies on auth endpoints.

**Redact rather than omit** — knowing a field was present is often useful:

```python
SENSITIVE = {"password", "token", "authorization", "pin", "otp", "cvv"}

def redact(logger, method, event_dict):
    for key in list(event_dict):
        if any(s in key.lower() for s in SENSITIVE):
            event_dict[key] = "[REDACTED]"
    return event_dict
```

Add it as a processor and it applies everywhere by default, rather than depending on every developer remembering. Defaults beat discipline.

For identifiers you need to correlate but should not store in clear text — phone numbers, emails — log a stable hash. You can still group by user without retaining the personal data.

## Sampling the noise

At volume, logging every successful request is expensive and drowns the interesting ones. Sample the routine and keep everything unusual:

```python
def should_log(response, duration_ms):
    if response.status_code >= 400:  return True    # all errors
    if duration_ms > 1000:           return True    # all slow requests
    return random.random() < 0.01                   # 1% of healthy traffic
```

You keep full fidelity where it matters and a representative baseline elsewhere.

## Log levels, used consistently

The main failure here is drift — everything becomes `INFO` because nobody agreed what the levels mean:

- **`DEBUG`** — detail useful while developing. Off in production.
- **`INFO`** — business events worth a record: payment initiated, user registered.
- **`WARNING`** — recoverable anomalies: a retry fired, a fallback was used.
- **`ERROR`** — an operation failed and someone may need to act.
- **`CRITICAL`** — the service cannot function.

The practical test: **`ERROR` should be rare enough to alert on.** If your error channel produces a hundred messages an hour, it is not an alert channel any more, and the one that mattered will be scrolled past.

## Worth it before you need it

The value only appears during an incident — which is exactly when it is too late to add. Twenty minutes of setup at the start of a project turns your logs from a wall of sentences into a queryable dataset, and the first time you resolve a production question with a single filter instead of an hour of grep, it has paid for itself.
