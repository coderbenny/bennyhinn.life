---
title: "Geospatial Queries and Conflict Resolution in Booking Systems"
date: "2026-02-02"
image: "/projects/gemify.png"
excerpt: "Handling 50+ unique venues requires robust search and availability logic. Implementing efficient geospatial queries in MySQL and preventing double-booking using database locks."
---

![Gemify Africa](/projects/gemify.png)

## The Math Behind Marketplace Search

When a user opens **Gemify Africa**, they are looking for a venue for their event based on precise parameters: location proximity, date availability, and capacity constraints. 

Querying a database to say `SELECT * FROM venues WHERE city = 'Nairobi'` is easy. Querying to say "Find me venues within 5km of these coordinates that have no conflicting bookings on December 15th between 2 PM and 6 PM" is a different beast entirely.

## Geospatial Optimization

To calculate distances on a sphere (the Earth), you traditionally use the Haversine formula. However, running a Haversine calculation on every row in a database during a user search leads to massive O(n) latency spikes.

Instead, we utilize MySQL's native Spatial Data Types and Spatial Indexes (R-Trees). We store the venue coordinates as `POINT` geometries:

```sql
ALTER TABLE venues ADD COLUMN location POINT SRID 4326;
CREATE SPATIAL INDEX idx_location ON venues(location);
```

When a user searches within a radius, the database uses the index to instantly filter out venues outside the bounding box, before doing any complex distance math. This dropped our search latency from ~800ms down to ~45ms.

## Preventing the Double-Booking Disaster

The worst possible user experience on a booking platform is securing a venue, paying for it, and arriving to find out someone else booked the same slot.

In a highly concurrent environment, two users might hit the "Confirm Booking" button at the exact same millisecond. 

To solve this, we rely on **Pessimistic Locking** combined with **Range Overlap Logic**. 

Before committing a booking, the system initiates an explicit transaction and attempts to acquire a lock on the venue row:

```sql
START TRANSACTION;

-- 1. Lock the venue row
SELECT id FROM venues WHERE id = ? FOR UPDATE;

-- 2. Check for overlapping time ranges
SELECT COUNT(*) FROM bookings 
WHERE venue_id = ? 
AND status = 'CONFIRMED'
AND start_time < ? -- requested_end_time
AND end_time > ?; -- requested_start_time

-- 3. If count is 0, insert and commit
INSERT INTO bookings (...) VALUES (...);

COMMIT;
```

If the `COUNT(*)` returns anything greater than zero, the transaction rolls back, and the second user receives an immediate "Slot no longer available" error. This guarantees that double-booking is mathematically impossible at the database level.
