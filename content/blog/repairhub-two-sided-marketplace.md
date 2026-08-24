---
title: "Designing a Two-Sided Electronics Marketplace: The Architecture of Repairhub"
date: "2026-01-25"
image: "/projects/repairhub.png"
excerpt: "Ratings as immutable events, Redis geospatial matching, and the cold-start problem that no amount of schema design will solve for you."
category: "Marketplaces"
tags: ["Marketplaces", "MySQL", "Redis", "Geospatial", "Schema Design", "Python"]
---

![Repairhub](/projects/repairhub.png)

## The gig-economy database dilemma

Building a gig-economy app like **Repairhub** — which connects clients with vetted electronics technicians — is not a catalogue problem. In e-commerce, inventory is a countable thing sitting in a warehouse. Here, inventory is *human time*, it expires continuously whether used or not, location constrains who can fulfil what, and trust is the currency that makes any of it work.

Those four properties break most of the assumptions baked into a standard product schema.

## Schema design: the rating engine

The naive approach to ratings puts a `rating_average` float on the technician row and updates it whenever a review arrives.

It is wrong for three separate reasons:

1. **It destroys the audit trail.** When a technician disputes their rating, a single float cannot tell you which jobs produced it.
2. **It is a lost-update waiting to happen.** Two concurrent reviews both read the old average, both compute a new one, and one silently overwrites the other.
3. **It cannot be recomputed.** If a bug corrupts the value, or you need to exclude reviews from a banned account, there is nothing to rebuild from.

Ratings are therefore immutable events:

```sql
CREATE TABLE reviews (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    job_id        INT      NOT NULL,
    client_id     INT      NOT NULL,
    technician_id INT      NOT NULL,
    score         TINYINT  NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment       TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_job_review (job_id),
    KEY idx_tech_time (technician_id, created_at)
);
```

`UNIQUE KEY unique_job_review (job_id)` is the important line. One completed job yields exactly one review, enforced by the database. A client cannot review the same job twice, and — more importantly — a technician cannot be review-bombed by a client creating fake jobs, because a review requires a `job_id` that reached completion.

The aggregate lives in a separate cache column updated asynchronously after the review commits, never as part of the same request. Reads are fast; the events remain the source of truth.

### Why a simple average is the wrong statistic

The subtler problem is that averaging is a bad way to rank people, and this took me longer to appreciate than it should have.

A technician with one 5-star review has an average of 5.0. A technician with two hundred reviews averaging 4.8 is *obviously* the safer booking, and any ranking that sorts on raw average puts the newcomer first. The average is not wrong — it is just an estimate with an enormous confidence interval, and treating it as equivalent to a well-evidenced 4.8 throws away everything you know about sample size.

The standard correction is a Bayesian prior: start every technician with a number of "virtual" reviews at the platform mean, which real reviews gradually outweigh.

```python
GLOBAL_MEAN = 4.3    # platform-wide average
PRIOR_WEIGHT = 10    # how many reviews before the prior stops dominating

def bayesian_rating(sum_scores, count):
    return (GLOBAL_MEAN * PRIOR_WEIGHT + sum_scores) / (PRIOR_WEIGHT + count)
```

One 5-star review now yields roughly 4.36 — better than average, not implausibly perfect. Two hundred reviews at 4.8 yield about 4.78, essentially unaffected. The ranking finally reflects confidence, not just position.

## The matching algorithm

When a client requests a screen repair for a Samsung S23, the system must find technicians who are qualified for Samsung devices, currently online, and within about 10km.

The third condition is the expensive one. Geospatial queries in stock MySQL mean a Haversine calculation per row, which is fine at a hundred technicians and unacceptable at ten thousand. Worse, technician locations change constantly — writing every GPS ping to MySQL turns your primary database into a firehose of updates on rows nobody reads except during matching.

So live location does not live in MySQL. It lives in Redis, which has geospatial indexing built on sorted sets:

```python
# Technician opens the app / sends a heartbeat
redis_client.geoadd("technicians:live", (longitude, latitude, technician_id))
redis_client.expire("technicians:live", 300)   # stale locations age out

# Client requests a repair
nearby = redis_client.geosearch(
    "technicians:live",
    longitude=client_lon,
    latitude=client_lat,
    radius=10,
    unit="km",
    sort="ASC",
    withdist=True,
)
```

The matching pipeline then intersects the two datasets — fast spatial results from Redis, durable qualification and rating data from MySQL:

| Stage | Source | Purpose |
|---|---|---|
| 1. Radius filter | Redis `GEOSEARCH` | Cut 10,000 technicians to ~40 |
| 2. Qualification filter | MySQL (cached) | Samsung-certified only |
| 3. Availability check | Redis set | Not currently on a job |
| 4. Rank | Bayesian rating + distance | Best realistic match first |

Ordering matters: the cheapest, most selective filter runs first. Reversing stages 1 and 2 means fetching qualifications for every technician in the country to then discard almost all of them.

### The failure mode I did not plan for

Redis is not durable by default, and the first time the cache restarted during business hours, `technicians:live` came back empty. Every search returned zero results. The app was not down — it was worse than down, because it confidently reported that there were no technicians anywhere.

Two fixes. First, degrade rather than fail: if the live index is empty, fall back to last-known locations from MySQL (written on a slow heartbeat, roughly every few minutes) and mark those results as approximate. Stale data beats an empty screen. Second, treat an empty index as an alert condition — "zero results platform-wide" is never a legitimate state, and it should page someone rather than silently render.

## The problem architecture cannot solve

Here is the honest part. All of the above assumes technicians exist to match.

Every two-sided marketplace starts with neither side present, and clients will not come for an empty technician list while technicians will not join for absent demand. No schema fixes this. Repairhub's early growth came from manually recruiting technicians in a small number of Nairobi neighbourhoods and deliberately refusing to serve requests outside them — a dense, working marketplace in three suburbs rather than an empty one across the city.

The engineering only starts mattering once liquidity exists. Building the sophisticated matching pipeline before you have anyone to match is the most common way to spend six months solving a problem you do not have yet.

## What generalises

Three ideas here transfer to any marketplace: **store events and derive aggregates**, so you can always recompute and always explain; **put volatile data in the volatile store** and durable data in the durable one, rather than forcing one database to do both jobs badly; and **rank by confidence, not by raw score**, because sample size is information you already have and throwing it away makes your ranking worse.
