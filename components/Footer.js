import Link from 'next/link';

const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="border-t border-[#2a2a2a] bg-[#0a0a0a] text-slate-400">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-6">
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href="/" className="hover:text-[#ff6b6b] transition-colors">Portfolio</Link>
          <Link href="/blog" className="hover:text-[#ff6b6b] transition-colors">Blog</Link>
          <Link href="/about" className="hover:text-[#ff6b6b] transition-colors">About</Link>
          <Link href="/contact" className="hover:text-[#ff6b6b] transition-colors">Contact</Link>
          <Link href="/privacy-policy" className="hover:text-[#ff6b6b] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#ff6b6b] transition-colors">Terms of Use</Link>
        </div>

        <p className="text-xs leading-relaxed max-w-2xl text-slate-500">
          Written and maintained by Benny Hinn Mathew, a software engineer based in Nairobi, Kenya.
          Articles reflect first-hand experience building and operating the systems described.
          Reach the site owner at{' '}
          <a href="mailto:info@bennyhinn.life" className="text-slate-400 hover:text-[#ff6b6b] transition-colors">
            info@bennyhinn.life
          </a>.
        </p>

        <p className="text-xs text-slate-600">
          &copy; {YEAR} Benny Hinn Mathew. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
