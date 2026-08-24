---
title: "Geospatial Queries and Conflict Resolution in Booking Systems"
date: "2026-02-02"
image: "/projects/gemify.png"
excerpt: "Spatial indexes, the bounding-box trap, half-open time intervals, and why a UNIQUE constraint beats application-level double-booking checks."
category: "Databases"
tags: ["MySQL", "Geospatial", "Concurrency", "Booking", "Schema Design", "SQL"]
---

![Gemify Africa](/projects/gemify.png)

## The math behind marketplace search

When a user opens **Gemify Africa** they are looking for an event venue under three simultaneous constraints: near a location, free on a date, big enough for their guests.

`SELECT * FROM venues WHERE city = 'Nairobi'` is trivial. "Find venues within 5km of these coordinates with no conflicting booking on 15 December between 14:00 and 18:00" is a different query entirely — and both halves of it, the spatial part and the temporal part, have a naive implementation that works in development and falls over in production.

## Geospatial: don't compute distance per row

The textbook answer for distance on a sphere is the Haversine formula. The textbook implementation runs it in the `WHERE` clause:

```sql
-- The version that does not scale
SELECT *, (6371 * acos(cos(radians(?)) * cos(radians(lat)) * ...)) AS distance
FROM venues
HAVING distance < 5;
```

This is a full table scan with trigonometry on every row. No index can help, because the value being filtered is computed at query time. At 200 venues it is imperceptible. At 50,000 it is a timeout.

MySQL has native spatial types backed by R-tree indexes, which is the right tool:

```sql
ALTER TABLE venues ADD COLUMN location POINT SRID 4326 NOT NULL;
CREATE SPATIAL INDEX idx_location ON venues(location);
```

`SRID 4326` is not optional decoration — it declares the coordinate system as WGS 84, the one GPS uses. Without it MySQL treats coordinates as abstract Cartesian points and `ST_Distance` returns degrees rather than metres, which produces answers that look plausible and are wrong.

```sql
SELECT id, name,
       ST_Distance_Sphere(location, ST_SRID(POINT(?, ?), 4326)) AS metres
FROM venues
WHERE ST_Distance_Sphere(location, ST_SRID(POINT(?, ?), 4326)) <= 5000
ORDER BY metres
LIMIT 20;
```

Two traps worth knowing.

**Argument order.** `POINT(x, y)` is `POINT(longitude, latitude)` — longitude first. Latitude-first is the convention humans use, and swapping them puts Nairobi in the Indian Ocean. It is the single most common spatial bug.

**The bounding box is a rectangle.** Index-assisted spatial filtering narrows candidates by rectangle before exact distance runs. That is precisely why it is fast, but it means the pre-filter includes corner regions outside your circle. The exact `ST_Distance_Sphere` predicate still has to run on the survivors — the index makes it cheap, it does not make it unnecessary.

## Booking: intervals are harder than they look

Time ranges are where booking systems quietly break, and it starts with an off-by-one that has real consequences.

If a booking runs 14:00–16:00 and another runs 16:00–18:00, do they conflict? Almost always the answer should be no — one ends as the other begins. But whether your query agrees depends entirely on your comparison operators.

The fix is to treat intervals as **half-open**: `[start, end)`, inclusive of start, exclusive of end. Then two intervals overlap if and only if:

```
existing.start < requested.end  AND  existing.end > requested.start
```

Strictly less-than on both sides. Adjacent bookings do not collide; genuinely overlapping ones always do. This one predicate is the whole of interval conflict detection, and it is worth writing a test for every boundary case — abutting before, abutting after, exact match, full containment, partial overlap on each side.

## Preventing double-booking

Now the concurrency problem. Two users hit "Confirm" in the same millisecond. Both queries check for conflicts. Both find none, because neither has committed yet. Both insert.

Checking-then-inserting is never safe on its own, no matter how careful the check. There are two real fixes.

**Pessimistic locking** takes a lock on the venue before checking, forcing the second request to wait:

```sql
START TRANSACTION;

SELECT id FROM venues WHERE id = ? FOR UPDATE;

SELECT COUNT(*) FROM bookings
WHERE venue_id = ?
  AND status = 'CONFIRMED'
  AND start_time < ?   -- requested_end
  AND end_time   > ?;  -- requested_start

-- if count = 0
INSERT INTO bookings (...) VALUES (...);
COMMIT;
```

This works, and it is what Gemify runs. It serialises bookings per venue, which is acceptable because contention on a single venue is naturally low.

But note the weakness: correctness depends on every code path remembering to take the lock. A future endpoint that inserts a booking without `FOR UPDATE` reintroduces the bug, and nothing will warn you.

**The database-enforced version** removes that risk. On PostgreSQL, an exclusion constraint makes overlap structurally impossible:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings ADD CONSTRAINT no_overlap
EXCLUDE USING gist (
    venue_id WITH =,
    tsrange(start_time, end_time, '[)') WITH &&
) WHERE (status = 'CONFIRMED');
```

No application code can violate this, from any path, ever. `'[)'` is the half-open interval from above, declared to the database. MySQL has no direct equivalent, which is a genuine point in PostgreSQL's favour for booking workloads — if I were starting Gemify again, this alone would drive the choice.

A middle option in MySQL: if bookings align to fixed slots, a `UNIQUE KEY (venue_id, slot_start)` gets you database-level enforcement for free. It only works for discrete slots, not arbitrary ranges, but where it fits it is far more robust than a lock you have to remember.

## Combining both halves

The full search runs cheap-and-selective first:

| Stage | Cost | Typical reduction |
|---|---|---|
| Spatial index filter | Very low | 50,000 → ~300 |
| Capacity filter | Low | ~300 → ~120 |
| Availability check | Higher — joins bookings | ~120 → ~40 |
| Exact distance sort | Low on 40 rows | order the result |

Running availability first would mean scanning the bookings table for venues on the wrong side of the city. Order of operations is most of the performance work.

## What to take away

Booking systems fail in two characteristic ways, and both are avoidable. **Distance filters that compute per row** cannot use an index — store real geometry and let the R-tree do its job. **Check-then-insert** is a race condition with a delay before it bites — push the guarantee into the database, via a lock at minimum and a constraint if your engine supports one.

Neither is exotic. Both are the difference between a booking system that works and one that occasionally sells the same room twice.
