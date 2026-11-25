// Your own game in a Snake party: played on your screen, on the room's clock.
//
// Every player runs the same seed from the same start moment. A step happens
// when the room's clock passes the step's time, so nobody's snake runs fast
// or slow, and a tab left in the background catches up when it comes back
// (the snake carries straight on, as it would have). Your turns are noted
// (recordTurn) and sent to the room about twice a second; the room replays
// them to confirm your score (party/src/room.js).
//
// Kept apart from partyStore so the many small changes of a running game
// (a step every 70 to 140 ms) don't re-render the panel: the monitor reads
// this store every frame instead, and the panel only hears about scores.

import { GOLDEN, ROUND_MS, isMoves, newGame, recordTurn, replay, step, stepMs, turn } from './snake';
import { getParty, partySend, serverNow, setRoomHook, subscribeParty } from './partyStore';
import { play as sound } from './sound';

const REPORT_MS = 400;
// The game steps on its own timer, not on screen frames: a phone that draws
// slowly (or a tab in the background) still gets every step on time, and
// turns land on the step they were pressed for. Drawing reads the result.
const TICK_MS = 8;
const POP_MS = 700;

const idle = () => ({ round: null, game: null, moves: [], sent: 0, reported: -1, pops: [], startAt: 0 });
let state = idle();
let ticker = null;
let reportTimer = null;
const listeners = new Set();

function set(patch, notify = true) {
  state = { ...state, ...patch };
  if (notify) for (const l of listeners) l();
}

export const getPlay = () => state;
export function subscribePlay(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Me, as the room sees me. */
function me(party) {
  return party.room?.players.find((p) => p.id === party.you) ?? null;
}

// ---- Following the room -------------------------------------------------------

function sync() {
  const party = getParty();
  const room = party.status === 'in' ? party.room : null;
  const mine = room && me(party);
  const racing = room && (room.phase === 'countdown' || room.phase === 'playing') && room.seed && mine && mine.status !== 'lobby';
  if (!racing) {
    if (state.round !== null && room?.phase !== 'results') stop();
    if (room?.phase === 'results') halt(); // keep the last board on screen
    return;
  }
  if (state.round === room.round) return;
  // A new round (or coming back to one): start from the seed, then replay
  // any turns the room already has from us.
  let game = newGame(room.seed, { roundMs: ROUND_MS });
  const resume = isMoves(party.resume) ? party.resume : [];
  if (resume.length) {
    const last = resume.at(-1)[0];
    game = replay(room.seed, resume, { roundMs: ROUND_MS, untilStep: last });
    // Turns pressed before that last step are still waiting to be made.
    for (const [at, dir] of resume) if (at === last && at === game.steps) game = turn(game, dir);
  }
  set({ ...idle(), round: room.round, game, moves: [...resume], sent: resume.length, startAt: room.startAt });
  run();
}

function run() {
  halt();
  ticker = setInterval(tick, TICK_MS);
  reportTimer = setInterval(report, REPORT_MS);
}

function halt() {
  if (ticker) clearInterval(ticker);
  if (reportTimer) clearInterval(reportTimer);
  ticker = null;
  reportTimer = null;
}

function stop() {
  halt();
  set(idle());
}

/** Steps the game up to the room's clock. */
function tick() {
  let { game } = state;
  if (!game || game.over) return;
  const now = serverNow();
  let pops = state.pops.filter((p) => now - p.at < POP_MS);
  let changed = pops.length !== state.pops.length;
  // At most a few hundred steps at once (a tab that slept for a while).
  for (let i = 0; i < 400 && !game.over && now >= state.startAt + game.timeMs + stepMs(game.eaten); i++) {
    const before = game;
    game = step(game);
    changed = true;
    if (game.eaten > before.eaten) {
      const golden = before.golden;
      pops = [...pops, { x: before.food[0], y: before.food[1], text: golden ? `+${GOLDEN.points}` : '+1', golden, at: now }];
      sound(golden ? 'golden' : 'eat');
    }
  }
  if (!changed) return;
  set({ game, pops });
  if (game.over) {
    sound(game.reason === 'time' ? 'bell' : 'crash');
    report();
  }
}

/** Sends the turns since the last report and how far the game has got. */
function report() {
  const { game, moves, sent, reported } = state;
  if (!game) return;
  if (moves.length === sent && game.steps === reported) return;
  partySend({ t: 'moves', from: sent, moves: moves.slice(sent), step: game.steps });
  set({ sent: moves.length, reported: game.steps }, false);
}

/** A turn from the keys or the arrow pad. Allowed during the countdown too (it waits for the first step). */
export function steer(dir) {
  const { game } = state;
  if (!game || game.over) return;
  const r = recordTurn(game, dir);
  if (!r.move) return;
  set({ game: r.game, moves: [...state.moves, r.move] });
}

// The room asks for turns again after a gap (a dropped connection).
setRoomHook((msg) => {
  if (msg.t === 'resend' && Number.isInteger(msg.from) && msg.from <= state.moves.length) {
    set({ sent: msg.from, reported: -1 }, false);
    report();
  }
});

if (typeof window !== 'undefined') subscribeParty(sync);

// In development, test scripts can read the race and steer (as window.__house does for the scene).
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') window.__partyPlay = { getPlay, steer };
