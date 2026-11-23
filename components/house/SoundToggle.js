'use client';

import { useEffect, useState } from 'react';
import { isMuted, onMutedChange, setMuted } from './sound';
import styles from './house.module.css';

/** The mute button in the corner, always on screen. */
export default function SoundToggle() {
  // Starts unmuted on the server; the real setting is read once in the browser.
  const [muted, setState] = useState(false);
  useEffect(() => {
    setState(isMuted());
    return onMutedChange(setState);
  }, []);
  return (
    <button type="button" className={styles.soundToggle} aria-pressed={muted} onClick={() => setMuted(!muted)}>
      {/* The name stays "Mute"; aria-pressed and the icon say whether it is on. */}
      <span aria-hidden="true">{muted ? '🔇' : '🔈'}</span> Mute
    </button>
  );
}
