---
title: "Digitizing Trust: Engineering a High-Availability FinTech Platform for Kenyan Chamas"
date: "2026-01-12"
image: "/projects/smartminds.png"
excerpt: "Automating Merry-Go-Round rotations and P2P lending without race conditions — row locking, isolation levels, idempotent M-PESA webhooks and why the ledger is append-only."
category: "FinTech"
tags: ["FinTech", "MySQL", "M-PESA", "Concurrency", "Python", "Idempotency"]
---

![SmartMinds](/projects/smartminds.png)

## The chaos of manual ledgers

In Kenya, informal savings circles known as *chamas* are the backbone of local micro-finance. A group of people contribute a fixed amount on a schedule, and each cycle one member receives the pot — a merry-go-round. Alongside that, members lend to each other peer-to-peer and share dividends at year end.

The whole thing runs on trust, and the record-keeping is usually a physical notebook held by the treasurer. That works until it doesn't. Disputes over who paid what in which month are common, and they are corrosive: the money at stake is often small, but the relationships are not.

**SmartMinds** digitizes this. And when you are dealing with people's money — particularly money pooled between friends and family — "move fast and break things" is the wrong instinct entirely. The system has to be strongly consistent, and it has to be able to *prove* what happened.

## Why the ledger is append-only

The first design decision was to stop storing balances as the source of truth.

The obvious schema has a `wallets` table with a `balance` column that goes up and down. It is simple, it is fast, and it is unsuitable. A mutable balance has no history: when a member says "I paid in March," a single number cannot answer them. Worse, if a bug ever corrupts that number, there is nothing to recompute it from.

Instead, the ledger is append-only. Money movements are immutable rows. Balance is derived.

```sql
CREATE TABLE ledger_entries (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    wallet_id     BIGINT      NOT NULL,
    amount_cents  BIGINT      NOT NULL,  -- signed: credit positive, debit negative
    entry_type    VARCHAR(32) NOT NULL,  -- CONTRIBUTION, PAYOUT, LOAN_OUT, REPAYMENT
    reference     VARCHAR(64) NOT NULL,  -- external txn id, unique per source
    created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uniq_reference (reference),
    KEY idx_wallet_time (wallet_id, created_at)
) ENGINE=InnoDB;
```

Two things are load-bearing here.

**`amount_cents BIGINT`, not a float.** Money is never a floating-point number. `0.1 + 0.2` is not `0.3` in binary floating point, and in a system that sums thousands of contributions those errors accumulate into real discrepancies. Integers of the smallest unit — cents — sidestep it. `DECIMAL` also works; floats do not.

**`UNIQUE KEY uniq_reference`.** This is the idempotency backstop, and it is enforced by the database rather than by application logic. Application-level duplicate checks have a race window between the check and the write. A unique index does not.

A cached balance still exists for read performance, but it is a materialized value, recomputable at any time from the entries. When cache and ledger disagree, the ledger wins.

## Defeating race conditions

Two members attempt to withdraw from the same pool in the same millisecond. Both requests read a balance of KES 10,000. Both see enough funds. Both write. The pool is now overdrawn.

This is a lost-update, and the default behaviour of most ORMs walks straight into it. The fix is to take an explicit row lock so that the second transaction blocks until the first commits:

```python
@transaction.atomic
def process_p2p_loan(lender_id, borrower_id, amount_cents):
    # Lock in a deterministic order to avoid deadlocks (see below)
    first, second = sorted([lender_id, borrower_id])
    wallets = {
        w.user_id: w
        for w in Wallet.objects.select_for_update().filter(user_id__in=[first, second])
    }

    lender = wallets[lender_id]
    borrower = wallets[borrower_id]

    if lender.available_balance_cents < amount_cents:
        raise InsufficientFundsError()

    LedgerEntry.objects.create(
        wallet_id=lender.id, amount_cents=-amount_cents,
        entry_type="LOAN_OUT", reference=f"loan:{loan_id}:out",
    )
    LedgerEntry.objects.create(
        wallet_id=borrower.id, amount_cents=amount_cents,
        entry_type="LOAN_IN", reference=f"loan:{loan_id}:in",
    )
```

