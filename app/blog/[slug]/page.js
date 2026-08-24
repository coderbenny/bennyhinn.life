import {
  getPostBySlug,
  getPostSlugs,
  getRelatedPosts,
  markdownToHtml,
  AUTHOR,
} from '@/lib/markdown';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ShareButton from '@/components/ShareButton';

export async function generateStaticParams() {
  const slugs = getPostSlugs();
  return slugs
    .filter((slug) => slug.endsWith('.md'))
    .map((slug) => ({ slug: slug.replace(/\.md$/, '') }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: 'Post Not Found' };
  }

  const url = `https://bennyhinn.life/blog/${slug}`;
  const defaultImage = 'https://bennyhinn.life/benny-logo.jpeg';
  const imageUrl = post.meta.image
    ? post.meta.image.startsWith('http')
      ? post.meta.image
      : `https://bennyhinn.life${post.meta.image}`
    : defaultImage;

  return {
    title: post.meta.title,
    description: post.meta.excerpt,
    keywords: post.meta.tags,
    authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: post.meta.title,
      description: post.meta.excerpt,
      url,
      type: 'article',
      publishedTime: post.meta.date,
      modifiedTime: post.meta.updated || post.meta.date,
      authors: [AUTHOR.name],
      tags: post.meta.tags,
      siteName: 'Benny Hinn Mathew',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: post.meta.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.meta.title,
      description: post.meta.excerpt,
      images: [imageUrl],
    },
  };
}

export default async function BlogPost({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return notFound();
  }

  const contentHtml = await markdownToHtml(post.content);
  const related = getRelatedPosts(slug, 3);
  const url = `https://bennyhinn.life/blog/${slug}`;
  const imageUrl = post.meta.image
    ? post.meta.image.startsWith('http')
      ? post.meta.image
      : `https://bennyhinn.life${post.meta.image}`
    : 'https://bennyhinn.life/benny-logo.jpeg';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: post.meta.title,
    description: post.meta.excerpt,
    image: [imageUrl],
    datePublished: post.meta.date,
    dateModified: post.meta.updated || post.meta.date,
    author: {
      '@type': 'Person',
      name: AUTHOR.name,
      url: AUTHOR.url,
      jobTitle: AUTHOR.jobTitle,
      sameAs: AUTHOR.sameAs,
    },
    publisher: {
      '@type': 'Person',
      name: AUTHOR.name,
      url: 'https://bennyhinn.life',
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: post.meta.tags.join(', '),
    articleSection: post.meta.category,
    inLanguage: 'en',
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bennyhinn.life' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://bennyhinn.life/blog' },
      { '@type': 'ListItem', position: 3, name: post.meta.title, item: url },
    ],
  };

  return (
    <article className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-slate-500">
        <Link href="/" className="hover:text-[#ff6b6b] transition-colors">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:text-[#ff6b6b] transition-colors">Blog</Link>
      </nav>

      <div className="mb-8">
        {post.meta.category && (
          <span className="inline-block px-3 py-1 rounded-full bg-[#ff6b6b]/10 text-[#ff6b6b] text-[10px] font-bold tracking-widest uppercase border border-[#ff6b6b]/20 mb-4">
            {post.meta.category}
          </span>
        )}

        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-slate-100 leading-tight">
          {post.meta.title}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2a2a2a] pb-8 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff6b6b] to-[#ffa500] flex items-center justify-center text-white font-bold text-sm shrink-0">
              BH
            </div>
            <div className="text-sm leading-tight">
              <Link href="/about" className="text-slate-200 font-semibold hover:text-[#ff6b6b] transition-colors block">
                {AUTHOR.name}
              </Link>
              <span className="text-slate-500 text-xs">{AUTHOR.jobTitle} &middot; Nairobi, Kenya</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-xs font-mono text-slate-400 leading-tight">
              <time dateTime={post.meta.date} className="block">
                {new Date(post.meta.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              <span className="text-slate-500">{post.meta.readingTime} min read</span>
            </div>
            <ShareButton title={post.meta.title} url={`/blog/${post.slug}`} />
          </div>
        </div>
      </div>

      <div className="markdown-prose" dangerouslySetInnerHTML={{ __html: contentHtml }} />

      {post.meta.tags?.length > 0 && (
        <div className="mt-12 pt-8 border-t border-[#2a2a2a] flex flex-wrap gap-2">
          {post.meta.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1.5 rounded-full bg-[#141414] border border-[#2a2a2a] text-slate-400 text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <aside className="mt-12 p-6 rounded-3xl bg-gradient-to-b from-[#141414] to-[#0a0a0a] border border-[#2a2a2a]">
        <h2 className="text-lg font-bold text-slate-100 mb-2">About the author</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          {AUTHOR.name} is a VAS and full-stack engineer in Nairobi, Kenya, working on telecom
          value-added services, AI workflows and marketplace platforms. Everything published here is
          drawn from systems he has built and operated in production.{' '}
          <Link href="/about" className="text-[#ff6b6b] hover:underline">Read more</Link> or{' '}
          <Link href="/contact" className="text-[#ff6b6b] hover:underline">get in touch</Link>.
        </p>
      </aside>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-slate-100 mb-6">Related reading</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="block p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] hover:border-[#ff6b6b] transition-colors group"
              >
                <span className="block text-[10px] font-mono text-[#ffb733] mb-2">
                  {r.meta.readingTime} min read
                </span>
                <span className="block text-sm font-semibold text-slate-200 group-hover:text-[#ff6b6b] transition-colors leading-snug">
                  {r.meta.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 pt-8 border-t border-[#2a2a2a]">
        <Link href="/blog" className="text-[#ff6b6b] hover:underline text-sm font-semibold uppercase tracking-wider">
          &larr; All articles
        </Link>
      </div>
    </article>
  );
}
