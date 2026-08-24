---
title: "USSD Session State: Building Menus That Survive a 180-Second Timeout"
date: "2026-02-22"
image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=800"
excerpt: "USSD has no cookies, no local storage, and a hard session timeout. A practical guide to state machines, Redis-backed sessions and the input validation that decides whether users finish your flow."
category: "Telecom"
tags: ["USSD", "Telecom", "Redis", "State Machines", "Python", "Africa"]
---

## Why USSD still matters

If you build for African markets you will eventually build a USSD service. Not because it is pleasant, but because it is the only channel that reaches every phone. No app install, no data bundle, no smartphone — dial `*123#` on a fifteen-year-old feature phone and it works.

For a large share of users across the continent, USSD is not a fallback. It is the primary interface for moving money, checking balances and buying airtime. Which means a USSD menu that loses your session is not a minor annoyance; it is a payment that did not happen.

USSD is also, from an engineering perspective, unusually hostile. Understanding *why* makes the design decisions obvious.

## The three constraints that shape everything

**1. It is completely stateless.** Every user input arrives as an independent HTTP POST from the telecom gateway. No cookies, no local storage, no session affinity. If you do not store state yourself, you have none.

**2. Sessions expire hard.** Typically 90–180 seconds depending on the carrier, and the clock does not reset generously. A user who pauses to find their ID number can lose everything.

**3. The screen is tiny.** Around 182 characters per screen, and no scrolling on many handsets. Menus must fit or they truncate mid-word.

Every design decision below follows from those three.

## The request contract

The gateway POSTs something close to this on every interaction:

```
sessionId=ATUid_a1b2c3
serviceCode=*384*4040#
phoneNumber=+254712345678
text=1*2*5000
```

`text` is the important field, and it is easy to misread. It is **the full history of everything the user has typed this session**, joined by `*`. Not just the latest input.

The response format is minimal and carries control information in its first two characters:

```
CON What would you like to do?
1. Check balance
2. Send money
```

`CON` means "expect more input — keep the session open." `END` closes the session and displays a final message. Getting this wrong is the single most common USSD bug: return `CON` on your final screen and users stare at a dead menu until it times out.

## Two ways to handle `text`, one of them wrong

The tempting approach is to treat `text` as a path and branch on it:

```python
# Do not do this
if text == "":
    return "CON 1. Balance\n2. Send money"
elif text == "1":
    return f"END Your balance is {get_balance(phone)}"
elif text == "2":
    return "CON Enter amount:"
elif text.startswith("2*"):
    amount = text.split("*")[1]
    ...
```

This works for two levels and becomes unmaintainable at four. String-prefix matching on accumulated input is a parser you did not intend to write, and every new menu item multiplies the branches. I have inherited one of these at six levels deep and it was genuinely easier to rewrite than to modify.

The alternative is an explicit state machine with server-side session storage. Parse the *last* input, not the whole path:

```python
def handle(session_id, phone, text):
    session = load_session(session_id) or new_session(phone)
    latest = text.split("*")[-1] if text else ""

    handler = STATES[session["state"]]
    response, next_state = handler(session, latest)

    if response.startswith("CON"):
        session["state"] = next_state
        save_session(session_id, session)
    else:
        clear_session(session_id)

    return response
```

Each state becomes a small, testable function:

```python
def state_send_amount(session, inp):
    if not inp.isdigit():
        return "CON Invalid amount. Enter numbers only:", "SEND_AMOUNT"

    amount = int(inp)
    if amount < 10:
        return "CON Minimum is KES 10. Enter amount:", "SEND_AMOUNT"
    if amount > session["balance"]:
        return f"END Insufficient balance (KES {session['balance']}).", None

    session["amount"] = amount
    return f"CON Send KES {amount} to {session['recipient']}?\n1. Confirm\n2. Cancel", "SEND_CONFIRM"
```

