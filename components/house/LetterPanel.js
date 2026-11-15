'use client';

import { useEffect, useState } from 'react';
import ContactForm from '@/components/ContactForm';
import { EMAIL } from '@/constants/contact';
import styles from './house.module.css';

// Opens from the mailbox: the email to copy, or a note sent through the site.
export default function LetterPanel({ onClose }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
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
        className={styles.letter}
        role="dialog"
        aria-modal="true"
        aria-labelledby="letter-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
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
