---
title: "MySQL or PostgreSQL: Choosing on Constraints Rather Than Vibes"
date: "2026-08-02"
image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&q=80&w=800"
excerpt: "Both are excellent and the differences that matter are narrower than the internet suggests. The specific features that should actually decide it, from someone who has shipped on both."
category: "Databases"
tags: ["MySQL", "PostgreSQL", "Databases", "SQL", "Architecture", "Schema Design"]
---

## Starting honestly

Most MySQL-versus-PostgreSQL arguments are proxies for team familiarity, and that is a legitimate reason to choose. A team fluent in one will ship faster and operate more safely than the same team fighting an unfamiliar system for a marginal technical edge.

So: **if your team knows one well and has no specific requirement pointing elsewhere, use that one.** The rest of this is about the requirements that genuinely should override that default.

I have shipped production systems on both. The differences that matter are fewer than the internet suggests — and sharper.

## Where PostgreSQL wins decisively

### Exclusion constraints

If you build anything involving reservations — venues, rooms, vehicles, appointments, staff shifts — this is close to decisive.

Preventing overlapping bookings in MySQL means taking a row lock, querying for conflicts, then inserting. It works, but correctness depends on every code path remembering to lock. One endpoint added later without `FOR UPDATE` silently reintroduces double-booking.

PostgreSQL enforces it structurally:

```sql
CREATE EXTENSION btree_gist;

ALTER TABLE bookings ADD CONSTRAINT no_overlap
EXCLUDE USING gist (
    room_id WITH =,
    tsrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status = 'CONFIRMED');
```

No application code can violate this, from any path, ever. Having debugged a double-booking incident caused by exactly the missing-lock scenario, I consider this the single most compelling reason to pick PostgreSQL.

### Partial and expression indexes

Index only the rows you query:

```sql
CREATE INDEX idx_pending ON orders (created_at) WHERE status = 'PENDING';
```

If pending orders are 0.5% of the table, this index is a fraction of the size of the full one and considerably faster. MySQL 8 has functional indexes but no partial indexes — you index every row whether you query it or not.

### `JSONB` and real JSON indexing

Both databases store JSON. PostgreSQL's `JSONB` is a parsed binary representation supporting GIN indexes:

```sql
CREATE INDEX idx_meta ON events USING gin (metadata jsonb_path_ops);
SELECT * FROM events WHERE metadata @> '{"source": "ussd"}';
```

That query uses the index. MySQL requires generating a virtual column per queried path and indexing that — workable when you know the paths ahead of time, awkward when you do not.

### Transactional DDL

In PostgreSQL, schema changes are transactional. A migration that fails halfway rolls back entirely.

In MySQL, DDL commits implicitly. A migration that adds three columns and fails on the third leaves two applied — and now your rollback script has to figure out which. Anyone who has recovered a half-applied production migration at midnight understands why this matters.

## Where MySQL holds its own

### Replication that is genuinely simpler

MySQL replication is mature, well understood, and straightforward to set up. Read replicas are close to a solved problem, with abundant operational documentation and every managed provider supporting them trivially.

PostgreSQL's streaming replication is solid but has more moving parts, and the connection-pooling story is less forgiving — which leads to the next point.

### Connection handling

PostgreSQL allocates a process per connection, which is expensive. A few hundred connections is real memory pressure, and serverless or high-concurrency deployments hit this quickly. You will need PgBouncer, and PgBouncer in transaction-pooling mode disables prepared statements and session-level features, which surprises people mid-project.

MySQL's thread-per-connection model handles high connection counts more gracefully out of the box. This is a genuine operational advantage, and it is under-discussed.

### Ubiquity in shared hosting

In many markets — including much of East Africa — affordable shared hosting means cPanel, and cPanel means MySQL. If your deployment target is a modest VPS or shared plan, MySQL is frequently the path of least resistance. That is not a technical argument; it is a real constraint.

## Differences that are usually overstated

**Performance.** For typical web workloads, well-indexed queries on either database will be fast, and badly-indexed queries on either will be slow. Your schema and indexes dominate the engine choice by a wide margin. Benchmarks showing one dramatically ahead are almost always measuring a workload that is not yours.

**MySQL's "loose" typing.** Real historically, largely fixed. Modern MySQL defaults to strict mode and rejects invalid dates and out-of-range values. If you are still citing `0000-00-00`, you are describing a configuration from a decade ago.

**Feature counts.** PostgreSQL has more features. Most projects use a small fraction of either.

## A practical decision procedure

Choose **PostgreSQL** if any of these apply:

- Bookings, reservations or scheduling — exclusion constraints
- Heavy JSON querying with unpredictable access paths
- Geospatial work beyond simple radius search — PostGIS is unmatched
- Analytical queries — window functions and CTEs are stronger
- You want transactional migrations

Choose **MySQL** if:

- Your team knows it and nothing above applies
- You need very high connection counts without a pooler
- Your deployment target is shared hosting or cPanel
- You are inheriting a MySQL codebase — migrating for feature parity is rarely worth it

## The advice that actually matters

Whichever you choose, the things that will determine whether your database is fast and correct are the same on both:

**Index what you filter, join and sort on.** Most slow queries are a missing index, not the wrong engine.

**Use the right types.** Money is integers or `DECIMAL`, never floats. Timestamps are UTC with timezone awareness. Enums beat free-text status columns.

**Enforce invariants in the database.** Foreign keys, unique constraints, check constraints. Application-level validation has race conditions; constraints do not.

**Read your query plans.** `EXPLAIN` is available on both and is the fastest route from "this is slow" to "this is why."

Teams that do those four things ship well on either. Teams that skip them struggle on both — and no engine choice rescues a schema without indexes.
