---
title: "The Next.js Metadata Bug That Deindexed My Entire Blog"
date: "2026-05-17"
image: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?auto=format&fit=crop&q=80&w=800"
excerpt: "A hardcoded canonical URL in the App Router's root layout quietly told Google every page was a duplicate of the homepage. How metadata inheritance works, and how to verify it."
category: "Web"
tags: ["Next.js", "SEO", "App Router", "Metadata", "Debugging", "Web"]
---

## One line, twelve pages

I had written ten technical articles. Google had indexed none of them.

There was no penalty, no crawl error, no robots directive blocking anything. The sitemap was valid and submitted. Search Console showed the URLs as discovered. They simply were not in the index.

The cause was one line in `app/layout.js`:

```javascript
export const metadata = {
  metadataBase: new URL("https://example.com"),
  alternates: {
    canonical: "https://example.com",   // absolute, in the ROOT layout
  },
};
```

Every page on the site was serving that canonical tag. Every article said, in effect, *"I am a duplicate of the homepage — index that instead."* Google did exactly as instructed.

## How App Router metadata inheritance works

Next.js resolves metadata by walking from the root layout down to the current page and **merging** objects. A child that does not define a field inherits the parent's.

That is convenient for `title` templates and Open Graph defaults. It is a trap for `canonical`, because a canonical URL is inherently page-specific — while every other metadata field has a sensible site-wide default, this one does not.

```
app/layout.js          metadata.alternates.canonical = "https://example.com"
└── app/blog/page.js   (no alternates)  → inherits the homepage canonical
    └── app/blog/[slug]/page.js
                       (no alternates)  → inherits the homepage canonical
```

Nothing warns you. The build succeeds. The pages render. The tag is present and well-formed — it just points at the wrong URL, on every page but one.

## The fix

Two halves, and you need both.

**1. Make the root canonical relative.** With `metadataBase` set, a relative canonical resolves against it:

```javascript
// app/layout.js
export const metadata = {
  metadataBase: new URL("https://example.com"),
  alternates: { canonical: "/" },
};
```

**2. Override it on every route that is not the homepage.** This is the part that actually fixes it — a relative root canonical is still inherited.

```javascript
// app/blog/page.js
export const metadata = {
  title: 'Blog',
  alternates: { canonical: '/blog' },
};
```

```javascript
// app/blog/[slug]/page.js
export async function generateMetadata({ params }) {
  const { slug } = await params;
  return {
    title: post.meta.title,
    alternates: { canonical: `/blog/${slug}` },
  };
}
```

A useful habit: treat `alternates.canonical` as **mandatory on every page**, the way you treat `title`. It is the one metadata field that should never be inherited.

## Verify it, because it fails silently

The reason this survived so long is that nothing in the development loop surfaces it. Canonical tags are invisible in the browser, absent from React DevTools, and never appear in a build warning.

Check the rendered HTML directly:

```bash
for url in / /blog /blog/my-first-post /about; do
  printf "%-28s " "$url"
  curl -s "https://example.com$url" | grep -o '<link rel="canonical"[^>]*>'
done
```

Every line must show its own URL. This takes ten seconds and belongs in your post-deploy checklist.

You can also assert it in the build output, since App Router pages are prerendered to HTML:

```bash
grep -r 'rel="canonical"' .next/server/app --include='*.html' \
  | sed 's/.*href="\([^"]*\)".*/\1/' | sort | uniq -c
```

If one URL appears twelve times, you have this bug.

## What Search Console shows

If it has already happened, the evidence is in **Pages → Why pages aren't indexed**:

- **"Alternate page with proper canonical tag"** — Google saw your canonical and deferred to it. This is the signature.
- **"Duplicate, Google chose different canonical than user"** — Google disagreed with your canonical, which is a different problem.

Ranges of URLs sitting under the first category, all pointing at your homepage, confirm it immediately.

After deploying the fix, recovery is not instant. Google must recrawl each URL, notice the changed canonical, and reindex. Two to four weeks is typical. Requesting indexing for a handful of important URLs speeds up the first few; the rest follow.

## Three related App Router traps

**`metadataBase` missing.** Without it, relative URLs in Open Graph images and canonicals resolve unpredictably, and you get a build warning that is easy to ignore. Set it once in the root layout.

**Client components cannot export metadata.** A page marked `'use client'` silently exports nothing — the `export const metadata` is simply not picked up, with no error. If your homepage is an interactive client component, its metadata must come from the layout, which is exactly how the hardcoded canonical ends up there in the first place.

**`generateMetadata` params are async in Next 15.** `params` is now a Promise. Forgetting to `await` gives you `undefined` interpolated into canonicals and titles — often rendering as the literal string `undefined` in a URL.

## The wider lesson

The bug was one line, and it silently negated months of writing. What made it expensive was not its difficulty but its invisibility: no error, no warning, no visual symptom, and a feedback loop measured in weeks.

That is characteristic of SEO metadata generally. It fails quietly, and the delay between mistake and consequence is long enough that you have stopped looking. The defence is not cleverness — it is a thirty-second `curl` check after every deploy that touches routing or layout.

Verify what the crawler actually receives. It is rarely what you think you configured.
