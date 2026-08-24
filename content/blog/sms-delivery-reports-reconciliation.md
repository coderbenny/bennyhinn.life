---
title: "Why Your SMS Delivery Reports Lie — and How to Reconcile Them"
date: "2026-03-24"
image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800"
excerpt: "DLR states are ambiguous, arrive late, and sometimes never arrive at all. How to build an SMS pipeline whose delivery numbers you can actually defend."
category: "Telecom"
tags: ["SMS", "Telecom", "Reconciliation", "Observability", "Python", "Africa"]
---

## The number on your dashboard is probably wrong

Every bulk SMS provider gives you a delivery rate. Mine said 97%. The client's users said they were not getting messages.

Both were true, and understanding why that is possible is most of what you need to know about SMS delivery reporting.

An SMS traverses several independent systems: your application, an aggregator, one or more carriers, and finally the handset. Each hop reports success on its own terms, and "delivered" at one hop means something different at the next. The number on your dashboard is whatever your immediate upstream told you, which is not the same as a message arriving on a phone.

## What DLR states actually mean

Delivery reports arrive asynchronously with a status. The names look self-explanatory and are not:

| Status | What it usually means | What it does not mean |
|---|---|---|
| `ACCEPTED` / `SUBMITTED` | Aggregator took the message | Nothing about the carrier or handset |
| `SENT` | Handed to the carrier | Not delivered — merely passed on |
| `DELIVERED` | Carrier says it reached the handset | Not that the user saw it, or that the carrier is honest |
| `FAILED` | Explicit failure with a code | The code may be generic and uninformative |
| `EXPIRED` | Validity period elapsed while retrying | Often a phone off for hours — commonly retriable |
| `UNKNOWN` | No report arrived in time | Might have been delivered. You do not know. |

The trap is counting `SENT` as success. It is a *handoff*, not a delivery, and on some routes the gap between them is large. If your dashboard says 97% and your users disagree, this is the first thing to check.

The second trap is `UNKNOWN`. Providers frequently roll these into "delivered" or omit them entirely, which is how a reported 97% coexists with a real rate closer to 85%.

## Store the state machine, not the latest status

An SMS has a lifecycle, and overwriting a `status` column throws away the history you need when a client asks what happened to a specific message.

```sql
CREATE TABLE messages (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient     VARCHAR(20)  NOT NULL,
    body_hash     CHAR(64)     NOT NULL,   -- hash, not body: PII minimisation
    provider      VARCHAR(32)  NOT NULL,
    provider_ref  VARCHAR(64),             -- their id, for support tickets
    status        VARCHAR(16)  NOT NULL DEFAULT 'QUEUED',
    submitted_at  TIMESTAMP    NULL,
    final_at      TIMESTAMP    NULL,
    UNIQUE KEY uniq_provider_ref (provider, provider_ref),
    KEY idx_status_time (status, submitted_at)
);

CREATE TABLE message_events (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id  BIGINT      NOT NULL,
    status      VARCHAR(16) NOT NULL,
    error_code  VARCHAR(16),
    received_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    raw         JSON,
    KEY idx_message (message_id, received_at)
);
```

The events table is what lets you answer "when did this change, and what did the provider actually say?" — including the raw payload, which you will want the first time a provider disputes your numbers.

`body_hash` rather than the body itself is deliberate: SMS content frequently contains OTPs, names and transaction details. Storing hashes lets you deduplicate and correlate without retaining message content indefinitely.

## Delivery reports arrive out of order

This surprises people. You can receive `DELIVERED` and then `SENT` for the same message, because the reports travel independent paths with different latencies.

Applying them blindly regresses the state. Guard with an explicit rank:

```python
RANK = {"QUEUED": 0, "SUBMITTED": 1, "SENT": 2,
        "DELIVERED": 3, "FAILED": 3, "EXPIRED": 3}

def apply_dlr(message, status, error_code=None, raw=None):
    MessageEvent.create(message_id=message.id, status=status,
                        error_code=error_code, raw=raw)

    if RANK[status] < RANK[message.status]:
        return                       # stale report, log it, do not apply

    message.status = status
    if RANK[status] == 3:
        message.final_at = utcnow()
```

Always record the event; only sometimes advance the status. Terminal states share rank 3 so a late `SENT` can never un-deliver a delivered message.

## The sweeper for messages that never resolve

Some messages never receive a final report. Without intervention they sit at `SENT` forever, quietly inflating your pending count and hiding real failures.

```python
@celery.task
def sweep_stale_messages():
    cutoff = utcnow() - timedelta(hours=48)
    stale = Message.query.filter(
        Message.status.in_(["SUBMITTED", "SENT"]),
        Message.submitted_at < cutoff,
    )
    for msg in stale:
        result = provider.query_status(msg.provider_ref)   # if supported
        if result and result.is_final:
            apply_dlr(msg, result.status, raw=result.raw)
        else:
            apply_dlr(msg, "UNKNOWN")
```

48 hours is a reasonable cutoff for most carriers' validity windows. The important discipline is that `UNKNOWN` is reported as its own category — never folded into delivered, never quietly dropped. An honest 88% delivered / 9% unknown / 3% failed is far more useful than a confident 97%, because it tells you where to investigate.

## Reconciling against the provider

Your records and your provider's will diverge. Pull their report daily and compare on `provider_ref`:

```python
@celery.task
def reconcile_provider_report(day):
    theirs = provider.fetch_report(day)          # list of (ref, status)
    ours = {m.provider_ref: m for m in Message.query.filter_by(day=day)}

    for ref, their_status in theirs:
        mine = ours.get(ref)
        if mine is None:
            Discrepancy.create(kind="MISSING_LOCALLY", ref=ref)
        elif mine.status != their_status:
            Discrepancy.create(kind="STATUS_MISMATCH", ref=ref,
                               ours=mine.status, theirs=their_status)

    for ref in set(ours) - {r for r, _ in theirs}:
        Discrepancy.create(kind="MISSING_AT_PROVIDER", ref=ref)
```

`MISSING_AT_PROVIDER` is the one to watch. It means you believe you sent something the provider has no record of — a message that silently evaporated, and one you are likely being billed for.

This reconciliation is also your commercial position. When a provider's invoice and your sent count disagree, the party with per-message records and a documented process is the one whose numbers hold up.

## Practical things that move the real rate

Beyond measurement, a few operational details make a measurable difference:

**Sender ID registration.** Unregistered alphanumeric sender IDs are filtered aggressively on many African networks. This is frequently the entire explanation for a route that reports `SENT` and delivers nothing.

**Message length.** Over 160 GSM-7 characters, a message splits into concatenated parts, each billed and each able to fail independently. A single emoji or curly quote forces UCS-2 encoding and drops the limit to 70 — which is how a message that fits in testing costs triple in production. Normalise smart quotes and dashes before sending.

**Time of day.** Bulk sends at peak hours queue behind carrier congestion. The same batch at 06:00 often clears faster.

**Per-carrier breakdown.** Aggregate rates hide the actual problem. One underperforming carrier route can drag a 95% overall rate down while three others are fine — and you cannot see it, or renegotiate it, without splitting the numbers by carrier.

## What this buys you

The point is not a prettier dashboard. It is being able to say, with evidence, *"we submitted 40,000 messages, 35,200 confirmed delivered, 3,600 unknown, 1,200 failed — and of the failures, 900 were on one carrier route."*

That sentence is actionable. "97% delivery" is not, and when a client tells you their users are not receiving messages, it leaves you with nothing to investigate.
