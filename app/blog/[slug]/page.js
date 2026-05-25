import { getPostBySlug, getPostSlugs, markdownToHtml } from '@/lib/markdown';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ShareButton from '@/components/ShareButton';

export async function generateStaticParams() {
  const slugs = getPostSlugs();
  return slugs.map((slug) => ({
    slug: slug.replace(/\.md$/, ''),
  }));
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
    ? (post.meta.image.startsWith('http') ? post.meta.image : `https://bennyhinn.life${post.meta.image}`)
    : defaultImage;

  return {
    title: post.meta.title,
    description: post.meta.excerpt,
    openGraph: {
      title: post.meta.title,
      description: post.meta.excerpt,
      url: url,
      type: 'article',
      publishedTime: post.meta.date,
      authors: ['Benny Hinn Mathew'],
      siteName: 'Benny Hinn Mathew',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.meta.title,
        },
      ],
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

  return (
    <article className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href="/blog" className="text-[#ff6b6b] hover:underline text-sm font-semibold uppercase tracking-wider mb-8 inline-block">
          ← Back to Blog
        </Link>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-slate-100 mt-4 leading-tight">
          {post.meta.title}
        </h1>
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-8 mb-8">
          <time dateTime={post.meta.date} className="text-slate-400 font-mono text-sm block">
            {new Date(post.meta.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </time>
          <ShareButton title={post.meta.title} url={`/blog/${post.slug}`} />
        </div>
      </div>

      <div 
        className="markdown-prose"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </article>
  );
}