Note that invalid input returns the *same* state. The user gets a corrected prompt and can retry without restarting — and re-prompting rather than aborting is one of the largest completion-rate improvements available in USSD.

## Session storage

Redis is the natural fit: the access pattern is key-value by session ID, and entries should expire on their own.

```python
SESSION_TTL = 180   # match or slightly exceed the carrier timeout

def save_session(session_id, data):
    redis.setex(f"ussd:{session_id}", SESSION_TTL, json.dumps(data))

def load_session(session_id):
    raw = redis.get(f"ussd:{session_id}")
    return json.loads(raw) if raw else None
```

Set the TTL at or slightly above the carrier's timeout. Shorter, and you drop sessions the carrier still considers live — the user sees an unexplained restart. Much longer and you accumulate dead sessions, though the cost is small.

Do not use in-process memory. USSD traffic is spiky, you will run multiple instances behind a load balancer, and consecutive requests in one session routinely land on different instances. A local dict works perfectly in development and fails immediately in production — the worst possible combination.

## Latency is a correctness issue

USSD gateways expect a response in **3–5 seconds**. Miss it and the carrier terminates the session, showing the user a generic network error you cannot customise.

That has a hard consequence: **you cannot do slow work inside a USSD request.** Not a payment API call, not a third-party lookup, not anything whose latency you do not control.

The pattern is to acknowledge and process asynchronously:

```python
def state_send_confirm(session, inp):
    if inp != "1":
        return "END Cancelled.", None

    # Queue it — do not wait for the payment provider
    process_transfer.delay(
        phone=session["phone"],
        recipient=session["recipient"],
        amount=session["amount"],
        idempotency_key=session["session_id"],
    )
    return "END Request received. You'll get an SMS shortly.", None
```

The user gets an immediate close; the SMS delivers the actual outcome. This feels like a downgrade and is the opposite — a definite "we've got it, watch for a text" is far better than a session that dies mid-payment leaving the user unsure whether they were charged.

Passing `session_id` as an idempotency key matters. Carriers do retry, and a retried confirmation must not send money twice.

## Screen budget

182 characters, including the `CON `/`END ` prefix and newlines.

```
CON Send Money
1. To M-PESA
2. To bank
3. To airtime
0. Back
```

That is 58 characters and comfortable. Long option labels, a greeting, and a "reply with the number of your choice" instruction will blow the budget and truncate — mid-word, with no indication anything was cut.

A few habits that help:

- **Number every option, including `0. Back`.** Feature-phone users navigate by digit; there is no other affordance.
- **Never paginate if you can avoid it.** If a list exceeds one screen, add a filter step instead ("Enter first 3 letters of the bank").
- **Put the variable part last.** If a name might be long, ensure truncation eats the name rather than the menu options.

## Testing without a phone

The gateway contract is a plain HTTP POST, so integration tests need no telecom involvement at all:

```python
def test_send_money_flow(client):
    sid = "test-session-1"

    r = post(client, sid, text="")
    assert r.startswith("CON")

    r = post(client, sid, text="2")
    assert "recipient" in r.lower()

    r = post(client, sid, text="2*254712345678")
    assert "amount" in r.lower()

    r = post(client, sid, text="2*254712345678*50000")
    assert "Insufficient" in r          # balance guard fires

def post(client, sid, text):
    return client.post("/ussd", data={
        "sessionId": sid, "phoneNumber": "+254712345678",
        "serviceCode": "*384*4040#", "text": text,
    }).data.decode()
```

Test the error paths hardest — non-numeric input, amounts over balance, timeouts mid-flow, the back option from every state. Those are where real users end up, and unlike a web form there is no browser validation catching anything first.

## The summary

USSD rewards designs that assume the session will be lost. Keep state server-side with a TTL, keep every request under a few seconds by pushing slow work to a queue, re-prompt on bad input instead of aborting, and respect the 182-character screen.

Get those right and you have an interface that works on every phone in the market — which, for a great many users, is the only interface that works at all.
