'use client';

import { useRef } from 'react';
import useDialogFocus from './useDialogFocus';
import styles from './house.module.css';

/**
 * The one content panel every room uses: a sheet on the right on wide
 * screens, from the bottom on phones. The scene stays visible beside it.
 */
export default function RoomPanel({ title, onClose, children }) {
  const dialog = useRef(null);
  const closeButton = useRef(null);
  useDialogFocus(dialog, closeButton, onClose);

  return (
    <section ref={dialog} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="room-panel-title">
      <header className={styles.panelHeader}>
        <h2 id="room-panel-title" className={styles.panelTitle}>
          {title}
        </h2>
        <button ref={closeButton} type="button" className={styles.panelClose} onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}
