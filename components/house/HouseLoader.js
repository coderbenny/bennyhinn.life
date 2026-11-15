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
    return () => {
      root.style.overflow = before;
    };
  }, [supported]);

  if (!supported) return null;

  return (
    <div id="house" className={styles.root}>
      <House onReady={() => setReady(true)} />
      <div className={`${styles.curtain} ${ready ? styles.curtainUp : ''}`} aria-hidden="true" />
      <div className={styles.chrome}>
        <span className={styles.name}>Benny Hinn</span>
        <Link href="/classic" className={styles.skip}>
          Skip to site
        </Link>
      </div>
    </div>
  );
}
