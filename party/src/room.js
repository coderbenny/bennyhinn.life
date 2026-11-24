// A Snake party room: the rules, with no network or Cloudflare in them, so
// every rule can be tested with a fake clock (room.test.mjs). server.js
// connects it to PartyServer: connections come in as ids, messages as text,
// and the room answers through the `io` functions it is given.
//
// The round, in short:
//   lobby      players join with a name (2 to 5); the host (the creator, or
//              the next player if the host goes) starts it
//   countdown  everyone gets the seed and the moment the round starts, a few
//              seconds ahead, and counts down 3, 2, 1 together
//   playing    each player plays on their own screen and sends their turns;
//              the room replays them with snake.js (the same code), so the
//              score it shows is the one that happened, not one a player
//              claims. Real time caps how far a game can have got.
//   results    when everyone is out (or has left), or at the 3-minute bell:
//              the ranking, with a few awards. Kept for RESULTS_KEEP_MS so a
//              player who left early can come back and see it, then gone.

import { GOLDEN, ROUND_MS, isMoves, newGame, randomSeed, step, stepMs, turn } from '../../components/house/snake.js';

export const MAX_PLAYERS = 5;
export const MIN_PLAYERS = 2;
export const COUNTDOWN_MS = 3500; // 3, 2, 1, go
export const BELL_GRACE_MS = 3000; // late messages still count this long after the bell
export const TIME_SLACK_MS = 1500; // a game may run this far ahead of the room's clock
export const RECONNECT_MS = 30_000; // a dropped player keeps their place (or their game) this long
export const RESULTS_KEEP_MS = 10 * 60_000;
export const NAME_MAX = 12;
export const MAX_MESSAGE_BYTES = 16_384;
export const MAX_MESSAGES_PER_SECOND = 30;
const FLUSH_MS = 100; // state goes out at most this often
export const COLORS = ['#3fb950', '#58a6ff', '#f778ba', '#ffa657', '#d2a8ff'];

const TOKEN = /^[0-9a-f]{32}$/;

/** A name as shown: printable, single-spaced, 1 to NAME_MAX characters; null if nothing is left. */
export function cleanName(raw) {
  if (typeof raw !== 'string') return null;
  const name = raw
    .normalize('NFC')
    .replace(/[\p{C}\p{Zl}\p{Zp}]/gu, '') // control, format, private-use and separator characters
    .replace(/\s+/g, ' ')
    .trim();
  const chars = [...name].slice(0, NAME_MAX).join('').trim();
  return chars || null;
}

/** Golden fruit eaten, from the score and the fruit count. */
const goldenEaten = (game) => (game.score - game.eaten) / (GOLDEN.points - 1);

/** Final order: points, then who lasted longer, then who joined first. */
export function rank(players) {
  return [...players].sort((a, b) => b.game.score - a.game.score || b.game.timeMs - a.game.timeMs || a.joined - b.joined);
}

/**
 * io: {
 *   now(): ms            the room's clock
 *   send(connId, msg)    one connection
 *   close(connId)        drop a connection
 *   wakeAt(ms|null)      call room.wake() at this moment (null: no need)
 *   keepResults(results) / dropResults()   the finished leaderboard, kept for a while
 * }
 */
export class Room {
  constructor(io, { seed } = {}) {
    this.io = io;
    this.makeSeed = seed ?? randomSeed;
    this.phase = 'empty'; // empty | lobby | countdown | playing | results
    this.players = []; // in joining order
    this.conns = new Map(); // connId -> { player, window, count }
    this.round = 0;
    this.host = null;
    this.seed = null;
    this.startAt = 0;
    this.results = null;
    this.timers = { flush: null, start: null, end: null, expire: null };
    this.drops = new Map(); // player id -> the moment a dropped player is given up on
    this.nextId = 1;
  }

  // ---- Connections ----------------------------------------------------------

  connect(connId) {
    this.conns.set(connId, { player: null, viewer: false, window: 0, count: 0 });
    // Nothing is said until the connection says hello.
  }

  disconnect(connId) {
    const c = this.conns.get(connId);
    this.conns.delete(connId);
    const p = c?.player;
    if (!p || p.conn !== connId) return;
    p.conn = null;
    if (p.status === 'left') return;
    if (p.status === 'lobby' || p.status === 'playing') {
      this.drops.set(p.id, this.io.now() + RECONNECT_MS);
      this.schedule();
    }
    this.changed();
  }

