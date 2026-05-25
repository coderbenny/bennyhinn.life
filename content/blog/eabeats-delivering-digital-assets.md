---
title: "Delivering High-Fidelity Digital Assets Securely at Scale"
date: "2026-01-30"
image: "/projects/eabeats.png"
excerpt: "Handling 1,000+ daily transactions involving large audio files. Covering GCP storage optimization, signed URLs, and streaming performance."
---

![EABeats Official](/projects/eabeats.png)

## The E-Commerce Challenge of Digital Assets

Selling physical goods involves logistics; selling digital goods involves bandwidth and security. **EABeats Official** is a marketplace for music producers to sell their instrumentals. With 1,000+ daily transactions and users streaming high-fidelity WAV and MP3 files globally, the architecture had to be bulletproof.

If you serve 50MB audio files directly from your application server (like Node.js or Flask), your network I/O will bottleneck instantly, and your server will crash under concurrent load.

## The Solution: GCP Cloud Storage and Signed URLs

The primary architectural mandate was that our Flask API should **never** touch the actual bytes of the audio files during download. The API's only job is authentication and authorization. 

We offloaded all bandwidth heavy-lifting to Google Cloud Storage (GCS). 

When a user attempts to download a beat they just purchased:
1. The client requests a download from the API.
2. The API verifies the JWT and queries the MySQL database to confirm the user actually purchased the license.
3. The API generates a **Signed URL** using the GCP SDK.
4. The API returns the URL to the client.
5. The client downloads the file directly from Google's edge caching CDN.

```python
from google.cloud import storage
import datetime

def generate_download_signed_url_v4(bucket_name, blob_name):
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    # URL is only valid for 15 minutes to prevent link sharing piracy
    url = blob.generate_signed_url(
        version="v4",
        expiration=datetime.timedelta(minutes=15),
        method="GET",
    )
    return url
```

### Defeating Piracy While Maintaining Speed

Because the signed URLs expire in 15 minutes, users cannot share the download links on forums or Discord servers. If the link leaks, it becomes useless almost immediately. 

Furthermore, for the streaming preview player on the Next.js frontend, we do not serve the full high-fidelity WAV files. When a producer uploads a beat, a background Celery worker automatically transcodes a heavily compressed, watermarked 128kbps MP3 version and saves it to a public GCS bucket. 

This guarantees that users can stream previews instantly without buffering, while the pristine master files remain tightly locked behind IAM policies and cryptographic signatures.
