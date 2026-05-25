import Link from 'next/link';
import Image from 'next/image';
import { getAllPosts } from '@/lib/markdown';
import ShareButton from '@/components/ShareButton';

export const metadata = {
  title: 'Blog | Benny Hinn Mathew',
  description: 'Writings on software engineering, AI, scalable systems, and DevOps.',
  openGraph: {
    title: 'Blog | Benny Hinn Mathew',
    description: 'Thoughts, technical deep dives, and reflections on building scalable software and AI systems.',
    url: 'https://bennyhinn.life/blog',
    siteName: 'Benny Hinn Mathew',
    images: [
      {
        url: '/benny-logo.jpeg',
        width: 1200,
        height: 630,
        alt: 'Benny Hinn Mathew Blog',
      },
    ],
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | Benny Hinn Mathew',
    description: 'Thoughts, technical deep dives, and reflections on building scalable software and AI systems.',
    images: ['/benny-logo.jpeg'],
  },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-[#ff6b6b] to-[#ffa500] text-transparent bg-clip-text">
          MY BLOG
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl">
          Thoughts, technical deep dives and reflections on building scalable software and AI systems.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {posts.length === 0 ? (
          <p className="text-slate-500 col-span-full">No posts published yet.</p>
        ) : (
          posts.map((post, index) => {
            const isFeatured = index === 0;
            return (
              <article 
                key={post.slug} 
                className={`group flex flex-col ${isFeatured ? 'md:flex-row md:col-span-2' : ''} gap-6 items-start p-6 rounded-3xl bg-gradient-to-b from-[#141414] to-[#0a0a0a] border border-[#2a2a2a] hover:border-[#ff6b6b] hover:shadow-[0_0_30px_rgba(255,107,107,0.05)] transition-all duration-500 overflow-hidden relative`}
              >
                {post.meta.image && (
                  <div className={`relative w-full ${isFeatured ? 'md:w-1/2 md:h-64' : 'h-48'} shrink-0 rounded-2xl overflow-hidden bg-[#1a1a1a] shadow-xl`}>
                    <Image 
                      src={post.meta.image} 
                      alt={post.meta.title}
                      fill
                      sizes={isFeatured ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 33vw"}
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60 group-hover:opacity-30 transition-opacity duration-500" />
                  </div>
                )}
                <div className={`flex-1 flex flex-col justify-between w-full h-full ${isFeatured ? 'py-4' : ''}`}>
                  <div>
                    <div className="flex items-center justify-between gap-x-4 text-xs mb-4">
                      <time dateTime={post.meta.date} className="text-[#ffb733] font-mono tracking-wider font-semibold">
                        {new Date(post.meta.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </time>
                      {isFeatured && (
                        <span className="px-3 py-1 rounded-full bg-[#ff6b6b]/10 text-[#ff6b6b] text-[10px] font-bold tracking-widest uppercase border border-[#ff6b6b]/20">
                          Latest Release
                        </span>
                      )}
                    </div>
                    <div className="group relative">
                      <h3 className={`${isFeatured ? 'text-2xl md:text-4xl' : 'text-xl md:text-2xl'} font-bold leading-tight text-slate-100 group-hover:text-[#ff6b6b] transition-colors duration-300 mb-4`}>
                        <Link href={`/blog/${post.slug}`}>
                          <span className="absolute inset-0 z-20" />
                          {post.meta.title}
                        </Link>
                      </h3>
                      <p className={`line-clamp-3 text-sm leading-relaxed text-slate-400 ${isFeatured ? 'md:text-base md:line-clamp-4' : ''}`}>
                        {post.meta.excerpt}
                      </p>
                    </div>
                  </div>
                  <div className="mt-8 flex items-center justify-between w-full relative z-30">
                    <div className="flex items-center gap-2 text-slate-300 group-hover:text-[#ff6b6b] text-sm font-bold uppercase tracking-wider transition-colors duration-300">
                      Read Article 
                      <span className="transform group-hover:translate-x-2 transition-transform duration-300 ease-out">→</span>
                    </div>
                    <ShareButton title={post.meta.title} url={`/blog/${post.slug}`} />
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
