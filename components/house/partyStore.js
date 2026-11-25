// A Snake party, from this visitor's side: the connection to the room server
// (party/), what the room last said, and a feed of what's happening for the
// screen to show. A small store like terminalStore: React reads it with
// useSyncExternalStore (useParty).
//
//   idle        no party
//   naming      about to create or join: waiting for a name
//   connecting  name given, talking to the room
//   in          in the room (its phase: lobby, countdown, playing, results)
//   error       couldn't get in, or the room has ended
//
// Browser only (the house is never rendered on the server).

import PartySocket from 'partysocket';
import { PARTY_NAME, inviteUrl, isRoomCode, newRoomCode, newToken, partyFromSearch, shareText } from './partyLink';
import { play } from './sound';

/**
 * Where the room server is: NEXT_PUBLIC_PARTY_HOST if set, else the deployed
 * one in production and `wrangler dev` (in party/: npm run dev) in development.
 * Written out in full so Next puts the values into the page.
 */
const PARTY_HOST =
  process.env.NEXT_PUBLIC_PARTY_HOST || (process.env.NODE_ENV === 'production' ? 'party.bennyhinn.life' : 'localhost:8787');

const NAME_KEY = 'house:snake-name';
const tokenKey = (code) => `house:party:${code}`;
const FEED_MAX = 6;
const FEED_MS = 4500; // how long a line stays in the feed

/** An invite in the address the visitor arrived on, read before the house rewrites it. */
export const INVITE = typeof window === 'undefined' ? null : partyFromSearch(window.location.search);

export const ERRORS = {
  full: 'This party is full: 5 players is the most.',
  started: 'This party’s round has already started. Ask for a place in the next one!',
  'no-room': 'This party has ended, or the link is wrong.',
  ended: 'This party has ended.',
  'bad-name': 'Pick a name with at least one letter or number.',
  'not-host': 'Only the host can do that.',
  'need-players': 'You need at least one more player to start.',
  unreachable: 'Can’t reach the party server right now. Check your connection and try again.',
};
// Errors that end the attempt to be in the room (others are shown and passed).
const FATAL = new Set(['full', 'started', 'no-room', 'ended', 'bad-token', 'unreachable']);

const blank = () => ({ status: 'idle', code: null, create: false, name: '', you: null, room: null, error: null, online: false, offset: 0, feed: [], resume: [] });

let state = blank();
let socket = null;
let token = null;
let bestRtt = Infinity;
let feedId = 0;
const listeners = new Set();

function set(patch) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export const getParty = () => state;
export function subscribeParty(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      // Private windows can refuse storage; the party still works for this visit.
    }
  },
};

/** The room's clock, as best this browser can tell (corrected by pings). */
export const serverNow = () => Date.now() + state.offset;

/** The name used last time, to fill the box. */
export const savedName = () => storage.get(NAME_KEY) ?? '';

/** A line in the feed ("Ana joined"), fading after a few seconds. */
function say(text, { color = null, kind = 'info' } = {}) {
  const item = { id: ++feedId, text, color, kind, at: Date.now() };
  set({ feed: [...state.feed, item].slice(-FEED_MAX) });
  setTimeout(() => set({ feed: state.feed.filter((f) => f.id !== item.id) }), FEED_MS);
}

const nameOf = (room, id) => room?.players.find((p) => p.id === id);

// ---- Opening and closing -------------------------------------------------------

/** Starts creating a party (create) or joining one (code): asks for a name first. */
export function openParty({ create = false, code = null } = {}) {
  if (state.status !== 'idle' && state.status !== 'error') return;
  const room = create ? newRoomCode() : code;
  if (!isRoomCode(room)) return;
  close();
  set({ ...blank(), status: 'naming', code: room, create, name: savedName() });
}

/** Gives up before joining (the name box's Cancel), or clears an error. */
export function cancelParty() {
  if (state.status === 'naming' || state.status === 'error') {
    close();
    set(blank());
  }
}

/** Joins with this name: connects to the room and says hello. */
export function joinParty(name) {
  if (state.status !== 'naming') return;
  const trimmed = name.trim().slice(0, 24);
  if (!trimmed) {
    set({ error: { code: 'bad-name', message: ERRORS['bad-name'] } });
    return;
  }
  storage.set(NAME_KEY, trimmed);
  token = storage.get(tokenKey(state.code)) ?? newToken();
  storage.set(tokenKey(state.code), token);
  set({ status: 'connecting', name: trimmed, error: null });
  connect();
}

function connect() {
  close();
  bestRtt = Infinity;
  let failures = 0;
  const s = new PartySocket({
    host: PARTY_HOST,
    party: PARTY_NAME,
    room: state.code,
    minReconnectionDelay: 400,
    maxReconnectionDelay: 4000,
    maxRetries: 40,
  });
  socket = s;
  s.addEventListener('open', () => {
    if (socket !== s) return;
    failures = 0;
    set({ online: true });
    // Hello again on every (re)connection: the token says it's the same player.
    send({ t: 'hello', token, name: state.name, create: state.create });
    // A few pings to learn the room's clock (the quickest answer is the truest).
    for (let i = 0; i < 4; i++) setTimeout(() => send({ t: 'ping', c: Date.now() }), i * 180);
  });
  s.addEventListener('message', (e) => {
    if (socket !== s) return;
    let msg;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }
    receive(msg);
  });
  s.addEventListener('close', () => {
    if (socket !== s) return;
    set({ online: false });
    // Never got in, and the server can't be reached: say so instead of trying forever.
    if (state.status === 'connecting' && ++failures >= 4) fail('unreachable');
  });
}

