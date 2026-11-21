'use client';

import { useEffect, useRef, useState } from 'react';
import ContactForm from '@/components/ContactForm';
import { EMAIL } from '@/constants/contact';
import styles from './house.module.css';

// Opens from the mailbox: the email to copy, or a note sent through the site.
export default function LetterPanel({ onClose }) {
  const [copied, setCopied] = useState(false);
  const dialog = useRef(null);
  const closeButton = useRef(null);

  // A modal dialog: focus moves in when it opens, Tab stays inside it and Esc
  // closes it. House returns focus to the Mailbox button afterwards.
  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog.current) return;
      const focusable = dialog.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
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
