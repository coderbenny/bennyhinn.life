---
title: "Zero-Downtime Deployments: My CI/CD Pipeline for Next.js and Flask on GCP"
date: "2026-02-14"
image: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=800"
excerpt: "A deep dive into the Docker containerization, testing gates, health checks and connection-draining strategy behind deploying Next.js and Flask on Google Cloud without dropping a request."
category: "DevOps"
tags: ["GCP", "Docker", "CI/CD", "Next.js", "Flask", "Deployment"]
---

## The true cost of downtime

When you are running FinTech applications, logistics platforms and health-tech services simultaneously, "putting up a maintenance page" is not an option. A dropped connection during an M-PESA callback is not a cosmetic problem — it is a payment whose state you no longer know.

That last point is what changed how I deploy. Most deployment advice treats a restart as a brief unavailability: some users see an error, they retry, everyone moves on. That model breaks the moment you have inbound webhooks. A payment provider calling your callback URL during a restart does not see "the site is down" — it sees a failed delivery, and its retry policy is now in charge of your data consistency. You have outsourced correctness to somebody else's exponential backoff.

So zero-downtime here is not about polish. It is about never being in a position where you have to reconstruct what happened during a 30-second window.

## The containerization foundation

The prerequisite is environment parity. "It works on my machine" stops being a joke when your machine *is* production, bit for bit. Every application I run — the Next.js frontend, the Flask API, the Celery workers, the Redis cache — is containerized.

```yaml
version: '3.8'
services:
  api:
    image: my-flask-api:${GIT_SHA}
    restart: always
    environment:
      - DATABASE_URL=${DB_URL}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/healthz"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 20s

  worker:
    image: my-flask-api:${GIT_SHA}
    command: celery -A app.celery worker --loglevel=info
    stop_grace_period: 60s

  web:
    image: my-nextjs-web:${GIT_SHA}
    ports:
      - "3000:3000"
```

Two details in there matter more than the rest.

**Images are tagged with the git SHA, never `latest`.** `latest` is not a version, it is a race condition. With a SHA tag, "what is running in production right now" has exactly one answer, and rollback is a tag change rather than a rebuild. I learned this the tedious way: chasing a bug that only reproduced in production because two nodes had pulled `latest` on different days and were running different code.

**`stop_grace_period` on the worker is set to 60s.** The default is 10. A Celery worker that gets SIGKILLed mid-task leaves that task in limbo — not retried, not completed. Sixty seconds gives in-flight jobs room to finish.

## The pipeline: gates before Google Cloud

Before code reaches GCP it has to survive a sequence of gates, orchestrated in GitHub Actions. The ordering is deliberate: cheapest and most likely to fail first.

1. **Lint and format** — seconds to run, catches the trivia that otherwise eats review time.
2. **Unit tests** — pure logic, no network, no database.
3. **Integration tests** — against a real Postgres and Redis in service containers, never mocks. Mocked database tests pass happily while your actual SQL has a syntax error.
4. **Build the image** — a build that fails here fails before anything is live.
5. **Smoke test the built image** — boot the container, hit `/healthz`, confirm it answers before shipping it anywhere.

That fifth gate is one people skip and it catches an entire class of failure: the image builds, the tests pass, and the container dies on startup because an environment variable is missing from the production config. Booting the artifact you are about to deploy is the only way to catch that.

```yaml
- name: Smoke test the image
  run: |
    docker run -d --name smoke -p 8000:8000 \
      -e DATABASE_URL=${{ secrets.TEST_DB_URL }} \
      my-flask-api:${{ github.sha }}
    for i in $(seq 1 30); do
      if curl -sf http://localhost:8000/healthz; then exit 0; fi
      sleep 2
    done
    echo "container never became healthy"; docker logs smoke; exit 1
```

## What a health check should actually check

Most `/healthz` endpoints return `200 OK` unconditionally. That is worse than having none, because it tells your load balancer a broken instance is fine.

A useful health check verifies the dependencies the service cannot work without:

```python
@app.route("/healthz")
def healthz():
    checks = {}
    try:
        db.session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = f"failed: {exc}"

    try:
        redis_client.ping()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"failed: {exc}"

    healthy = all(v == "ok" for v in checks.values())
    return jsonify(status="ok" if healthy else "degraded", checks=checks), (
        200 if healthy else 503
    )
```

One caveat worth stating: do not make the health check expensive. It runs every ten seconds against every instance. `SELECT 1` is fine. Counting rows in your orders table is not — I have seen a health check become the single heaviest query on a database.

It is also worth separating *liveness* from *readiness*. Liveness answers "should this process be restarted?" Readiness answers "should this process receive traffic?" An instance whose Redis connection just dropped is not ready, but restarting it will not help. Conflating the two produces restart loops.

## Blue/green on GCP

The deployment itself is blue/green. The currently serving version is blue; the new version is deployed alongside as green. Both run simultaneously, and the load balancer decides who gets traffic.

The sequence:

1. Deploy green with the new image tag. Do not route traffic to it.
2. Wait for green to report healthy — genuinely healthy, per the check above.
3. Shift a small slice of traffic (5–10%) to green and watch error rates.
4. If clean, shift fully. If not, shift back to blue; blue never stopped running.
5. Keep blue alive for a grace period before tearing it down.

Step 5 is the one that pays for itself. The temptation is to kill blue immediately to save cost. But the bugs that matter are rarely visible in the first 30 seconds — they show up when a particular endpoint gets hit, or when a scheduled job fires. Keeping blue warm for 15 minutes turns "emergency rollback and redeploy" into "point the load balancer back."

### Connection draining

Blue/green alone does not give you zero downtime. If you cut traffic to blue while it is mid-request, you have still dropped those requests.

The container needs to handle SIGTERM properly: stop accepting new connections, finish what is in flight, then exit. With Gunicorn this largely comes free, provided your timeout is longer than your slowest request. What does not come free is telling the load balancer to stop sending traffic *before* the shutdown begins. The order must be:

1. Mark the instance unhealthy so the load balancer removes it from rotation.
2. Wait for the health check interval to elapse — the load balancer needs to notice.
3. *Then* send SIGTERM.

Skipping step 2 is the most common cause of "we do blue/green but still see 502s during deploys." The load balancer routes a request to an instance that has already started shutting down.

## Database migrations: the part blue/green does not solve

Here is the honest limitation. Blue/green assumes both versions can run against the same database simultaneously. The moment a migration is backwards-incompatible, that assumption fails — and no deployment strategy will save you.

The workaround is to make every migration expand-then-contract, across two deploys:

- **Deploy 1 (expand):** add the new column as nullable. Write to both old and new. Both versions work.
- **Backfill:** populate the new column for existing rows, in batches.
- **Deploy 2 (contract):** stop writing the old column. Drop it in a later release.

Renaming a column is therefore three deploys, not one. That feels slow. It is considerably faster than an outage.

## What this buys you

Deploys stop being events. There is no deployment window, no "let's ship on Thursday when traffic is low," no held breath. That changes behaviour more than it changes uptime numbers: when shipping is boring, you ship smaller changes more often, and smaller changes are the ones that are easy to debug.

The uptime figure is the visible outcome. The real one is that nobody schedules their week around a release.
