// The desk terminal's state, shared by the screen in the 3D scene
// (DeskMonitor.js draws it) and the text box that takes the typing
// (TerminalInput.js, in the page). A tiny store: React components read it
// with useSyncExternalStore.

import { COMMIT, timeSince } from './deskLayout';
import { WELCOME, run } from './terminal';
import { newGame, step, stepMs, turn } from './snake';

const MAX_LINES = 200;
const BEST_KEY = 'house:snake-best';

function readBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(n) {
  try {
    window.localStorage.setItem(BEST_KEY, String(n));
  } catch {
    // Private windows can refuse storage; the best score still holds for this visit.
  }
}

/** The screen as the visitor first finds it: the last commit, then the hint. */
function firstLines() {
  const lines = [{ kind: 'prompt', text: 'benny@nairobi ~ $ git log -1' }];
  if (COMMIT) {
    lines.push({ kind: 'commit', text: `commit ${COMMIT.short}` });
    lines.push({ kind: 'out', text: `Date:  ${timeSince(COMMIT.date)}` });
    lines.push({ kind: 'out', text: `    ${COMMIT.message}` });
  } else {
    lines.push({ kind: 'dim', text: 'No commit information in this build.' });
  }
  return [...lines, { kind: 'blank', text: '' }, ...WELCOME];
}

let state = null;
let timer = null;
let onExit = null;
const listeners = new Set();

function init() {
  if (!state) state = { lines: firstLines(), input: '', mode: 'shell', game: null, best: readBest(), focused: false };
  return state;
}

function set(patch) {
  state = { ...init(), ...patch };
  for (const l of listeners) l();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getState = () => init();

/** Where `exit` goes: set by the house to walk back from the monitor. */
export function setOnExit(fn) {
  onExit = fn;
}

export function setInput(text) {
  if (state?.mode !== 'shell') return;
  set({ input: text.slice(0, 80) });
}

export function setFocused(focused) {
  set({ focused });
}

function tick() {
  const s = init();
  if (s.mode !== 'snake') return;
  const game = step(s.game);
  const best = Math.max(s.best, game.score);
  if (best > s.best) saveBest(best);
  set({ game, best });
  if (!game.over) timer = setTimeout(tick, stepMs(game.eaten));
}

export function startSnake() {
  clearTimeout(timer);
  // A fresh random seed every game (newGame's default).
  set({ mode: 'snake', game: newGame(), input: '' });
  timer = setTimeout(tick, stepMs(0));
}

/** Leaves the game (Esc, or walking away), back to the prompt. */
export function stopSnake() {
  clearTimeout(timer);
  const s = init();
  if (s.mode !== 'snake') return;
  const score = s.game?.score ?? 0;
  set({
    mode: 'shell',
    game: null,
    lines: [...s.lines, { kind: 'dim', text: `Snake: ${score} points (best ${s.best}).` }].slice(-MAX_LINES),
  });
}

export function steer(dir) {
  const s = init();
  if (s.mode !== 'snake') return;
  if (s.game.over) return;
  set({ game: turn(s.game, dir) });
}

/** Runs what is typed. */
export function submit() {
  const s = init();
  if (s.mode === 'snake') {
    if (s.game?.over) startSnake(); // Enter plays again
    return;
  }
  const { lines, action } = run(s.input);
  if (action === 'clear') {
    set({ lines: [], input: '' });
    return;
  }
  set({ lines: [...s.lines, ...lines].slice(-MAX_LINES), input: '' });
  if (action === 'snake') startSnake();
  if (action === 'exit') onExit?.();
}
