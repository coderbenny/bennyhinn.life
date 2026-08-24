---
title: "Scaling Logistics: Real-Time State Management in a Delivery Platform"
date: "2026-01-22"
image: "/projects/errands.png"
excerpt: "Optimistic UI that rolls back correctly, server-authoritative state machines, and role-based JWT authorisation that survives a stolen token."
category: "Architecture"
tags: ["Next.js", "Flask", "State Machines", "JWT", "Security", "Real-Time"]
---

![Errands By Us](/projects/errands.png)

## The complexity of moving parts

Logistics platforms are deceptively simple from the outside: get a thing from A to B. Underneath there is real-time location tracking, a state machine per job, and two user interfaces — client and runner — that must agree on what is happening despite being separate devices on separate networks.

For **Errands By Us**, a Nairobi errand agency, the interesting constraint was not scale. It was that runners work on mobile connections that drop constantly, and the interface has to stay usable through it.

## Optimistic UI, and rolling back properly

When a runner accepts a job, waiting for a server round-trip before updating the interface produces a UI that feels broken on a slow connection. Optimistic updates fix that: update immediately, reconcile with the server after.

The version most tutorials show has a bug:

```javascript
// Looks fine. Rolls back wrong.
const acceptErrand = async (errandId) => {
  mutate('/api/errands', (errands) =>
    errands.map(e => e.id === errandId ? { ...e, status: 'ACCEPTED' } : e),
    false
  );

  try {
    await api.post(`/errands/${errandId}/accept`);
    mutate('/api/errands');
  } catch (error) {
    toast.error("Failed to accept errand.");
    mutate('/api/errands');   // <-- refetch, hope for the best
  }
};
```

The failure path refetches from the server. If the network is down — which is *why* the request failed — that refetch also fails, and the UI is left showing `ACCEPTED` for a job that was never accepted. The runner drives to a pickup that isn't theirs.

A correct rollback restores the snapshot taken before the mutation, without needing the network:

```javascript
const acceptErrand = async (errandId) => {
  const previous = getCache('/api/errands');          // snapshot first

  mutate('/api/errands', (errands) =>
    errands.map(e => e.id === errandId ? { ...e, status: 'ACCEPTED' } : e),
    false
  );

  try {
    const updated = await api.post(`/errands/${errandId}/accept`);
    mutate('/api/errands', applyServerTruth(updated), false);
  } catch (error) {
    mutate('/api/errands', previous, false);          // deterministic rollback
    toast.error(
      error.status === 409
        ? "Another runner took this job."
        : "Couldn't accept — check your connection."
    );
  }
};
```

The 409 case matters more than it looks. Two runners tapping "Accept" on the same job within a second is routine, not exotic. Exactly one should win, and the loser needs to be told *why* — "another runner took this job" is information; "something went wrong" makes them tap again.

**The rule optimistic UI depends on:** only ever apply it to actions the server will almost certainly accept. Accepting an available job qualifies. Anything involving payment does not — never optimistically show money as moved.

## The state machine belongs on the server

Job status is a state machine: `PENDING → ACCEPTED → IN_TRANSIT → COMPLETED`, with `CANCELLED` reachable from the early states.

The temptation is to let the client drive transitions, since the runner's phone is where events physically happen. Resist it. Clients are not trustworthy — not because runners are malicious, but because phones go offline, retry stale requests, and run old app versions. A client that has been offline for ten minutes will happily push a transition based on a world that has moved on.

The server owns the machine and validates every transition against current state:

```python
TRANSITIONS = {
    "PENDING":    {"ACCEPTED", "CANCELLED"},
    "ACCEPTED":   {"IN_TRANSIT", "CANCELLED"},
    "IN_TRANSIT": {"COMPLETED"},
    "COMPLETED":  set(),
    "CANCELLED":  set(),
}

def transition(errand_id, to_state, actor):
    with db.session.begin():
        errand = (Errand.query
                  .filter_by(id=errand_id)
                  .with_for_update()      # serialise concurrent accepts
                  .one())

        if to_state not in TRANSITIONS[errand.status]:
            raise InvalidTransition(f"{errand.status} -> {to_state}")

        errand.status = to_state
        db.session.add(ErrandEvent(
            errand_id=errand_id, to_state=to_state,
            actor_id=actor.id, at=utcnow(),
        ))
```

`with_for_update()` is what makes concurrent accepts safe: the second request blocks, then re-reads `ACCEPTED`, then fails the transition check and returns 409. That is the 409 the client handles above — the two halves are designed together.

`COMPLETED` and `CANCELLED` are terminal by construction. A delayed retry arriving after completion is rejected rather than resurrecting a finished job.

The `ErrandEvent` log answers "when exactly did this job change hands, and who did it?" — the question every delivery dispute reduces to.

## Role-based authorisation that survives a stolen token

A two-sided marketplace needs hard privilege separation. Clients must not reach runner endpoints; runners must not reach admin endpoints.

Roles live in the JWT and are enforced by a decorator at the API boundary:

```python
def requires_role(*allowed):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if get_jwt().get("role") not in allowed:
                abort(403, description="Insufficient permissions.")
            return f(*args, **kwargs)
        return wrapper
    return decorator

@app.route('/api/v1/runner/jobs')
@jwt_required()
@requires_role('RUNNER', 'ADMIN')
def runner_jobs():
    ...
```

Two things this does *not* give you, which are easy to miss.

**Role is not ownership.** `@requires_role('RUNNER')` confirms the caller is *a* runner, not that they are *this job's* runner. Without an ownership check, any runner can mark any job complete:

```python
if errand.runner_id != current_user.id:
    abort(403)
```

Role checks and ownership checks are different questions and you need both. This is the most common authorisation bug I encounter in marketplace code.

**Claims are frozen at issue time.** A JWT is a signed snapshot. Demote a user or ban an account, and their existing token keeps its old `role` until it expires — the server has no way to revoke a stateless token.

The mitigations are to keep access tokens short-lived (15 minutes, with a refresh token doing the long-lived work) and to check a revocation list on refresh. Then a ban takes effect within one token lifetime instead of whenever the token happens to expire. If you need instant revocation, you need server-side session state; that is the actual trade-off stateless auth is making, and it is worth making deliberately rather than by default.

## What holds it together

Three ideas do most of the work. **The server is the single source of truth** — clients propose, the server decides. **Optimistic UI is a rendering strategy, not a state strategy** — it makes the interface feel instant while the server stays authoritative, and it must roll back without needing the network. **Authorisation asks two questions** — what role is this, and does this actor own this object.

None of it is specific to logistics. It is what any system looks like when the clients are unreliable and the state actually matters.
