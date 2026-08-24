---
title: "M-PESA STK Push: A Practical Daraja Integration Guide"
date: "2026-03-08"
image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&q=80&w=800"
excerpt: "Working through Safaricom's Daraja API end to end — auth token caching, the password derivation everyone gets wrong, callback handling, and the reconciliation job you cannot skip."
category: "FinTech"
tags: ["M-PESA", "Daraja", "Payments", "Python", "Flask", "Africa"]
---

## What STK Push actually is

If you are taking payments in Kenya, you are integrating M-PESA, and most likely **STK Push** — formally Lipa Na M-PESA Online. The user enters their phone number on your site, a PIN prompt appears on their handset, they enter their PIN, and the money moves.

From the user's side it is the smoothest payment method available. From the integrator's side, Safaricom's Daraja API has a handful of sharp edges that are poorly documented and produce confusing errors. This is the walkthrough I wanted when I started.

The mental model that saves the most time: **STK Push is asynchronous.** Your API call does not return a payment result. It returns "a prompt has been sent." The actual outcome arrives later at your callback URL — or, sometimes, not at all. Every design decision follows from that.

## Authentication and token caching

Every request needs an OAuth bearer token, obtained with your consumer key and secret:

```python
import base64, requests, time

_token_cache = {"value": None, "expires_at": 0}

def get_access_token():
    if _token_cache["value"] and time.time() < _token_cache["expires_at"] - 60:
        return _token_cache["value"]

    creds = base64.b64encode(f"{CONSUMER_KEY}:{CONSUMER_SECRET}".encode()).decode()
    r = requests.get(
        f"{BASE_URL}/oauth/v1/generate?grant_type=client_credentials",
        headers={"Authorization": f"Basic {creds}"},
        timeout=10,
    )
    r.raise_for_status()
    data = r.json()

    _token_cache["value"] = data["access_token"]
    _token_cache["expires_at"] = time.time() + int(data["expires_in"])
    return _token_cache["value"]
```

Tokens last about an hour. Fetching a fresh one per transaction is a wasted round-trip on your critical path and will eventually get you rate-limited. Cache it, and refresh 60 seconds early — the margin matters because a token that expires between your check and Safaricom's validation produces a `401` that looks like a credentials problem and is not.

In a multi-process deployment, put the cache in Redis rather than module state, or every Gunicorn worker maintains its own.

## The password derivation

This is where most integrations stall. The `Password` field is not your account password. It is a base64 encoding of three concatenated values:

```python
from datetime import datetime

def stk_password(shortcode, passkey):
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    raw = f"{shortcode}{passkey}{timestamp}"
    return base64.b64encode(raw.encode()).decode(), timestamp
```

Three things go wrong here, all producing unhelpful errors:

- **The timestamp must match the one in the request body.** Generating it twice — once for the password, once for the payload — gives you two different values a second apart, and the request is rejected. Return both from one function, as above.
- **The format is exactly `YYYYMMDDHHmmss`.** No separators, no timezone suffix, 24-hour clock.
- **Use East Africa Time.** If your server runs UTC, `datetime.now()` is three hours off and Safaricom rejects it as stale. Set the container timezone explicitly, or construct the timestamp in `Africa/Nairobi` — do not leave it to the host.

## Sending the prompt

```python
def initiate_stk_push(phone, amount, account_ref, order_id):
    password, timestamp = stk_password(SHORTCODE, PASSKEY)

    payload = {
        "BusinessShortCode": SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),                  # integer KES only
        "PartyA": normalize_phone(phone),       # 2547XXXXXXXX
        "PartyB": SHORTCODE,
        "PhoneNumber": normalize_phone(phone),
        "CallBackURL": f"{PUBLIC_URL}/api/mpesa/callback",
        "AccountReference": account_ref[:12],
        "TransactionDesc": f"Order {order_id}",
    }

    r = requests.post(
        f"{BASE_URL}/mpesa/stkpush/v1/processrequest",
        json=payload,
        headers={"Authorization": f"Bearer {get_access_token()}"},
        timeout=30,
    )
    return r.json()
```

Field-level traps worth internalising:

**`Amount` must be a whole number.** Daraja rejects decimals. `1500.00` fails; `1500` works. Round before you send.

**Phone format is `2547XXXXXXXX`.** No `+`, no leading `0`, no spaces. Users type all three, so normalise:

