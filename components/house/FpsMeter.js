'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import styles from './house.module.css';

// A frame-rate readout for testing on real phones and laptops: add ?fps to the
// address. It shows frames per second (averaged over half a second), the
// quality level and the pixel ratio the house is drawing at.

// Read when this module loads, before the house rewrites the address to the
// room's (useSpotHistory). The house only loads in the browser.
const ON = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('fps');

export function useFpsMeter() {
  return ON;
}

/** Inside the canvas: counts frames and writes the readout. */
export function FpsProbe({ level }) {
  const frames = useRef(0);
  const since = useRef(0);
  const dpr = useThree((s) => s.viewport.dpr);
  useFrame(({ clock }) => {
    frames.current += 1;
    const now = clock.elapsedTime;
    if (now - since.current < 0.5) return;
    const fps = Math.round(frames.current / (now - since.current));
    frames.current = 0;
    since.current = now;
    const el = document.getElementById('house-fps');
    if (el) el.textContent = `${fps} fps · ${level} · ${dpr.toFixed(2)}×`;
  });
  return null;
}

/** Outside the canvas: where the readout shows. */
export function FpsBadge() {
  return <output id="house-fps" className={styles.fps} aria-live="off" />;
}