function close() {
  if (!socket) return;
  const s = socket;
  socket = null;
  try {
    s.close();
  } catch {
    // already closed
  }
}

function send(msg) {
  if (socket) socket.send(JSON.stringify(msg));
}

function fail(code) {
  close();
  if (code === 'no-room' || code === 'ended') storage.set(tokenKey(state.code), null);
  set({ status: 'error', online: false, error: { code, message: ERRORS[code] ?? 'Something went wrong with the party.' } });
}

/** Leaves the party for good (the room keeps your score if a round is on). */
export function leaveParty() {
  if (state.status === 'in' || state.status === 'connecting') send({ t: 'leave' });
  // Give the message a moment to go before the connection closes.
  const s = socket;
  socket = null;
  setTimeout(() => {
    try {
      s?.close();
    } catch {
      // already closed
    }
  }, 250);
  set(blank());
}

// ---- The room's messages -----------------------------------------------------------

function receive(msg) {
  switch (msg.t) {
    case 'pong': {
      const now = Date.now();
      const rtt = now - msg.c;
      if (rtt < bestRtt) {
        bestRtt = rtt;
        set({ offset: msg.s + rtt / 2 - now });
      }
      return;
    }
    case 'welcome':
      // `moves`: mid-round, the turns the room has from you, to carry on from.
      set({ status: 'in', you: msg.you, error: null, resume: msg.moves ?? [] });
      update(msg.state, []);
      return;
    case 'state':
      update(msg.state, msg.events ?? []);
      return;
    case 'error':
      if (FATAL.has(msg.code)) return fail(msg.code);
      if (msg.code === 'bad-name' && state.status === 'connecting') {
        close();
        set({ status: 'naming', error: { code: 'bad-name', message: ERRORS['bad-name'] } });
        return;
      }
      say(ERRORS[msg.code] ?? 'That didn’t work.', { kind: 'warn' });
      return;
    default:
      hook?.(msg);
  }
}

// The race (partyPlay.js) hears the room's other messages ('resend').
let hook = null;
export const setRoomHook = (fn) => {
  hook = fn;
};

/** A new room state: news for the feed, then the state itself. */
function update(room, events) {
  const before = state.room;
  if (before) {
    for (const p of room.players) {
      if (p.id === state.you) continue;
      const was = nameOf(before, p.id);
      if (!was) {
        say(`${p.name} joined the party`, { color: p.color, kind: 'join' });
        play('join');
      } else if (was.status !== 'left' && p.status === 'left') say(`${p.name} left`, { color: p.color });
    }
    for (const p of before.players) {
      if (!nameOf(room, p.id) && room.phase === 'lobby') say(`${p.name} left`, { color: p.color });
    }
    if (before.host !== room.host && room.host) {
      const h = nameOf(room, room.host);
      if (h) say(room.host === state.you ? 'You’re the host now' : `${h.name} is the host now`, { color: h.color });
    }
  }
  for (const e of events) {
    const p = nameOf(room, e.player);
    if (!p) continue;
    const who = e.player === state.you ? 'You' : p.name;
    if (e.kind === 'lead') say(`${who} ${who === 'You' ? 'take' : 'takes'} the lead!`, { color: p.color, kind: 'lead' });
    if (e.kind === 'golden') say(`${who} grabbed a golden fruit: +3`, { color: p.color, kind: 'golden' });
    if (e.kind === 'out') say(`${who} ${e.reason === 'time' ? 'made it to the bell' : 'crashed'}`, { color: p.color, kind: 'out' });
  }
  set({ room });
}

// ---- What players do ----------------------------------------------------------------

export const startRound = () => send({ t: 'start' });

/** After crashing: wait to see the results with everyone. */
export const stayForResults = () => send({ t: 'stay' });

/** The host plays again with everyone still here. */
export const rematch = () => send({ t: 'rematch' });

/** The invite link for this party. */
export const partyInvite = () => (state.code ? inviteUrl(window.location.origin, state.code) : null);

/** Copies the invite. Resolves true when it's on the clipboard. */
export async function copyInvite() {
  const url = partyInvite();
  if (!url) return false;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/** Shares the invite through the phone's share sheet, or opens WhatsApp where there is none. */
export async function shareInvite() {
  const url = partyInvite();
  if (!url) return;
  const host = nameOf(state.room, state.room?.host);
  const text = shareText(host?.name);
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Snake party', text, url });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return; // the visitor closed the sheet
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener');
}

/** For tests and the room's own messages in later steps. */
export const partySend = send;
