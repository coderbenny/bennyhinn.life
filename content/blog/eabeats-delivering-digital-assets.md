---
title: "Delivering High-Fidelity Digital Assets Securely at Scale"
date: "2026-01-30"
image: "/projects/eabeats.png"
excerpt: "Signed URLs, transcoding pipelines and range requests — how to serve large audio files without your API ever touching the bytes."
category: "Cloud"
tags: ["GCP", "Cloud Storage", "Security", "Celery", "Python", "Media"]
---

![EABeats Official](/projects/eabeats.png)

## Selling bytes instead of boxes

Selling physical goods is a logistics problem. Selling digital goods is a bandwidth and access-control problem, and the failure modes are entirely different.

**EABeats Official** is a marketplace where music producers sell instrumentals. Users stream previews and download high-fidelity WAV and MP3 files. A single WAV master can run 50MB, and the naive architecture — serving that file through your Flask or Node application — fails fast and in a specific way.

Consider what happens. A user on a 3G connection downloads a 50MB file, taking four minutes. For those four minutes, one of your application workers is occupied doing nothing but copying bytes from disk to socket. With Gunicorn running, say, 16 workers, seventeen simultaneous downloads means your entire API — login, search, checkout — is unresponsive. Not slow. Unresponsive.

The failure is not really about bandwidth. It is that a long, slow, I/O-bound transfer is holding a resource sized for short, fast, CPU-bound requests.

## The rule: the API never touches the bytes

The architectural mandate is that the Flask API's only job is to answer *"is this person allowed to have this file?"* Delivery is Google Cloud Storage's job.

The download flow:

1. Client requests a download from the API.
2. API verifies the JWT and confirms in MySQL that the user actually purchased this licence.
3. API generates a short-lived **signed URL** using the GCP SDK.
4. API returns the URL — a few hundred bytes, a few milliseconds.
5. Client downloads directly from Google's edge infrastructure.

```python
from google.cloud import storage
from datetime import timedelta

def generate_download_url(bucket_name, blob_name, filename):
    client = storage.Client()
    blob = client.bucket(bucket_name).blob(blob_name)

    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=15),
        method="GET",
        # Forces a download with a sensible name rather than opening in-browser
        response_disposition=f'attachment; filename="{filename}"',
    )
```

The API request completes in milliseconds regardless of file size, and the worker is immediately free. Bandwidth cost moves to a service designed for it, and the user gets Google's CDN rather than your single region.

### What a signed URL actually protects

A signed URL is a cryptographically signed statement: *this specific object, this method, until this timestamp*. Anyone holding it can use it; nobody can forge or extend it.

That has a precise security consequence worth being clear about. Signed URLs make a leaked link **expire**, which is a meaningful reduction in the value of piracy — a link posted to a forum is dead within 15 minutes. They do **not** prevent the purchaser from downloading the file and uploading it elsewhere. Nothing does. Anyone who tells you otherwise is selling DRM.

Choosing the expiry is a real trade-off. Too long and a leaked link stays useful; too short and a user on a poor connection watches the download die at 80%. Fifteen minutes covers a slow mobile download of a large file while keeping the sharing window impractically narrow. Crucially, expiry governs when the transfer must *start* — a download already in progress continues.

## Previews: transcode, don't stream the master

Preview playback has the opposite requirements to purchase: it must start instantly, it happens far more often, and it must not hand over the asset being sold.

Serving the master WAV for previews would be slow, expensive, and self-defeating. So on upload, a Celery worker produces a preview derivative:

```python
@celery.task(bind=True, max_retries=3)
def transcode_preview(self, source_blob, beat_id):
    try:
        local = download_to_temp(source_blob)
        preview = f"/tmp/{beat_id}_preview.mp3"

        subprocess.run([
            "ffmpeg", "-i", local,
            "-b:a", "128k",           # compressed, adequate for judging a beat
            "-t", "60",               # first 60 seconds only
            "-af", "amix=inputs=2",   # mix in the producer tag
            preview,
        ], check=True, timeout=300)

        upload_to_public_bucket(preview, f"previews/{beat_id}.mp3")
        Beat.query.get(beat_id).update(preview_ready=True)
    except subprocess.CalledProcessError as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
```

Three deliberate choices. **128kbps** is enough to evaluate a beat and not enough to substitute for the purchase. **60 seconds** likewise. **The audio watermark** — the producer tag mixed over the track — is the actual anti-piracy measure, and it is more effective than any URL scheme, because a tagged preview is unusable in a finished song.

Previews live in a genuinely public bucket. They are meant to be shared; that is marketing, not leakage. Masters live in a private bucket reachable only through signed URLs.

Note `timeout=300` on the subprocess. An `ffmpeg` process handed a corrupt upload can hang indefinitely, and a worker stuck on it never picks up another job. Every subprocess call in a worker needs a timeout.

## Range requests, and why the player needs them

One detail that determines whether a preview player feels good: seeking.

When a user drags the scrubber to 0:45, the browser sends `Range: bytes=720000-` rather than re-downloading. The server must answer `206 Partial Content` with just that slice. GCS handles this natively — another thing you get free by not proxying through your own API. A hand-rolled Flask file server almost certainly does not, which is why home-grown audio players so often refuse to seek until fully buffered.

## The generalisable pattern

The specifics are audio, but the shape applies to any large-asset system — video, PDFs, datasets, image libraries:

- **Authorise in your API; deliver from object storage.** Never proxy large files through application workers.
- **Sign URLs with short expiries.** Time-bound access, not permanent links.
- **Derive a cheap public version** for browsing, and keep the valuable original private.
- **Do derivation asynchronously**, with retries and timeouts, never in the request.

The upload path stays slow and asynchronous. The download path stays fast and stateless. Your API stays available while someone in another timezone pulls 50MB over a bad connection — which was the entire problem.
