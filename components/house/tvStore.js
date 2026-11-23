// The living-room TV's player, controlled through YouTube's iframe messages
// (the same ones its JavaScript API sends), so no extra script is loaded.
// SmartTv.js owns the iframe; the house reads this state for its buttons.

import { YOUTUBE_ORIGIN } from './livingLayout';

// YouTube's player states.
export const PLAYING = 1;

let frame = null;
let state = { ready: false, playerState: -1, blocked: false };
const listeners = new Set();
let listening = null;

function set(patch) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export const getTvState = () => state;
export function subscribeTv(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function post(message) {
  frame?.contentWindow?.postMessage(JSON.stringify(message), YOUTUBE_ORIGIN);
}

export function command(func, args = []) {
  post({ event: 'command', func, args });
}

function onMessage(e) {
  if (e.origin !== YOUTUBE_ORIGIN || !frame || e.source !== frame.contentWindow) return;
  let data;
  try {
    data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
  } catch {
    return;
  }
  if (data?.event === 'onReady') {
    clearInterval(listening);
    set({ ready: true });
  } else if (data?.event === 'onStateChange' && typeof data.info === 'number') {
    set({ playerState: data.info });
  } else if (data?.event === 'infoDelivery' && typeof data.info?.playerState === 'number') {
    if (!state.ready) {
      clearInterval(listening);
      set({ ready: true });
    }
    set({ playerState: data.info.playerState });
  }
}

/** Called by SmartTv when its iframe is in the page (or null when it goes). */
export function attach(iframe) {
  clearInterval(listening);
  window.removeEventListener('message', onMessage);
  frame = iframe;
  set({ ready: false, playerState: -1, blocked: false });
  if (!iframe) return;
  window.addEventListener('message', onMessage);
  // YouTube only starts sending its state once told someone is listening.
  listening = setInterval(() => post({ event: 'listening', id: 'house-tv', channel: 'widget' }), 300);
}

/** The browser would not play with sound: play muted and offer to unmute. */
export function markBlocked(blocked) {
  set({ blocked });
}
