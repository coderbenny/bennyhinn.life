---
title: "Designing a Two-Sided Electronics Marketplace: The Architecture of Repairhub"
date: "2026-01-25"
image: "/projects/repairhub.png"
excerpt: "Dissecting the backend routing and database schema design for dynamic rating systems and real-time gig-economy job matching."
---

![Repairhub](/projects/repairhub.png)

## The Gig Economy Database Dilemma

Building a gig-economy app like **Repairhub**—which connects clients with vetted electronics technicians—presents a unique set of database challenges. It is not a traditional e-commerce catalog. Inventory is human time, location matters, and trust is the ultimate currency.

To establish this trust, the platform needed a bulletproof real-time matching algorithm and a robust, tamper-proof rating system.

## Schema Design: The Rating Engine

A naive approach to user ratings involves simply updating a `rating_average` float on the `Technician` table every time a new review comes in. 

*Why is this bad?* 
Because it destroys the audit trail, makes historical tracking impossible, and is highly susceptible to concurrent write overwrites (race conditions).

Instead, we treat ratings as immutable event logs (Event Sourcing pattern) in MySQL.

```sql
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    client_id INT NOT NULL,
    technician_id INT NOT NULL,
    score TINYINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_job_review (job_id)
);
```

To prevent the frontend from doing heavy aggregations on the fly, we utilize database triggers (or asynchronous Celery tasks) to update a materialized view or cached aggregate only *after* a review is permanently written.

## The Matching Algorithm

When a client requests a screen repair for a Samsung S23, the system must instantly find technicians who:
1. Are qualified for Samsung devices.
2. Are currently online and available.
3. Fall within a 10km radius.

Doing geospatial queries in standard MySQL can be a performance nightmare. We utilized **Redis Geospatial Indexes** to maintain the real-time location of active technicians.

```python
# When a technician opens the app, update their location in Redis
redis_client.geoadd("technicians_locations", longitude, latitude, technician_id)

# When a client requests a repair, query a 10km radius
nearby_technicians = redis_client.georadius(
    "technicians_locations", 
    client_longitude, 
    client_latitude, 
    10, 
    unit="km"
)
```

By intersecting the fast Redis spatial results with the cached MySQL qualification data, Repairhub achieves sub-50ms job matching latency, ensuring clients are paired with the best possible technician almost instantaneously.
