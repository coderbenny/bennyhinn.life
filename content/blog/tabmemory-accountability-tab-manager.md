---
title: "From Clutter to Intelligence: Architecting an Accountability-First Tab Manager"
date: "2026-01-05"
image: "/projects/tabmemory.png"
excerpt: "A Flask, Redis and Celery pipeline for asynchronous processing — with the retry, idempotency and poison-message handling that a 202 Accepted actually obliges you to provide."
category: "Architecture"
tags: ["Flask", "Celery", "Redis", "Async", "Queues", "Python"]
---

![TabMemory](/projects/tabmemory.png)

## The problem with digital clutter

Knowledge workers carry a lot of cognitive load in open tabs. Dozens of them, plus scattered bookmarks and lost research trails, all standing in for a memory the browser refuses to provide. **TabMemory** started from a simple thesis: turn that clutter into something actionable.

Doing that means more than saving URLs. Each saved tab gets processed — metadata extracted, content categorised, a screenshot rendered — and all of that is slow, network-dependent work. Meanwhile the browser extension needs to respond instantly, because a save button that hangs for four seconds is a save button nobody presses twice.

That tension is the whole architecture.

## Decoupling with a queue

The extension POSTs, Flask validates and enqueues, Celery does the work:

```python
@app.route('/api/v1/memories', methods=['POST'])
@jwt_required()
def create_memory():
    data = request.get_json()

    memory = Memory(
        user_id=current_user.id,
        url=data['url'],
        status='PROCESSING',
    )
    db.session.add(memory)
    db.session.commit()          # commit BEFORE dispatching — see below

    process_memory.delay(memory.id)

    return jsonify(id=memory.id, status="processing"), 202
```

The API responds in milliseconds regardless of how slow the downstream work is, and Flask never blocks on an external fetch.

### Two ordering bugs hiding in that snippet

**Commit before dispatch.** If `process_memory.delay()` runs before the commit, a fast worker can pick up the task and query for a row that does not exist yet. This is a genuine race, it is timing-dependent, and it reproduces roughly never in development and regularly under load. Commit first, dispatch second.

**Pass the ID, not the object.** `process_memory.delay(memory.id)` sends an integer. Passing the ORM object means serialising a snapshot that may be stale by the time the worker runs — and Celery arguments must be JSON-serialisable anyway. The worker re-fetches current state.

### What `202 Accepted` obliges you to do

Returning `202` is a promise: *I have taken responsibility for this work.* The user's tab is closed; they are not going to retry. If the job is silently dropped, the data is gone and nobody finds out.

So the moment you return 202 you owe the user three things — retries that handle transient failure, a terminal state they can observe, and somewhere for permanently failed work to go. Skipping any of them turns "asynchronous" into "occasionally loses your data."

## Retries with backoff and jitter

Tasks fail. Sites time out, external APIs rate-limit, databases deadlock. These are guarantees, not possibilities.

```python
@celery.task(bind=True, max_retries=3, acks_late=True)
def process_memory(self, memory_id):
    memory = Memory.query.get(memory_id)
    if memory is None or memory.status == 'COMPLETE':
        return                                   # idempotent: already done

    try:
        metadata = extract_metadata(memory.url, timeout=10)
    except (requests.Timeout, requests.ConnectionError) as exc:
        countdown = (2 ** self.request.retries) + random.uniform(0, 1)
        raise self.retry(exc=exc, countdown=countdown)
    except requests.HTTPError as exc:
        if exc.response.status_code in (401, 403, 404):
            memory.status = 'FAILED_PERMANENT'   # retrying will not help
            db.session.commit()
            return
        raise self.retry(exc=exc, countdown=60)

    memory.apply(metadata)
    memory.status = 'COMPLETE'
    db.session.commit()
```

Several deliberate details:

**Jitter.** `2 ** retries` alone means every task that failed during an outage retries at the same instant, hammering the recovering service. Adding a random fraction of a second spreads them out. Synchronised retries are how a brief outage becomes a long one.

**Distinguish transient from permanent.** A 404 will still be a 404 in eight seconds. Retrying it three times wastes worker capacity and delays the queue. Only retry what might plausibly succeed later.

**`acks_late=True`.** By default Celery acknowledges a message when the worker *receives* it, so a worker killed mid-task loses the job silently. With `acks_late`, acknowledgement happens on completion — a crashed worker's task is redelivered.

**Idempotency.** `acks_late` means tasks can run more than once, so the early return on `status == 'COMPLETE'` is not optional. Any at-least-once system needs handlers that tolerate re-execution.

## The dead letter queue

After the final retry the task raises, and by default that failure exists only in a log line nobody reads.

```python
@celery.task(bind=True, max_retries=3, acks_late=True)
def process_memory(self, memory_id):
    ...

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        memory_id = args[0]
        Memory.query.get(memory_id).update(status='FAILED')
        DeadLetter.create(
            task='process_memory', args=args,
            error=str(exc), traceback=einfo.traceback,
        )
        alert_if_rate_exceeds_threshold('process_memory')
```

Now failures are visible, inspectable, and — because the arguments were captured — replayable after a fix. The threshold alert matters more than the individual record: one failure is noise, forty in ten minutes means an upstream dependency is down.

## Sizing the worker pool

Worth stating explicitly, because it is easy to get backwards. TabMemory's work is I/O-bound — waiting on HTTP responses, not computing. I/O-bound workers can run far more concurrency than you have cores, since most are blocked on a socket. CPU-bound work (image processing, transcoding) should run at roughly core count, on a **separate queue** with its own workers.

Mixing them is a common mistake: one slow CPU task in a shared pool starves every quick I/O task queued behind it. Separate queues let each scale on its own axis.

## The next horizon

The obvious next step is turning TabMemory from a passive store into an active assistant — piping extracted text through a lightweight LLM to summarise research trails and generate daily briefings.

Notably, that is an easy addition rather than a rewrite, because the async infrastructure already exists. Adding a slow, unreliable, rate-limited dependency to a system built around retries, idempotency and dead letters is a new task type. Adding one to a synchronous request path is an outage.

Which is the argument for building the boring parts first.
