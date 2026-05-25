import Link from 'next/link';

export default function BlogLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-slate-100 font-sans">
      <nav className="nav-bar relative sticky top-0 z-50">
        <div className="nav-inner flex justify-between items-center max-w-4xl mx-auto px-6 py-4">
          <Link href="/" className="nav-logo hover:opacity-80 transition-opacity">
            BH
          </Link>
          <div className="nav-links-desktop flex gap-6">
            <Link href="/" className="nav-link">
              Portfolio
            </Link>
            <Link href="/blog" className="nav-link active">
              Blog
            </Link>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-32 pb-12">
        {children}
      </main>
    </div>
  );
}
