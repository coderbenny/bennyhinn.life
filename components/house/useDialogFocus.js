'use client';

import { useEffect } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])';

/**
 * Focus handling for a dialog: focus moves to `initial` when it opens, Tab
 * and Shift+Tab stay inside `dialog`, and Esc calls `onClose`.
 * The caller decides where focus goes after it closes.
 */
export default function useDialogFocus(dialog, initial, onClose) {
  useEffect(() => {
    initial.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        // Handled here; the house must not also treat it as "go back".
        e.stopImmediatePropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog.current) return;
      const focusable = dialog.current.querySelectorAll(FOCUSABLE);
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
    // Capture phase, so the dialog sees Esc before the house's own listener.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [dialog, initial, onClose]);
}
