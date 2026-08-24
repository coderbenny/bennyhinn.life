import Link from 'next/link';

const NAV = [
  { href: '/', label: 'Portfolio' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function PageShell({ title, intro, updated, children, active }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-slate-100 font-sans">
      <nav className="nav-bar relative sticky top-0 z-50">
        <div className="nav-inner flex justify-between items-center max-w-4xl mx-auto px-6 py-4">
          <Link href="/" className="nav-logo hover:opacity-80 transition-opacity">
            BH
          </Link>
          <div className="nav-links-desktop flex gap-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active === item.href ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 pt-32 pb-12">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-[#ff6b6b] to-[#ffa500] text-transparent bg-clip-text">
            {title}
          </h1>
          {intro && (
            <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">{intro}</p>
          )}
          {updated && (
            <p className="text-slate-500 text-sm font-mono mt-4">Last updated: {updated}</p>
          )}
        </header>
        <div className="markdown-prose">{children}</div>
      </div>
    </div>
  );
}
