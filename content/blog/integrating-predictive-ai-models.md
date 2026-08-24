---
title: "Beyond the Chatbot: Integrating Predictive AI Models in Production Web Apps"
date: "2026-02-08"
image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800"
excerpt: "Moving models out of notebooks and into production — worker starvation, cold starts, backpressure, and the polling frontend that doesn't melt your API."
category: "AI"
tags: ["Machine Learning", "Celery", "Flask", "Next.js", "Async", "Architecture"]
---

## The deployment chasm

The ML ecosystem is excellent for research and awkward for deployment. Models are built in notebooks and Colab, where a fifteen-second inference is a mild inconvenience. Putting that same model behind a live consumer application is a software engineering problem that the modelling work does not prepare you for.

The core mismatch is timing. A web endpoint should answer in under 200ms. Model inference runs from 500ms to 15 seconds depending on hardware and input. Those two facts are incompatible in the same process.

## Why the synchronous version collapses

```python
# The architecture that takes down your app
@app.route('/predict', methods=['POST'])
def predict():
    result = slow_ml_model.predict(request.json)   # blocks 10 seconds
    return jsonify(result=result)
```

The arithmetic is unforgiving. Gunicorn with 16 sync workers, each request occupying a worker for 10 seconds, gives you a ceiling of **1.6 requests per second**. Request 17 queues. Request 50 times out at the load balancer.

And the damage is not contained to `/predict`. Those workers serve every route, so login, search and checkout all stop responding. A moderately popular AI feature takes down the entire product, and the metrics will show the *login* endpoint failing — sending you to debug the wrong system.

## The asynchronous pattern

Inference becomes a background job. Three components:

**The gateway.** Flask validates the request, enqueues it, returns a task ID immediately.

```python
@app.route('/api/predict', methods=['POST'])
@jwt_required()
def enqueue_prediction():
    payload = PredictSchema().load(request.json)   # validate before queueing

    if queue_depth("inference") > MAX_QUEUE_DEPTH:
        return jsonify(error="System busy, try shortly"), 503   # backpressure

    task = run_inference.apply_async(args=[payload], queue="inference")
    return jsonify(task_id=task.id, status="PENDING"), 202
```

**The inference worker.** A dedicated pool on GPU-optimised instances, on its own queue.

```python
model = None   # module-level: loaded once per process, not per task

@celery.task(bind=True, max_retries=2, acks_late=True, queue="inference")
def run_inference(self, payload):
    global model
    if model is None:
        model = load_model(MODEL_PATH)     # cold start, once
    return model.predict(payload)
```

**The result store.** Redis with a TTL — predictions are ephemeral, and unbounded result storage is a slow memory leak.

### The details that matter

**Load the model once.** Loading inside the task function re-reads weights from disk on every call, frequently costing more than the inference. Module-level with lazy init loads once per worker process.

**Separate queues, always.** Inference workers must not share a queue with email or thumbnails. GPU instances are expensive and you scale them on a different axis; a shared queue means a burst of emails delays inference and vice versa.

**Validate before enqueueing.** A malformed payload should fail in 5ms at the gateway, not after waiting in a queue to fail on a GPU.

**Backpressure is a feature.** The `503` above is deliberate. An unbounded queue does not prevent overload, it hides it — users wait ten minutes for a result they assume failed. Rejecting quickly under load is more honest and lets clients retry sensibly.

**`acks_late` plus low retries.** Inference is expensive; retrying it three times on a genuinely bad input burns GPU budget. Two attempts, then dead-letter.

## Keeping the frontend alive

The user must never face a frozen screen. Polling is the pragmatic default — simpler than WebSockets and adequate when results take seconds.

Naive polling has a flaw, though: a fixed 2-second interval means a 60-second job generates 30 requests, and a thousand concurrent users generate 15,000 requests per minute against your API. You have moved the load rather than removed it.

Backing off progressively fixes it:

```javascript
const pollResult = async (taskId, { onDone, onError }) => {
  let delay = 1000;
  const started = Date.now();

  while (Date.now() - started < 120_000) {          // hard ceiling
    const res = await fetch(`/api/status/${taskId}`);
    const data = await res.json();

    if (data.status === 'SUCCESS') return onDone(data.result);
    if (data.status === 'FAILURE') return onError(data.error);

    await sleep(delay);
    delay = Math.min(delay * 1.5, 10_000);          // 1s → 10s ceiling
  }
  onError('Timed out. We will email you when it completes.');
};
```

Fast feedback on quick jobs, cheap polling on slow ones, and a bounded loop — an unbounded `setInterval` on a task that never completes polls forever in a background tab.

The final message matters too. "Timed out" alone is a dead end. Because the task ID persists server-side, the work is still running, and telling the user they will be notified turns a failure into a handoff.

### Skeletons, not spinners

During the wait, render the *shape* of the result — a skeleton of the card or chart that is coming. A spinner communicates "something is happening"; a skeleton communicates "here is what you are getting." Better still, surface real stages — `Preprocessing → Running model → Formatting` — driven by the worker updating task state. A ten-second wait with visible progress is tolerable; ten seconds of an ambiguous spinner is where people reload the page and double your load.

## What actually generalises

Integrating predictive AI is barely about the model. The recurring pattern is:

- **Never let slow, unreliable work occupy request-path resources.**
- **Isolate expensive workloads onto their own queue and their own machines.**
- **Reject early under load** rather than queueing without limit.
- **Make waiting legible** on the client, with a bounded loop and a real fallback.

Every one of those is a distributed-systems concern that predates machine learning by decades. The model is a slow, expensive, occasionally-failing dependency — and we already knew how to build around those.
