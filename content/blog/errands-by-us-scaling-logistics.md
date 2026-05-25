---
title: "Scaling Logistics: Real-Time State Management in a Delivery Platform"
date: "2026-01-22"
image: "/projects/errands.png"
excerpt: "Building a reliable logistics dashboard using Next.js 16. Focus on state synchronization and secure JWT-based role authorization for Errands By Us."
---

![Errands By Us](/projects/errands.png)

## The Complexity of Moving Parts

Logistics platforms are deceptively complex. On the surface, it's just "Point A to Point B." Under the hood, it involves real-time location tracking, state machine transitions (Pending → Accepted → In Transit → Completed), and dual-sided user interfaces that must stay perfectly synchronized.

For **Errands By Us**, Kenya's premier errand agency, the goal was to build a system that manages these moving parts flawlessly using **Next.js 16** and a **Flask** backend.

## State Machines and Optimistic UI

When an errand runner accepts a job, the client needs to see that status update immediately. Relying entirely on server-roundtrips for UI updates creates a sluggish experience, especially on unreliable mobile networks.

We adopted an **Optimistic UI** pattern on the frontend using React Server Components and SWR/React Query. When an action is taken, the UI updates instantly, while the mutation happens asynchronously in the background.

```javascript
// Optimistic update example for accepting an errand
const acceptErrand = async (errandId) => {
  // 1. Optimistically update the UI cache
  mutate('/api/errands', (currentErrands) => {
    return currentErrands.map(e => e.id === errandId ? { ...e, status: 'ACCEPTED' } : e);
  }, false);

  try {
    // 2. Perform the actual network request
    await api.post(`/errands/${errandId}/accept`);
    // 3. Revalidate to ensure server state matches
    mutate('/api/errands');
  } catch (error) {
    // 4. Rollback on failure
    toast.error("Failed to accept errand. Rolling back.");
    mutate('/api/errands'); // Fetches the true previous state
  }
}
```

## Securing the Edges: Role-Based JWT Auth

A two-sided marketplace requires absolute separation of privileges. A standard user must never be able to access the endpoints meant for an errand runner, and runners must not access administrative endpoints.

We implemented a strict Role-Based Access Control (RBAC) system deeply integrated into our JWT payload structure. 

```json
{
  "sub": "user_98765",
  "role": "RUNNER",
  "exp": 1716739200,
  "iat": 1716735600
}
```

At the Flask API gateway, custom decorators intercept every request, unpack the JWT, and enforce boundary constraints *before* the application logic even executes:

```python
def requires_role(required_role):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            claims = get_jwt()
            if claims.get("role") != required_role:
                abort(403, description="Insufficient permissions.")
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.route('/api/v1/runner/jobs', methods=['GET'])
@jwt_required()
@requires_role('RUNNER')
def get_runner_jobs():
    pass
```

By enforcing permissions strictly at the API boundary and embracing optimistic UI on the client, Errands By Us achieved over 500+ successful errands with a 98% client satisfaction rate.
