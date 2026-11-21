'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './house.module.css';

const House = dynamic(() => import('./House'), { ssr: false, loading: () => null });

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Every element outside `el`: the siblings of `el` and of each of its ancestors. */
function coveredBy(el) {
  const out = [];
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    for (const sibling of node.parentElement?.children ?? []) {
      if (sibling !== node && !sibling.hasAttribute('inert') && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(sibling.tagName)) {
        out.push(sibling);
      }
    }
  }
  return out;
}

// The dark layer renders on the server too, so the page never flashes the
// plain content before the house appears. Without WebGL the layer is removed
// and the plain content underneath is the page.
export default function HouseLoader() {
  const [supported, setSupported] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasWebGL()) setSupported(false);
  }, []);

  useEffect(() => {
    if (!supported) return undefined;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    // Everything the house covers (the plain content, the site footer and
    // floating buttons) stays in the page for search engines, but Tab and
    // screen readers must not wander into it. The same content is in the
    // house's room panels.
    const covered = coveredBy(document.getElementById('house'));
    for (const el of covered) el.setAttribute('inert', '');
    return () => {
      root.style.overflow = before;
      for (const el of covered) el.removeAttribute('inert');
    };
  }, [supported]);

  if (!supported) return null;

  return (
    <div id="house" className={styles.root}>
      {/* First in the page, so "Skip to site" is the first thing Tab reaches. */}
      <div className={styles.chrome}>
        <span className={styles.name}>Benny Hinn</span>
        <Link href="/classic" className={styles.skip}>
          Skip to site
        </Link>
      </div>
      <House onReady={() => setReady(true)} />
      <div className={`${styles.curtain} ${ready ? styles.curtainUp : ''}`} aria-hidden="true" />
    </div>
  );
}
