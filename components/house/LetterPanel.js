'use client';

import { useEffect, useRef, useState } from 'react';
import ContactForm from '@/components/ContactForm';
import { EMAIL } from '@/constants/contact';
import useDialogFocus from './useDialogFocus';
import styles from './house.module.css';

const COPIED_LABEL_MS = 1800;

// Opens from the mailbox: the email to copy, or a note sent through the site.
export default function LetterPanel({ onClose }) {
  const [copied, setCopied] = useState(false);
  const dialog = useRef(null);
  const closeButton = useRef(null);

  // Focus moves in when it opens; House returns it to the Mailbox button.
  useDialogFocus(dialog, closeButton, onClose);

  // The "Copied" label resets itself; cancel that if the panel closes first.
  const resetTimer = useRef(null);
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), COPIED_LABEL_MS);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section
        ref={dialog}
        className={styles.letter}
        role="dialog"
        aria-modal="true"
        aria-labelledby="letter-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeButton} type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 id="letter-title" className={styles.letterTitle}>
          Leave a note
        </h2>
        <p className={styles.letterText}>Write to me directly, or leave a message here and I&apos;ll reply by email.</p>
        <div className={styles.emailRow}>
          <a href={`mailto:${EMAIL}`} className={styles.email}>
            {EMAIL}
          </a>
          <button type="button" className={styles.copy} onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className={styles.form}>
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
