---
title: "Subscription Management at Scale: Handling Recurring Payments"
date: "2026-01-28"
image: "/projects/tizi.png"
excerpt: "Subscription lifecycles are a state machine, not a date field. Idempotent webhooks, dunning strategy, proration and the clock-skew bugs that only appear in month eleven."
category: "FinTech"
tags: ["FinTech", "Paystack", "Subscriptions", "Idempotency", "Celery", "Python"]
---

![Tizi Plus Kenya](/projects/tizi.png)

## The hidden complexity of billing

Processing a one-time payment is easy. Managing a recurring subscription across thousands of users is a distributed-systems problem wearing a business-logic costume.

For **Tizi Plus Kenya**, a fitness-tracking and gym subscription platform, users expect uninterrupted access to their plans and gyms expect revenue they can reconcile. Between those two expectations sits a state machine that has to stay correct while payment providers time out, cards expire, and webhooks arrive out of order.

The mistake almost everyone makes first — I made it — is modelling a subscription as a date field. `user.subscription_expires_at`. It looks sufficient. It is not, and it fails in a specific way: it cannot express *why* someone lost access. Was the payment declined? Did they cancel? Is a retry pending? A single timestamp collapses all of those into "expired," and the moment you need to send different emails for different reasons, you are stuck reverse-engineering intent from a date.

## Model it as an explicit state machine

Subscriptions have states and legal transitions between them:

| State | Meaning | Has access? |
|---|---|---|
| `TRIALING` | In a free trial, no charge yet | Yes |
| `ACTIVE` | Paid and current | Yes |
| `PAST_DUE` | Renewal failed, retries in progress | Yes — grace period |
| `CANCELED` | User cancelled; runs to period end | Until period end |
| `EXPIRED` | Retries exhausted or period ended | No |

The transitions that are *allowed* matter as much as the states. `EXPIRED → ACTIVE` requires a fresh payment. `PAST_DUE → ACTIVE` can happen automatically on a successful retry. `CANCELED → ACTIVE` is a reactivation before period end. Anything not in the table is a bug, and encoding that explicitly means an out-of-order webhook produces a loud error instead of quiet corruption:

```python
ALLOWED = {
    "TRIALING": {"ACTIVE", "EXPIRED", "CANCELED"},
    "ACTIVE":   {"PAST_DUE", "CANCELED"},
    "PAST_DUE": {"ACTIVE", "EXPIRED"},
    "CANCELED": {"ACTIVE", "EXPIRED"},
    "EXPIRED":  {"ACTIVE"},
}

def transition(sub, new_state, reason):
    if new_state not in ALLOWED[sub.state]:
        raise IllegalTransition(f"{sub.state} -> {new_state}")
    sub.state = new_state
    SubscriptionEvent.objects.create(
        subscription=sub, to_state=new_state, reason=reason,
    )
```

The `SubscriptionEvent` log is worth the extra table. When a user contends they were charged twice or cut off early, the answer is a query rather than an archaeology project.

## The webhook idempotency guarantee

Payment gateways operate on at-least-once delivery. Paystack will fire `charge.success` when a payment succeeds; it will not promise to fire it only once.

Handled naively, a duplicate `charge.success` extends a subscription by two months instead of one. The fix is to make processing idempotent at the database level:

```python
@app.route('/api/webhooks/paystack', methods=['POST'])
def paystack_webhook():
    raw = request.get_data()
    if not valid_signature(raw, request.headers.get('x-paystack-signature')):
        abort(401)

    event = request.get_json()
    event_id = event['data']['id']

    try:
        with db.session.begin():
            # Unique index on processed_events.event_id does the real work
            db.session.add(ProcessedEvent(event_id=event_id))
            db.session.flush()          # raises now, not at commit
            extend_subscription(event['data'])
    except IntegrityError:
        # Already handled. Acknowledge so the provider stops retrying.
        return jsonify(status="duplicate"), 200

    return jsonify(status="success"), 200
```

Writing the event ID inside the *same transaction* as the business logic is the whole trick. If the subscription update rolls back, so does the idempotency record — the retry will then be processed correctly rather than skipped. Two separate transactions give you a window where the event is marked done but the work never happened, which is the worst outcome of the three.

Note also that a duplicate returns **200**, not an error. A non-2xx tells the provider delivery failed and to try again — so returning `409 Conflict` on a duplicate guarantees more duplicates.

### Webhooks arrive out of order

Less discussed and just as damaging: `charge.success` for a renewal can arrive *after* `subscription.disable` for the same subscription, because they travel independent paths.

Sequence numbers rarely exist, so compare timestamps and refuse to apply stale events:

```python
if event_created_at < sub.state_updated_at:
    return jsonify(status="stale"), 200
```

Without this, a delayed failure webhook can cancel a subscription that has already successfully renewed — and the user, who paid, loses access.

## Dunning: what to do when payment fails

Cards expire. Mobile money accounts run dry. APIs time out. Roughly speaking, a meaningful slice of involuntary churn is nothing to do with intent — the user still wants the product, the charge just didn't go through.

Cutting access at the exact millisecond of expiry converts a temporary payment problem into a cancelled customer. Instead, a failed renewal moves to `PAST_DUE` with access retained, and a nightly Celery sweep retries:

```python
@celery.task
def retry_past_due():
    cutoff = timezone.now() - timedelta(days=3)
    for sub in Subscription.objects.filter(state="PAST_DUE"):
        if sub.past_due_since < cutoff:
            transition(sub, "EXPIRED", reason="dunning_exhausted")
            send_email(sub.user, "subscription_expired")
            continue
        if charge(sub).succeeded:
            transition(sub, "ACTIVE", reason="dunning_recovered")
```

Two things I got wrong initially:

**Retry timing should not be uniform.** Retrying every 24 hours for three days is worse than retrying at increasing intervals — many failures are transient and clear within hours, while others need the user to actually do something. Spreading attempts across the window catches both.

**Retry near the start of the day, not midnight.** Mobile money wallets get topped up in the morning. A 00:05 retry systematically hits the emptiest possible account. This sounds like superstition and is not: moving the sweep produced a visible difference in recovery rate.

## Proration, and the clock-skew bug

When a user upgrades mid-cycle they should pay the difference, not a full new period. The arithmetic is easy:

```
credit = old_plan_price * (days_remaining / days_in_period)
charge = new_plan_price - credit
```

The bug is in `days_remaining`. If your server computes it in UTC while the user's billing anniversary was set in East Africa Time (UTC+3), you are off by three hours — which is invisible for eleven months and then, for a subscription created between 21:00 and 23:59 local time, silently shifts the billing date by a day.

Store billing anchors in UTC, do all arithmetic in UTC, and convert to local time only for display. And use `dateutil.relativedelta` rather than adding 30 days: "one month after 31 January" is a question `timedelta` answers wrongly.

## The pattern underneath

Every hard part of billing turns out to be the same problem in different clothing: **the payment provider's view of reality and yours will diverge, and your system has to be able to reconcile rather than assume.**

Idempotency keys, event logs, explicit state machines, out-of-order handling — they are all mechanisms for surviving that divergence. Build them in early. Retrofitting them onto a `subscription_expires_at` column, with live customers, is a considerably worse week.
