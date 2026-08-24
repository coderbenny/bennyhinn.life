---
title: "LLM Workflows in Healthcare: Processing 50,000+ Monthly Transactions Safely"
date: "2026-01-18"
image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800"
excerpt: "RAG grounding, deterministic output guardrails, PII redaction before inference, and why the safest LLM feature is the one that knows when to escalate to a human."
category: "AI"
tags: ["LLM", "RAG", "Healthcare", "Python", "Guardrails", "Architecture"]
---

## The hype versus the reality

Building a medical chatbot in a Jupyter notebook takes a weekend. Deploying one behind **50,000+ monthly telecom and healthcare transactions**, without leaking Patient Health Information or dispensing hallucinated medical advice, is a different discipline entirely.

At **Zuri Health** the goal was never to replace clinicians. It was to build an LLM-driven triage and workflow engine that routes patients faster while staying inside compliance boundaries. That framing does most of the safety work: a system that *routes* has a bounded output space, while a system that *advises* does not.

## Grounding: RAG, and its actual limits

You cannot let a model draw on generic pre-training in a clinical context. Every response is grounded in a curated, medically-vetted corpus through retrieval-augmented generation.

The pipeline, in order:

| Stage | What happens | Why it exists |
|---|---|---|
| 1. Ingest | Patient message via WhatsApp/SMS | Entry point |
| 2. Redact | Strip names, phone numbers, ID numbers | PII must not reach the model |
| 3. Embed & retrieve | Semantic search over vetted docs | Ground the answer in real sources |
| 4. Generate | LLM sees *only* retrieved context | Constrain the answer space |
| 5. Guardrail | Deterministic output checks | Catch what the model got wrong |
| 6. Route | Answer, or escalate to a human | Failure has a safe destination |

Stage 2 comes before stage 3 deliberately. Redaction has to happen before anything leaves your infrastructure — once a message containing a patient's name has been sent to an inference provider, no downstream control undoes that.

It is worth being precise about what RAG does and does not fix. It substantially reduces fabrication by giving the model real source material, and it makes answers auditable — you can show which document produced a claim. **It does not eliminate hallucination.** A model handed correct context can still misread it, blend two documents, or state something the source hedges. RAG narrows the failure distribution; it does not truncate it. Anyone treating retrieval as a solved-hallucination checkbox has skipped the interesting part.

Which is why stage 5 exists.

## Deterministic guardrails

The output checker is not another model. It is boring, explicit code — and that is the point, because a probabilistic check on a probabilistic system compounds uncertainty rather than reducing it.

```python
ESCALATE_PATTERNS = [
    r"\b(prescri\w+|dosage|mg\b|take \d+)",   # medication instructions
    r"\b(diagnos\w+|you have|it is likely)",   # diagnostic claims
    r"\b(chest pain|bleeding|unconscious)",    # emergency indicators
]

def guardrail(response: str, retrieved_docs: list, confidence: float):
    if any(re.search(p, response, re.I) for p in ESCALATE_PATTERNS):
        return Escalate("clinical_content_detected")

    if not retrieved_docs or confidence < CONFIDENCE_FLOOR:
        return Escalate("insufficient_grounding")

    if not sentences_supported_by(response, retrieved_docs):
        return Escalate("unsupported_claim")

    return Allow(response)
```

Emergency indicators escalate immediately and unconditionally. Someone describing chest pain should reach a human in seconds, and no amount of retrieval quality changes that.

The design principle underneath: **the guardrail fails closed.** Missing context, low confidence, an unparseable response, an inference timeout — every one of those routes to a human. The expensive failure is a wrong answer delivered confidently; a handoff is merely slower.

## Decoupling AI from the transactional core

LLM inference takes seconds. Database queries take milliseconds. Putting them in the same process is how a traffic spike takes down your platform: inference calls occupy workers and connection-pool slots for orders of magnitude longer than normal requests, and once the pool is exhausted, *everything* fails — including the endpoints that have nothing to do with AI.

The AI layer is therefore an isolated microservice behind a message queue:

1. The telecom gateway receives an SMS, writes it to a queue, returns immediately.
2. The AI service consumes it, runs redaction, retrieval, inference and guardrails.
3. The result goes to an outbound queue that the gateway dispatches back.

The failure isolation is the real benefit. When the inference provider is rate-limiting or slow, messages accumulate in a queue instead of exhausting connections. Patients wait longer for AI-assisted responses; appointment booking, payments and record lookups are entirely unaffected. Degradation is confined to the degraded component.

That also means the queue needs a depth alarm. A silently growing backlog is the failure mode where everything looks healthy and patients are waiting twenty minutes for a reply.

## Timeouts, and the fallback that must exist

Every inference call has a hard timeout, and every timeout has a defined destination:

```python
try:
    response = await asyncio.wait_for(
        llm.generate(prompt, context=docs), timeout=8.0
    )
except asyncio.TimeoutError:
    metrics.increment("llm.timeout")
    return escalate_to_human(message, reason="inference_timeout")
```

Eight seconds is a product decision, not a technical one: past that, an SMS conversation feels broken, and a human handoff genuinely serves the patient better than a late machine answer.

The rule generalises — **every AI call needs a non-AI fallback.** If the honest answer to "what happens when the model is unavailable?" is "the feature breaks," the feature is not production-ready. Here the fallback is a queue and a person, which is slower and completely safe.

## What safety actually looked like

The lesson that surprised me is how little of this work was about the model. Prompt engineering and model selection were perhaps a fifth of the effort. The rest was the scaffolding around it: redaction before egress, deterministic post-checks, queue isolation, timeouts, escalation paths, and audit logs that let a clinician reconstruct why a given response was sent.

Deploying AI in healthcare is not about finding the smartest model. It is about building infrastructure where the model being wrong is an anticipated, contained, observable event rather than a patient-facing incident.