```python
def normalize_phone(raw):
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("0"):    digits = "254" + digits[1:]
    elif digits.startswith("7"):  digits = "254" + digits
    elif digits.startswith("+"):  digits = digits[1:]
    if not re.fullmatch(r"254[17]\d{8}", digits):
        raise ValueError(f"Invalid Kenyan number: {raw}")
    return digits
```

**`AccountReference` is short** — around 12 characters, and it is what the customer sees on their statement. An opaque UUID here makes your support queue worse; use something recognisable.

**The callback URL must be public HTTPS.** No localhost, no self-signed certificates. In development, tunnel it.

## Handling the callback

The response to your push request only confirms the prompt was sent. The result arrives here:

```python
@app.route("/api/mpesa/callback", methods=["POST"])
def mpesa_callback():
    body = request.get_json()["Body"]["stkCallback"]
    checkout_id = body["CheckoutRequestID"]
    result_code = body["ResultCode"]

    payment = Payment.query.filter_by(checkout_id=checkout_id).one_or_none()
    if payment is None:
        log.warning("callback for unknown checkout %s", checkout_id)
        return jsonify(ResultCode=0, ResultDesc="Accepted"), 200

    if payment.status != "PENDING":
        return jsonify(ResultCode=0, ResultDesc="Accepted"), 200   # duplicate

    if result_code == 0:
        items = {i["Name"]: i.get("Value") for i in body["CallbackMetadata"]["Item"]}
        payment.mark_paid(
            receipt=items["MpesaReceiptNumber"],
            amount=items["Amount"],
            paid_at=items["TransactionDate"],
        )
    else:
        payment.mark_failed(code=result_code, desc=body["ResultDesc"])

    db.session.commit()
    return jsonify(ResultCode=0, ResultDesc="Accepted"), 200
```

Four rules for this handler:

1. **Always return `200` with `ResultCode: 0`.** This acknowledges receipt. Anything else and Safaricom retries — including for duplicates you have already handled.
2. **Be idempotent.** The `status != "PENDING"` guard is what stops a retried callback double-crediting an order. Back it with a unique index on `MpesaReceiptNumber`.
3. **The metadata is a list of name/value dicts, not an object.** Convert it before reading, as above.
4. **Commit before responding.** Acknowledge only after the write is durable, or a crash between the two loses a payment you have told Safaricom you received.

Result codes worth handling distinctly: `0` success, `1` insufficient funds, `1032` cancelled by user, `1037` timeout — the user never responded to the prompt. Those last two are common and benign; treating them as errors produces noisy alerting for ordinary user behaviour.

## The callback that never comes

Here is the part that separates a demo from a production integration.

**Callbacks get lost.** Your server restarts mid-delivery, a deploy takes the endpoint down for a moment, or the network hiccups. The user pays, and your database says `PENDING` forever. They have been charged and have nothing to show for it.

Two defences.

**Query the status directly.** Daraja exposes `stkpushquery` for exactly this — poll a few times after the prompt for payments still pending:

```python
@celery.task
def verify_pending_payment(payment_id, attempt=1):
    payment = Payment.query.get(payment_id)
    if payment.status != "PENDING":
        return

    result = query_stk_status(payment.checkout_id)
    if result.get("ResultCode") == "0":
        payment.mark_paid_from_query(result)
    elif attempt < 5:
        verify_pending_payment.apply_async(
            args=[payment_id, attempt + 1], countdown=30 * attempt
        )
    else:
        payment.mark_for_manual_review()
```

**Reconcile daily.** A scheduled job pulls the account statement and matches it against your records. Anything present at Safaricom and missing from your database is flagged. This is your last line of defence, and it is not optional — over enough transactions, some callback will be lost, and the only alternative to reconciliation is a customer telling you.

## Testing

The sandbox behaves differently from production in ways that will surprise you. It accepts only its own test credentials, uses a fixed test phone number, and — most misleadingly — is considerably more forgiving about timestamp drift. Code that works in sandbox and fails in production is very often a timezone bug the sandbox tolerated.

Test the paths that actually occur: user cancels the prompt, user ignores it until timeout, insufficient funds, callback arrives twice, callback never arrives. The happy path will work on your first afternoon. These are what your support burden is made of.

## The short version

Cache the token. Build the password and timestamp together in East Africa Time. Normalise phone numbers ruthlessly. Make the callback idempotent and always answer `200`. And build the reconciliation job before you launch, not after the first customer tells you their money vanished.