  /** A message from a connection, as received (text). */
  message(connId, raw) {
    const c = this.conns.get(connId);
    if (!c) return;
    // Flood guard: too many messages in a second, or one too large, and the connection is dropped.
    const now = this.io.now();
    if (now - c.window >= 1000) {
      c.window = now;
      c.count = 0;
    }
    if (++c.count > MAX_MESSAGES_PER_SECOND || typeof raw !== 'string' || raw.length > MAX_MESSAGE_BYTES) {
      this.io.close(connId);
      return;
    }
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return this.refuse(connId, 'bad-message');
    }
    if (!msg || typeof msg !== 'object') return this.refuse(connId, 'bad-message');
    if (msg.t === 'ping') return this.io.send(connId, { t: 'pong', c: msg.c, s: now });
    if (msg.t === 'hello') return this.hello(connId, msg);
    const p = c.player;
    if (!p || p.conn !== connId) return this.refuse(connId, 'say-hello');
    switch (msg.t) {
      case 'start':
        return this.start(p);
      case 'moves':
        return this.moves(p, msg);
      case 'stay':
        p.stayed = true;
        return this.changed();
      case 'leave':
        return this.leave(p);
      case 'rematch':
        return this.rematch(p);
      default:
        return this.refuse(connId, 'bad-message');
    }
  }

  refuse(connId, code) {
    this.io.send(connId, { t: 'error', code });
  }

  // ---- Joining ----------------------------------------------------------------

  /** { t: 'hello', token, name, create }: join, or come back with the same token. */
  hello(connId, { token, name, create }) {
    const c = this.conns.get(connId);
    if (!TOKEN.test(token ?? '')) return this.refuse(connId, 'bad-token');
    const back = this.players.find((p) => p.token === token);
    if (back) {
      // The same player on a new connection (a reload, a dropped signal).
      if (back.conn && back.conn !== connId) this.io.close(back.conn);
      back.conn = connId;
      c.player = back;
      this.drops.delete(back.id);
      if (back.status === 'left' && this.phase !== 'results') back.status = back.game?.over ? 'out' : back.status;
      this.welcome(back);
      return this.changed();
    }
    if (this.phase === 'results') {
      // Anyone with the link sees the leaderboard while it is kept.
      c.viewer = true;
      return this.io.send(connId, { t: 'welcome', you: null, moves: [], state: this.snapshot() });
    }
    if (this.phase === 'empty') {
      if (!create) return this.refuse(connId, 'no-room'); // a link to a room that has ended
      this.phase = 'lobby';
    } else if (this.phase !== 'lobby') {
      return this.refuse(connId, 'started');
    }
    const clean = cleanName(name);
    if (!clean) return this.refuse(connId, 'bad-name');
    const active = this.players.filter((p) => p.status !== 'left');
    if (active.length >= MAX_PLAYERS) return this.refuse(connId, 'full');
    const used = new Set(active.map((p) => p.color));
    const p = {
      id: `p${this.nextId++}`,
      token,
      name: this.uniqueName(clean),
      color: COLORS.find((col) => !used.has(col)),
      conn: connId,
      joined: this.nextId,
      status: 'lobby', // lobby | playing | out | left
      stayed: false,
      game: null,
      moves: [],
      applied: 0, // moves already replayed
    };
    this.players.push(p);
    c.player = p;
    if (!this.host || !this.isActive(this.host)) this.host = p;
    this.welcome(p);
    this.changed();
  }

  uniqueName(name) {
    const taken = new Set(this.players.filter((p) => p.status !== 'left').map((p) => p.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    for (let n = 2; ; n++) {
      const tagged = `${[...name].slice(0, NAME_MAX - 2).join('')} ${n}`;
      if (!taken.has(tagged.toLowerCase())) return tagged;
    }
  }

  isActive(p) {
    return p && p.status !== 'left' && this.players.includes(p);
  }

  /** Tells a player who they are, and (mid-round) everything needed to carry on. */
  welcome(p) {
    this.io.send(p.conn, {
      t: 'welcome',
      you: p.id,
      moves: this.phase === 'playing' || this.phase === 'countdown' ? p.moves : [],
      state: this.snapshot(),
    });
  }

  leave(p) {
    this.drops.delete(p.id);
    p.status = 'left';
    if (this.phase === 'playing' && p.game && !p.game.over) p.left = true; // their score at leaving stands
    if (this.phase === 'lobby') {
      // In the lobby, leaving gives the place up.
      this.players = this.players.filter((q) => q !== p);
    }
    if (this.host === p) this.passHost();
    if (p.conn) {
      const conn = p.conn;
      p.conn = null;
      this.conns.get(conn) && (this.conns.get(conn).player = null);
    }
    if (this.phase === 'lobby' && !this.players.length) this.phase = 'empty';
    this.checkEnd();
    this.changed();
  }

  passHost() {
    this.host = this.players.find((q) => q.status !== 'left' && q.conn) ?? this.players.find((q) => q.status !== 'left') ?? null;
  }

  // ---- The round ------------------------------------------------------------------

  start(p) {
    if (p !== this.host) return this.refuse(p.conn, 'not-host');
    if (this.phase !== 'lobby') return this.refuse(p.conn, 'started');
    const ready = this.players.filter((q) => q.status === 'lobby');
    if (ready.length < MIN_PLAYERS) return this.refuse(p.conn, 'need-players');
    this.round++;
    this.leaderId = null;
    this.seed = this.makeSeed();
    this.startAt = this.io.now() + COUNTDOWN_MS;
    this.phase = 'countdown';
    this.drops.clear();
    // Anyone still away when the round is set goes.
    this.players = this.players.filter((q) => q.status === 'lobby');
    for (const q of this.players) {
      q.status = 'playing';
      q.stayed = false;
      q.left = false;
      q.game = newGame(this.seed, { roundMs: ROUND_MS });
      q.moves = [];
      q.applied = 0;
    }
    this.timers.start = this.startAt;
    this.timers.end = this.startAt + ROUND_MS + BELL_GRACE_MS;
    this.schedule();
    this.changed();
  }

  /**
   * { t: 'moves', from, moves, step }: the turns pressed since the player's
   * last report (`from` is how many they had sent before), and how many steps
   * their game has taken. The room replays up to that step, no further than
   * real time allows.
   */
  moves(p, { from, moves, step: upTo }) {
    if (this.phase !== 'playing' && this.phase !== 'countdown') return;
    if (p.status !== 'playing') return;
    if (!Number.isInteger(from) || from < 0 || !Number.isInteger(upTo) || upTo < 0 || !Array.isArray(moves)) {
      return this.refuse(p.conn, 'bad-moves');
    }
    if (from > p.moves.length) {
      // Some reports went missing (a dropped connection): ask for them again.
      return this.io.send(p.conn, { t: 'resend', from: p.moves.length });
    }
    const fresh = moves.slice(p.moves.length - from);
    const all = [...p.moves, ...fresh];
    // New turns can't be for steps the room has already replayed.
    if (!isMoves(all) || (fresh.length && fresh[0][0] < p.game.steps)) return this.refuse(p.conn, 'bad-moves');
    p.moves = all;
    this.advance(p, upTo);
    this.checkEnd();
    this.changed();
  }

  /** Replays a player's game to `upTo` steps, never past what real time allows. */
  advance(p, upTo) {
    const allowedMs = Math.max(0, this.io.now() - this.startAt + TIME_SLACK_MS);
    let g = p.game;
    while (!g.over && g.steps < upTo) {
      while (p.applied < p.moves.length && p.moves[p.applied][0] === g.steps) g = turn(g, p.moves[p.applied++][1]);
      if (g.timeMs + stepMs(g.eaten) > allowedMs && g.timeMs + stepMs(g.eaten) <= g.roundMs) break; // ahead of the clock
      const was = g;
      g = step(g);
      if (g.score - was.score === GOLDEN.points) this.event({ kind: 'golden', player: p.id });
    }
    p.game = g;
    if (g.over) {
      p.status = 'out';
      this.event({ kind: 'out', player: p.id, reason: g.reason });
    }
    // A new leader is announced once: a tie at the top doesn't take the lead
    // from whoever had it.
    const now = this.leader();
    if (now && now.id !== this.leaderId && now.game.score > 0) {
      this.leaderId = now.id;
      this.event({ kind: 'lead', player: now.id });
    }
  }

  /** Who leads right now (null on a tie at the top, or before anyone scores). */
  leader() {
    const inRound = this.players.filter((q) => q.game);
    if (!inRound.length) return null;
    const [a, b] = rank(inRound);
    return b && b.game.score === a.game.score ? null : a;
  }

  /**
   * The round ends when nobody is still playing: everyone is out, has left,
   * or dropped and didn't come back in time; or the bell has rung.
   */
  checkEnd(force = false) {
    if (this.phase !== 'playing' && this.phase !== 'countdown') return;
    const stillPlaying = this.players.some((q) => q.status === 'playing');
    if (force || !stillPlaying) this.finish();
  }

  finish() {
    this.phase = 'results';
    this.timers.start = null;
    this.timers.end = null;
    for (const q of this.players) if (q.status === 'playing') q.status = 'out';
    const order = rank(this.players);
    const best = (key) => {
      const top = Math.max(...order.map(key));
      return top > 0 ? order.find((q) => key(q) === top)?.id : null;
    };
    this.results = {
      round: this.round,
      seed: this.seed,
      ranking: order.map((q, i) => ({
        place: i + 1,
        id: q.id,
        name: q.name,
        color: q.color,
        score: q.game.score,
        eaten: q.game.eaten,
        golden: goldenEaten(q.game),
        length: q.game.snake.length,
        lastedMs: q.game.timeMs,
        reason: q.left ? 'left' : q.game.reason,
      })),
      awards: {
        golden: best((q) => goldenEaten(q.game)), // most golden fruit
        longest: best((q) => q.game.snake.length - 3), // the longest snake
        survivor: best((q) => q.game.timeMs), // lasted longest
      },
    };
    this.timers.expire = this.io.now() + RESULTS_KEEP_MS;
    this.io.keepResults(this.results);
    this.schedule();
    this.changed();
  }

  /** The host plays again with everyone still here: back to the lobby, a new seed at the start. */
  rematch(p) {
    if (this.phase !== 'results') return;
    if (p !== this.host) return this.refuse(p.conn, 'not-host');
    this.players = this.players.filter((q) => q.conn && q.status !== 'left');
    for (const q of this.players) {
      q.status = 'lobby';
      q.game = null;
      q.moves = [];
      q.applied = 0;
      q.stayed = false;
    }
    this.results = null;
    this.timers.expire = null;
    this.io.dropResults();
    this.phase = 'lobby';
    if (!this.isActive(this.host)) this.passHost();
    this.schedule();
    this.changed();
  }

  // ---- Time -------------------------------------------------------------------------

  /** Called at the moment asked for with io.wakeAt (or any time after). */
  wake() {
    const now = this.io.now();
    if (this.timers.start !== null && now >= this.timers.start && this.phase === 'countdown') {
      this.phase = 'playing';
      this.timers.start = null;
      this.changed();
    }
    if (this.timers.end !== null && now >= this.timers.end) {
      this.timers.end = null;
      this.checkEnd(true);
    }
    for (const [id, at] of this.drops) {
      if (now < at) continue;
      this.drops.delete(id);
      const p = this.players.find((q) => q.id === id);
      if (p && !p.conn) this.leave(p); // in a round, their score so far stands
    }
    if (this.timers.expire !== null && now >= this.timers.expire) {
      // The leaderboard has been kept long enough.
      this.timers.expire = null;
      this.results = null;
      this.io.dropResults();
      for (const c of [...this.conns.keys()]) this.io.close(c);
      this.reset();
    }
    if (this.timers.flush !== null && now >= this.timers.flush) {
      this.timers.flush = null;
      this.flush();
    }
    this.schedule();
  }

  reset() {
    this.phase = 'empty';
    this.players = [];
    this.host = null;
    this.seed = null;
    this.drops.clear();
    this.timers = { flush: null, start: null, end: null, expire: null };
  }

  schedule() {
    const times = [...Object.values(this.timers), ...this.drops.values()].filter((t) => t !== null);
    this.io.wakeAt(times.length ? Math.min(...times) : null);
  }

  // ---- Telling everyone ----------------------------------------------------------------

  /** Something changed: the new state goes out shortly (several changes, one message). */
  changed() {
    if (this.timers.flush === null) {
      this.timers.flush = this.io.now() + FLUSH_MS;
      this.schedule();
    }
  }

  event(e) {
    this.pendingEvents ??= [];
    this.pendingEvents.push(e);
  }

  flush() {
    const msg = { t: 'state', state: this.snapshot(), events: this.pendingEvents ?? [] };
    this.pendingEvents = [];
    for (const [connId, c] of this.conns) if (c.player || c.viewer) this.io.send(connId, msg);
  }

  /** What every player sees. The seed only once the round is set. */
  snapshot() {
    return {
      phase: this.phase,
      round: this.round,
      now: this.io.now(),
      host: this.host?.id ?? null,
      seed: this.phase === 'lobby' || this.phase === 'empty' ? null : this.seed,
      startAt: this.startAt || null,
      endsAt: this.startAt ? this.startAt + ROUND_MS : null,
      players: this.players.map((q) => ({
        id: q.id,
        name: q.name,
        color: q.color,
        status: q.status,
        online: Boolean(q.conn),
        stayed: q.stayed,
        score: q.game?.score ?? 0,
        length: q.game?.snake.length ?? 3,
        golden: q.game ? goldenEaten(q.game) : 0,
      })),
      results: this.results,
    };
  }

  /** A room that has only a kept leaderboard (after the room itself went to sleep). */
  restore(results) {
    if (!results || this.phase !== 'empty') return;
    this.results = results;
    this.phase = 'results';
  }
}
