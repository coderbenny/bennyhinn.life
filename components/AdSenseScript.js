'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

// Google AdSense, loaded after hydration so it never blocks the first paint.
// Not on the home page: the 3D house has no ads in it. (A visitor who comes
// to the house from another page already has the script; the house hides
// what it would place, see HouseLoader.)
export default function AdSenseScript() {
  const path = usePathname();
  if (path === '/') return null;
  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4090506137434256"
    />
  );
}
