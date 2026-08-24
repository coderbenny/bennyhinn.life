---
title: "Celery in Production: The Default Settings That Will Hurt You"
date: "2026-04-12"
image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800"
excerpt: "Celery's defaults are tuned for getting started, not for running. The seven settings worth changing before your first outage, and why each one bites."
category: "Backend"
tags: ["Celery", "Python", "Redis", "Queues", "Reliability", "Backend"]
---

## Defaults optimised for the tutorial

Celery is excellent, and its defaults are chosen so the quickstart works in five minutes. Several of those choices are actively wrong for production, and each one fails in a way that is hard to diagnose — usually as silent data loss rather than an error.

These are the settings I now change before writing a single task, and the specific failure each one prevents.

## 1. `acks_late` — the one that loses work

**Default:** `task_acks_late = False`

A worker acknowledges a message the moment it *receives* it, before running it. If the worker is killed mid-task — an OOM kill, a deploy, a spot instance reclaimed — the broker has already been told the message was handled. The task is gone. No retry, no error, no trace.

```python
app.conf.task_acks_late = True
app.conf.worker_prefetch_multiplier = 1
```

With `acks_late`, acknowledgement happens after the task returns. A killed worker's task is redelivered to another.

The trade-off, stated plainly: tasks can now run **more than once**. That is the correct trade for almost all work, but it makes idempotency mandatory rather than optional:

```python
@celery.task(bind=True, acks_late=True)
def charge_customer(self, order_id):
    order = Order.query.get(order_id)
    if order.status == "PAID":
        return                          # already done, safe to re-run
    ...
```

If a task genuinely cannot be made idempotent, leave `acks_late` off for that specific task and accept the loss risk knowingly.

## 2. `worker_prefetch_multiplier` — the head-of-line blocker

**Default:** `4`

Each worker process reserves four tasks at a time. With long-running tasks this is a queue-fairness disaster: a worker grabs four ten-minute jobs while another worker sits idle, and the tasks queued behind them wait forty minutes.

```python
app.conf.worker_prefetch_multiplier = 1   # long tasks
```

For very short, high-volume tasks, prefetching genuinely helps throughput — the round-trip to the broker dominates. Rule of thumb: tasks under a second, keep prefetch high; tasks over a few seconds, set it to 1.

Note this must be `1` for `acks_late` to behave sensibly, since prefetched-but-unstarted tasks are held by a worker that may die.

## 3. Task time limits — the hang that never ends

**Default:** none. A task can run forever.

One task blocked on a socket with no timeout occupies a worker permanently. Enough of those and your pool is silently gone — no errors, no crash, just a queue that stops draining.

```python
app.conf.task_soft_time_limit = 300    # SoftTimeLimitExceeded — catchable
app.conf.task_time_limit = 360         # SIGKILL — unconditional
```

The soft limit raises a catchable exception, letting you clean up and mark state:

```python
@celery.task(bind=True)
def generate_report(self, report_id):
    try:
        build_report(report_id)
    except SoftTimeLimitExceeded:
        Report.query.get(report_id).update(status="TIMEOUT")
        raise
```

Set the hard limit above the soft one so cleanup has room to run.

## 4. Result backend expiry — the slow memory leak

**Default:** results are stored, often indefinitely depending on backend.

Every task result written to Redis and never removed is a leak that takes weeks to become visible, then takes your Redis instance down at an inconvenient hour.

```python
app.conf.result_expires = 3600         # 1 hour

@celery.task(ignore_result=True)       # or don't store at all
def send_welcome_email(user_id):
    ...
```

Most tasks are fire-and-forget. If nothing ever reads the result, `ignore_result=True` is the right answer — cheaper and leak-proof by construction.

## 5. Separate queues — the shared-pool starvation problem

**Default:** everything lands on `celery`.

One queue means a burst of slow image processing delays every password-reset email behind it. The two workloads have nothing in common and should not share a resource.

```python
app.conf.task_routes = {
    "tasks.send_*":      {"queue": "notifications"},
    "tasks.process_*":   {"queue": "processing"},
    "tasks.run_inference": {"queue": "gpu"},
}
```

```bash
celery -A app worker -Q notifications -c 20 --prefetch-multiplier 4
celery -A app worker -Q processing    -c 4
celery -A app worker -Q gpu           -c 1
```

Now each workload scales on its own axis: high concurrency for I/O-bound notifications, low for CPU-bound processing, one per GPU. This is probably the highest-leverage change on the list.

## 6. Retry with jitter — the thundering herd

**Default:** no automatic retry; naive implementations use fixed backoff.

Exponential backoff alone means every task that failed during a five-minute outage retries at exactly the same moment, and your recovering service is immediately knocked over again.

```python
@celery.task(
    bind=True,
    autoretry_for=(requests.Timeout, requests.ConnectionError),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,          # the important one
    max_retries=5,
)
def call_external_api(self, payload):
    return requests.post(URL, json=payload, timeout=10).json()
```

`retry_jitter=True` randomises the delay so retries spread out. And note `autoretry_for` names *specific transient* exceptions — retrying a `ValidationError` five times just wastes capacity on something that will never succeed.

## 7. Broker connection retry on startup

**Default:** in Celery 6+, workers will not retry the initial broker connection.

In a containerised deployment, workers routinely start before Redis is accepting connections. Without this, the worker exits and — depending on your orchestrator — may not come back.

```python
app.conf.broker_connection_retry_on_startup = True
```

One line, and it removes an entire category of "the deploy worked yesterday" incidents.

## The configuration, together

```python
app.conf.update(
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_soft_time_limit=300,
    task_time_limit=360,
    result_expires=3600,
    task_reject_on_worker_lost=True,
    broker_connection_retry_on_startup=True,
    task_default_queue="default",
    task_routes={...},
    worker_max_tasks_per_child=1000,   # bounds slow memory growth
)
```

`worker_max_tasks_per_child` deserves a note: it recycles a worker process after N tasks. It does not fix a memory leak, but it stops one from taking the host down while you find it — a pragmatic guard rather than a solution.

## Two things worth adding beyond configuration

**A dead letter table.** When retries are exhausted, the failure ends up in a log nobody reads. Capture it with arguments and traceback so it can be inspected and replayed after a fix.

**A queue-depth alarm.** A backlog growing steadily is the earliest signal that workers have died or a downstream dependency is failing. It is the single most valuable Celery metric, and almost nobody monitors it until after the first incident.

## The theme

Every default above is reasonable for a tutorial and wrong for a system that has to survive deploys, OOM kills and dependency outages. They share a failure mode: **silence**. Work disappears without an exception, a queue stalls without an alert, memory grows without a symptom until it does.

Twenty minutes of configuration removes most of it.