`select_for_update()` issues `SELECT ... FOR UPDATE`, holding the row until the transaction ends. The second concurrent request waits, re-reads the now-updated balance, and correctly fails.

### The deadlock that this introduces

Locking two rows creates a new hazard, and it caught me out. If transaction A locks wallet 5 then wants wallet 9, while transaction B locks wallet 9 then wants wallet 5, both wait forever. MySQL detects this and kills one with error 1213.

The fix is the `sorted()` call above: **always acquire locks in a consistent global order**. If every transaction locks the lower wallet ID first, the cycle cannot form. It is one line, and it is easy to lose in a refactor — worth a comment explaining why it is there.

You should still handle 1213, because deadlocks can arise from paths you did not anticipate. Retrying a deadlocked transaction is safe precisely because it was rolled back entirely:

```python
def with_deadlock_retry(fn, attempts=3):
    for attempt in range(attempts):
        try:
            return fn()
        except OperationalError as exc:
            if exc.args[0] != 1213 or attempt == attempts - 1:
                raise
            time.sleep(0.05 * (2 ** attempt))  # brief backoff, then retry
```

### A note on isolation levels

It is tempting to reach for `SERIALIZABLE` and stop thinking about concurrency. In MySQL's InnoDB, `SERIALIZABLE` effectively adds locking to plain reads, which under contention increases lock waits and deadlocks substantially.

In practice `REPEATABLE READ` — InnoDB's default — combined with explicit `SELECT ... FOR UPDATE` on the rows that matter gives the same correctness on the financial paths with far less collateral damage. Be deliberate about which reads need locks rather than making all of them expensive.

## Idempotent M-PESA webhooks

The hardest part of integrating mobile money is not the happy path. It is that providers guarantee *at-least-once* delivery, never *exactly-once*.

A network hiccup on the acknowledgement, and M-PESA will re-fire `PaymentSuccess` for the same transaction — three times in five seconds is not unusual. Handled naively, a KES 1,000 deposit becomes KES 3,000.

The handler treats every webhook as hostile until proven unique:

| Step | Action | Why |
|---|---|---|
| 1 | Verify the signature | Anyone can POST to a public URL |
| 2 | `SETNX lock:<txn_id>` in Redis, 30s TTL | Cheap rejection of concurrent duplicates |
| 3 | Insert ledger entry with `reference = txn_id` | Unique index is the real guarantee |
| 4 | On duplicate-key error, return `200 OK` | Already processed — stop the retries |
| 5 | Return `200` **only** after commit | A `200` before commit loses the payment |

Step 4 is counter-intuitive and important. The instinct on a duplicate is to return an error. Do not. To the provider, a non-2xx means "delivery failed, retry later" — so an error response guarantees the duplicate comes back. Acknowledging it is what makes it stop.

Step 5 is the one that causes silent data loss when you get it wrong. If the handler responds `200` and *then* commits, a crash in between means the provider believes delivery succeeded and will never retry. The payment is gone from your system and settled in theirs. Acknowledge last, always.

The Redis lock is an optimisation, not the correctness mechanism. It cheaply absorbs the thundering herd of near-simultaneous duplicates. But Redis can evict keys and can be unavailable, so it can never be the only defence — the unique index in MySQL is what actually holds the line. Any idempotency scheme that lives solely in a cache is one eviction away from a double credit.

## What this ends up being about

The engineering here — row locks, lock ordering, unique constraints, acknowledgement ordering — is unglamorous, and none of it is visible in the interface.

But the product is trust. A chama treasurer using SmartMinds is putting their reputation among people they see every week on the correctness of the ledger. That is the actual requirement, and it is met at the database layer or not at all.
