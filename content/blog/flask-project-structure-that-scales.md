---
title: "Structuring a Flask App That Outgrows a Single File"
date: "2026-06-28"
image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800"
excerpt: "Application factories, blueprints and the circular-import problem — how to lay out a Flask codebase that stays testable as it grows past a few hundred lines."
category: "Backend"
tags: ["Flask", "Python", "Architecture", "Testing", "Backend", "SQLAlchemy"]
---

## The file that got away

Every Flask project starts as `app.py`. That is the right way to start — the framework's minimalism is the reason to pick it.

The problem arrives around eight hundred lines, when you add a second feature area and discover that importing anything from `app.py` triggers the whole application, including the database connection. Tests become slow and order-dependent. Two developers working on different features conflict on every commit.

The standard fixes are the **application factory** and **blueprints**. Both are well documented; what is documented less clearly is *why* the layout is shaped the way it is, which is mostly about circular imports.

## The circular import problem

The naive structure creates a cycle immediately:

```python
# app.py
from flask import Flask
from models import User          # models needs db...
app = Flask(__name__)
db = SQLAlchemy(app)

# models.py
from app import db               # ...and app needs models. Deadlock.
```

`app` imports `models`, `models` imports `app`. Python raises `ImportError`, and the usual workaround — moving imports to the bottom of the file, or inside functions — works while making the codebase progressively harder to reason about.

The real fix is to create extensions **unbound**, then attach them to an app later:

```python
# extensions.py — imports nothing from your own code
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from celery import Celery

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
celery = Celery()
```

`extensions.py` depends only on third-party packages, so nothing can cycle through it. Everything else imports from here.

## The application factory

Now the app is built by a function rather than existing at import time:

```python
# app/__init__.py
from flask import Flask
from .extensions import db, migrate, jwt
from .config import config_by_name

def create_app(config_name="production"):
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    from .auth.routes import auth_bp
    from .payments.routes import payments_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(payments_bp, url_prefix="/api/payments")

    from .errors import register_error_handlers
    register_error_handlers(app)

    return app
```

Three things this buys you, and the third is the one that matters most day to day.

**Multiple configurations.** `create_app("testing")` gives a real app pointed at a throwaway database. No environment variable juggling, no conditional imports.

**No import-time side effects.** Importing a module no longer opens database connections. Test collection gets dramatically faster.

**Genuinely isolated tests.** Each test gets a fresh application:

```python
@pytest.fixture
def app():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

def test_login_rejects_bad_password(client):
    r = client.post("/api/auth/login",
                    json={"email": "a@b.com", "password": "wrong"})
    assert r.status_code == 401
```

Note the blueprint imports sit *inside* `create_app`, not at module top. Blueprints import models, models import `db` from `extensions` — importing them at module level in `__init__.py` reintroduces a cycle. Deferring them into the function breaks it. This is the one piece of the pattern that looks arbitrary and is not.

## Organise by feature, not by layer

The layout most tutorials show groups by technical role:

```
app/
├── models/          # every model in the system
├── routes/          # every route in the system
└── services/        # every service in the system
```

This works at small scale and ages badly. Adding one feature means touching three directories, and nothing tells you which files belong together.

Grouping by feature keeps related code adjacent:

```
app/
├── __init__.py
├── extensions.py
├── config.py
├── auth/
│   ├── models.py
│   ├── routes.py
│   ├── schemas.py
│   └── service.py
├── payments/
│   ├── models.py
│   ├── routes.py
│   ├── schemas.py
│   ├── service.py
│   └── tasks.py
└── common/
    ├── decorators.py
    └── errors.py
```

Everything about payments lives in one directory. A new developer can read `payments/` and understand payments without touching anything else, and deleting a feature is deleting a folder.

## Keep business logic out of routes

The single highest-leverage habit. A route should parse input, call a service, and serialise output:

```python
# payments/routes.py
@payments_bp.route("", methods=["POST"])
@jwt_required()
def create_payment():
    data = CreatePaymentSchema().load(request.get_json())
    payment = payment_service.create(user_id=current_user_id(), **data)
    return PaymentSchema().dump(payment), 201
```

```python
# payments/service.py — no Flask imports at all
def create(user_id, amount_cents, currency, idempotency_key):
    if amount_cents <= 0:
        raise ValidationError("Amount must be positive")

    with db.session.begin_nested():
        payment = Payment(user_id=user_id, amount_cents=amount_cents, ...)
        db.session.add(payment)
    initiate_charge.delay(payment.id)
    return payment
```

The service has no dependency on the request context, which means it can be called from a route, a Celery task, a management command, or a test — without constructing a fake request. That flexibility arrives free and is genuinely hard to retrofit.

## Configuration as classes

```python
class BaseConfig:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)

class ProductionConfig(BaseConfig):
    SQLALCHEMY_DATABASE_URI = os.environ["DATABASE_URL"]   # required
    SECRET_KEY = os.environ["SECRET_KEY"]

class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SECRET_KEY = "test-only"
```

`os.environ["DATABASE_URL"]` rather than `.get()` is deliberate: a missing production variable should crash at startup, loudly, rather than silently falling back to a development default. Failing at boot is a good outage; connecting to the wrong database is a bad one.

## Celery with the factory pattern

Celery tasks need an application context, which the factory does not automatically provide:

```python
def init_celery(app):
    celery.conf.update(app.config["CELERY"])

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery
```

Without this, every task that touches the database fails with "working outside of application context" — one of the most-searched Flask errors, and this is the fix.

## When to bother

Not immediately. A genuine single-purpose service of 200 lines is fine in one file, and imposing this structure on it is overhead without benefit.

The signals that it is time: you have two distinct feature areas, tests are slow because importing anything imports everything, or you have started moving imports around to dodge circular-import errors. That last one is the clearest — it means the dependency graph has a cycle, and no amount of import reshuffling fixes a cycle. Only inverting the dependency does.
