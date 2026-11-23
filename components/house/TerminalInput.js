'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useSyncExternalStore } from 'react';
import { getState, setFocused, setInput, steer, stopSnake, submit, subscribe } from './terminalStore';
import styles from './house.module.css';

// What takes the typing for the terminal on the desk monitor. The text box is
// visually hidden: what is typed shows on the screen in the 3D scene, and
// screen readers hear the output through the live region. During Snake, the
// arrow keys and WASD steer; on touch screens an arrow pad appears.

const KEYS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right',
};

const useTerminal = () => useSyncExternalStore(subscribe, getState, getState);

/** autoFocus  take the keyboard straight away (not on touch screens, where it would pop up the keyboard) */
const TerminalInput = forwardRef(function TerminalInput({ autoFocus }, ref) {
  const t = useTerminal();
  const input = useRef(null);
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus({ preventScroll: true }) }), []);

  useEffect(() => {
    if (autoFocus) input.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  // Walking away stops the game.
  useEffect(() => () => stopSnake(), []);

  // Esc during Snake stops the game, before the house treats it as "go back".
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && getState().mode === 'snake') {
        e.stopImmediatePropagation();
        e.preventDefault();
        stopSnake();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (t.mode === 'snake' && KEYS[e.key]) {
      e.preventDefault();
      steer(KEYS[e.key]);
    }
  };

  const last = t.lines.slice(-6).map((l) => l.text).join('\n');
  return (
    <>
      <input
        ref={input}
        className={styles.terminalInput}
        type="text"
        value={t.input}
        aria-label="Terminal. Type a command such as /help, then press Enter."
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="send"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <div className={styles.srOnly} aria-live="polite">
        {t.mode === 'snake' ? (t.game?.over ? `Game over. ${t.game.score} eaten. Press Enter to play again, Escape to stop.` : 'Snake is running.') : last}
      </div>
      {t.mode === 'snake' && (
        <div className={styles.snakePad} role="group" aria-label="Steer the snake">
          <button type="button" className={styles.padUp} aria-label="Up" onClick={() => steer('up')}>
            ↑
          </button>
          <button type="button" className={styles.padLeft} aria-label="Left" onClick={() => steer('left')}>
            ←
          </button>
          <button type="button" className={styles.padRight} aria-label="Right" onClick={() => steer('right')}>
            →
          </button>
          <button type="button" className={styles.padDown} aria-label="Down" onClick={() => steer('down')}>
            ↓
          </button>
          <button type="button" className={styles.padStop} onClick={() => (t.game?.over ? submit() : stopSnake())}>
            {t.game?.over ? 'Again' : 'Stop'}
          </button>
        </div>
      )}
    </>
  );
});

export default TerminalInput;
export { useTerminal };
