// Checks for the Snake party room, with a fake clock and fake connections:
// bots join, play whole rounds by sending their turns, drop out, come back,
// cheat, and flood. Run: npm test (in party/), or npm run test:house.
import assert from 'node:assert/strict';
import {
  BELL_GRACE_MS,
  COUNTDOWN_MS,
  MAX_MESSAGES_PER_SECOND,
  MAX_PLAYERS,
  RECONNECT_MS,
  RESULTS_KEEP_MS,
  Room,
  cleanName,
} from './room.js';
import { GRID, ROUND_MS, newGame, recordTurn, step, stepMs } from '../../components/house/snake.js';

// ---- A fake world ----------------------------------------------------------------

function world({ seed } = {}) {
  const w = { t: 1_000_000, inbox: new Map(), closed: new Set(), wakeAt: null, kept: null, keptCalls: 0 };
  const io = {
    now: () => w.t,
    send: (id, msg) => {
      if (!w.inbox.has(id)) w.inbox.set(id, []);
      w.inbox.get(id).push(JSON.parse(JSON.stringify(msg)));
    },
    close: (id) => {
      w.closed.add(id);
      w.room.disconnect(id);
    },
    wakeAt: (at) => {
      w.wakeAt = at;
    },
    keepResults: (r) => {
      w.kept = r;
      w.keptCalls++;
    },
    dropResults: () => {
      w.kept = null;
    },
  };
  // Fixed seeds, so every run plays the same games (real rooms use randomSeed).
  let n = 0;
  const fixed = () => `${(++n).toString(16)}${'5eed'.repeat(8)}`.slice(0, 32);
  // ROOM_RANDOM_SEEDS=1 plays fresh random games instead (a wider shake-down).
  w.room = new Room(io, { seed: seed ?? (process.env.ROOM_RANDOM_SEEDS ? undefined : fixed) });
  /** Moves the clock on, waking the room whenever it asked. */
  w.until = (t) => {
    while (w.wakeAt !== null && w.wakeAt <= t) {
      w.t = Math.max(w.t, w.wakeAt);
      w.room.wake();
    }
    w.t = t;
  };
  w.after = (ms) => w.until(w.t + ms);
  let conns = 0;
  w.open = () => {
    const id = `c${++conns}`;
    w.inbox.set(id, []);
    w.room.connect(id);
    return id;
  };
  w.say = (id, msg) => w.room.message(id, typeof msg === 'string' ? msg : JSON.stringify(msg));
  w.last = (id, t) => [...(w.inbox.get(id) ?? [])].reverse().find((m) => !t || m.t === t);
  w.all = (id, t) => (w.inbox.get(id) ?? []).filter((m) => m.t === t);
  w.state = (id) => {
    w.after(150); // let the room's batched update go out
    const m = [...(w.inbox.get(id) ?? [])].reverse().find((x) => x.t === 'state' || x.t === 'welcome');
    return m?.state;
  };
  return w;
}

const token = (i) => i.toString(16).padStart(32, '0');

/** Joins a player; returns the connection id. */
function join(w, i, name, create = false) {
  const id = w.open();
  w.say(id, { t: 'hello', token: token(i), name, create });
  return id;
}

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const BACK = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** A sensible turn: towards the fruit, never straight back, never into a wall or itself if it can help it. */
function towards(g) {
  const [hx, hy] = g.snake[0];
  const [fx, fy] = g.food ?? [hx, hy];
  const prefer = [fx > hx ? 'right' : 'left', fy > hy ? 'down' : 'up', fx > hx ? 'left' : 'right', fy > hy ? 'up' : 'down'];
  const body = new Set(g.snake.slice(0, -1).map((c) => c.join()));
  const safe = (d) => {
    const [x, y] = [hx + DIRS[d][0], hy + DIRS[d][1]];
    return x >= 0 && y >= 0 && x < GRID.cols && y < GRID.rows && !body.has(`${x},${y}`);
  };
  return prefer.find((d) => d !== BACK[g.dir] && safe(d)) ?? g.dir;
}

/**
 * A bot that plays on its own screen as a player would: the game runs on
 * the room's clock from the start moment, the bot steers towards the fruit
 * (badly, now and then, so games end differently), and it reports every
 * half second.
 */
function bot(w, conn, seed, startAt, { clumsy = 0, quitAtMs = Infinity, crashAtMs = Infinity } = {}) {
  const b = { conn, game: newGame(seed, { roundMs: ROUND_MS }), moves: [], sent: 0, quit: false };
  let k = 0;
  b.run = (until) => {
    while (!b.game.over && !b.quit) {
      const dt = stepMs(b.game.eaten);
      if (startAt + b.game.timeMs + dt > until) break;
      if (b.game.timeMs >= quitAtMs) {
        b.quit = true;
        break;
      }
      const [hx, hy] = b.game.snake[0];
      // After crashAtMs it stops steering: straight on, into the next wall.
      let want = b.game.timeMs >= crashAtMs ? b.game.dir : clumsy && ++k % clumsy === 0 ? (hx > GRID.cols / 2 ? 'right' : 'left') : towards(b.game);
      const r = recordTurn(b.game, want);
      b.game = r.game;
      if (r.move) b.moves.push(r.move);
      b.game = step(b.game);
    }
  };
  b.report = () => {
    w.say(conn, { t: 'moves', from: b.sent, moves: b.moves.slice(b.sent), step: b.game.steps });
    b.sent = b.moves.length;
  };
  return b;
}

/** Runs a round's clock in half-second reports until `until`. */
function play(w, bots, until) {
  while (w.t < until) {
    w.after(500);
    for (const b of bots) {
      if (b.quit) continue;
      b.run(w.t);
      b.report();
    }
  }
}

// ---- Names ----------------------------------------------------------------------
assert.equal(cleanName('  Ana  '), 'Ana');
assert.equal(cleanName('A\u0000n​a\n'), 'Ana', 'control and invisible characters go');
assert.equal(cleanName('Benny    On  Beat'), 'Benny On Bea', 'single spaces, 12 characters at most');
assert.equal(cleanName('🐍🐍🐍🐍🐍🐍🐍🐍🐍🐍🐍🐍🐍🐍'), '🐍'.repeat(12), 'emoji count as one character each');
for (const bad of ['', '   ', '\u0000\u0001', 42, null, undefined]) assert.equal(cleanName(bad), null);

// ---- Joining -----------------------------------------------------------------------
{
  const w = world();
  // A link to a room that doesn't exist (or has ended) says so.
  const stray = join(w, 99, 'Stray');
  assert.equal(w.last(stray, 'error').code, 'no-room');
  const host = join(w, 1, 'Benny', true);
  assert.equal(w.last(host, 'welcome').you, 'p1');
  const ana = join(w, 2, 'Ana');
  const ana2 = join(w, 3, 'ana');
  let s = w.state(host);
  assert.deepEqual(
    s.players.map((p) => p.name),
    ['Benny', 'Ana', 'ana 2'],
    'the same name twice gets a number'
  );
  assert.equal(s.host, 'p1');
  assert.equal(new Set(s.players.map((p) => p.color)).size, 3, 'everyone has their own colour');
  assert.equal(s.seed, null, 'no seed in the lobby');
  join(w, 4, 'Joe');
  join(w, 5, 'Kim');
  const sixth = join(w, 6, 'Late');
  assert.equal(w.last(sixth, 'error').code, 'full', `at most ${MAX_PLAYERS}`);
  const noName = join(w, 7, '   ');
  assert.equal(w.last(noName, 'error').code, 'bad-name');
  const badToken = w.open();
  w.say(badToken, { t: 'hello', token: 'nope', name: 'X' });
  assert.equal(w.last(badToken, 'error').code, 'bad-token');
  // Messages before hello are refused; rubbish is refused.
  const quiet = w.open();
  w.say(quiet, { t: 'start' });
  assert.equal(w.last(quiet, 'error').code, 'say-hello');
  w.say(quiet, 'not json');
  assert.equal(w.last(quiet, 'error').code, 'bad-message');
  // Only the host starts.
  w.say(ana, { t: 'start' });
  assert.equal(w.last(ana, 'error').code, 'not-host');
  // Leaving the lobby gives the place up; the host passes on if the host goes.
  w.say(ana2, { t: 'leave' });
  w.say(host, { t: 'leave' });
  s = w.state(ana);
  assert.deepEqual(
    s.players.map((p) => p.name),
    ['Ana', 'Joe', 'Kim']
  );
  assert.equal(s.host, 'p2', 'Ana is host now');
  // A dropped player keeps their place for RECONNECT_MS, then loses it.
  w.room.disconnect(ana);
  w.after(RECONNECT_MS - 1000);
  assert.equal(w.state(ana)?.players.length ?? w.room.players.length, 3);
  w.after(2000);
  assert.deepEqual(
    w.room.players.map((p) => p.name),
    ['Joe', 'Kim']
  );
  assert.equal(w.room.host?.name, 'Joe', 'the host passes on when the host drops for good');
}

// ---- A whole round ------------------------------------------------------------------
{
  const w = world();
  const conns = [join(w, 1, 'Benny', true), join(w, 2, 'Ana'), join(w, 3, 'Joe')];
  // One player alone can't start.
  {
    const solo = world();
    const only = join(solo, 1, 'Solo', true);
    solo.say(only, { t: 'start' });
    assert.equal(solo.last(only, 'error').code, 'need-players');
  }
  w.say(conns[0], { t: 'start' });
  let s = w.state(conns[1]);
  assert.equal(s.phase, 'countdown');
  assert.match(s.seed, /^[0-9a-f]{32}$/, 'everyone gets the seed at the countdown');
  assert.ok(s.startAt - s.now <= COUNTDOWN_MS && s.startAt > s.now);
  const late = join(w, 9, 'Late');
  assert.equal(w.last(late, 'error').code, 'started', 'no joining once the round is set');
  const { seed, startAt } = s;
  w.until(startAt);
  assert.equal(w.room.phase, 'playing');

  // Benny plays well, Ana crashes early, Joe goes on a while then crashes.
  const bots = [bot(w, conns[0], seed, startAt), bot(w, conns[1], seed, startAt, { clumsy: 9 }), bot(w, conns[2], seed, startAt, { clumsy: 40 })];
  play(w, bots, startAt + ROUND_MS + BELL_GRACE_MS + 1000);
  s = w.state(conns[0]);
  assert.equal(s.phase, 'results');
  const r = s.results;
  // The room's scores are exactly the ones the bots played.
  for (const b of bots) {
    const row = r.ranking.find((x) => x.id === w.room.conns.get(b.conn).player.id);
    assert.equal(row.score, b.game.score, `${row.name}: the room replayed the same score`);
    assert.equal(row.length, b.game.snake.length);
  }
  // Ranked by points, then by how long they lasted.
  for (let i = 1; i < r.ranking.length; i++) {
    const [a, b] = [r.ranking[i - 1], r.ranking[i]];
    assert.ok(a.score > b.score || (a.score === b.score && a.lastedMs >= b.lastedMs), 'ranking order');
  }
  assert.deepEqual(
    r.ranking.map((x) => x.place),
    [1, 2, 3]
  );
  assert.ok(r.awards.survivor, 'someone lasted longest');
  assert.equal(w.kept, w.room.results, 'the leaderboard is kept for latecomers');
  // Events made it out: someone went out, and somebody took the lead.
  const events = w.all(conns[0], 'state').flatMap((m) => m.events);
  assert.ok(events.some((e) => e.kind === 'out'), 'out events');
  const leads = events.filter((e) => e.kind === 'lead').map((e) => e.player);
  assert.ok(leads.length, 'lead events');
  assert.ok(leads.every((x, i) => i === 0 || x !== leads[i - 1]), 'the lead is announced only when it changes hands');
  if (bots.some((b) => b.game.score - b.game.eaten > 0)) assert.ok(events.some((e) => e.kind === 'golden'), 'golden events');

  // Anyone with the link sees the leaderboard while it's kept.
  const viewer = join(w, 50, 'Viewer');
  assert.equal(w.last(viewer, 'welcome').state.phase, 'results');
  assert.equal(w.last(viewer, 'welcome').you, null);
  // Rematch: host only, back to the lobby with whoever is still here.
  w.say(conns[1], { t: 'rematch' });
  assert.equal(w.last(conns[1], 'error').code, 'not-host');
  w.say(conns[0], { t: 'rematch' });
  s = w.state(conns[0]);
  assert.equal(s.phase, 'lobby');
  assert.equal(s.players.length, 3);
  assert.equal(w.kept, null);
  w.say(conns[0], { t: 'start' });
  assert.notEqual(w.state(conns[0]).seed, seed, 'a new seed for the rematch');
}

// ---- Everyone out ends the round early; the leaderboard expires ----------------------------
{
  const w = world();
  const a = join(w, 1, 'A', true);
  const b = join(w, 2, 'B');
  w.say(a, { t: 'start' });
  const { seed, startAt } = w.state(a);
  w.until(startAt);
  const bots = [bot(w, a, seed, startAt, { crashAtMs: 4000 }), bot(w, b, seed, startAt, { crashAtMs: 9000 })];
  play(w, bots, startAt + 20_000);
  assert.ok(bots.every((x) => x.game.over), 'both crashed');
  assert.equal(w.room.phase, 'results', 'the round ends when everyone is out, before the bell');
  // B leaves; A stays. After RESULTS_KEEP_MS the room is gone.
  w.say(b, { t: 'leave' });
  w.after(RESULTS_KEEP_MS + 1000);
  assert.equal(w.room.phase, 'empty');
  assert.ok(w.closed.has(a), 'connections are closed when the leaderboard goes');
  assert.equal(w.kept, null);
  // And the link now says the room has ended.
  const again = join(w, 1, 'A');
  assert.equal(w.last(again, 'error').code, 'no-room');
}

// ---- Leaving early, waiting, and coming back --------------------------------------------
{
  const w = world();
  const a = join(w, 1, 'A', true);
  const b = join(w, 2, 'B');
  const c = join(w, 3, 'C');
  w.say(a, { t: 'start' });
  const { seed, startAt } = w.state(a);
  w.until(startAt);
  const bots = [bot(w, a, seed, startAt, { crashAtMs: 3000 }), bot(w, b, seed, startAt), bot(w, c, seed, startAt)];
  play(w, bots, startAt + 15_000);
  assert.ok(bots[0].game.over, 'A is out early');
  // A chooses to wait (stays connected); B drops (signal lost) and comes back within the grace.
  w.say(a, { t: 'stay' });
  w.room.disconnect(b);
  w.after(5000);
  const b2 = w.open();
  w.say(b2, { t: 'hello', token: token(2), name: 'B' });
  const wel = w.last(b2, 'welcome');
  assert.equal(wel.you, 'p2');
  assert.deepEqual(wel.moves, bots[1].moves.slice(0, bots[1].sent), 'a returning player gets their turns back to carry on');
  bots[1].conn = b2;
  // C leaves mid-round: their score so far stands.
  const cScore = w.room.players[2].game.score;
  w.say(c, { t: 'leave' });
  bots[2].quit = true;
  play(w, bots, startAt + ROUND_MS + BELL_GRACE_MS + 500);
  const r = w.state(a).results;
  assert.ok(r, 'results after the bell');
  const cRow = r.ranking.find((x) => x.name === 'C');
  assert.equal(cRow.score, cScore);
  assert.equal(cRow.reason, 'left');
  assert.ok(w.all(a, 'state').some((m) => m.state.players.find((p) => p.name === 'A')?.stayed), 'A is shown waiting');
  // C reopens the link later and sees the final leaderboard.
  const cBack = w.open();
  w.say(cBack, { t: 'hello', token: token(3), name: 'C' });
  assert.equal(w.last(cBack, 'welcome').state.results.ranking.length, 3);
}

// ---- A player who drops and never comes back ------------------------------------------------
{
  const w = world();
  const a = join(w, 1, 'A', true);
  const b = join(w, 2, 'B');
  w.say(a, { t: 'start' });
  const { seed, startAt } = w.state(a);
  w.until(startAt);
  const ba = bot(w, a, seed, startAt, { crashAtMs: 2000 });
  const bb = bot(w, b, seed, startAt);
  play(w, [ba, bb], startAt + 8_000);
  assert.ok(ba.game.over);
  w.room.disconnect(b);
  bb.quit = true;
  w.after(RECONNECT_MS - 2000);
  assert.equal(w.room.phase, 'playing', 'B still has time to come back');
  w.after(3000);
  assert.equal(w.room.phase, 'results', 'given up on: the round ends with their score so far');
}

// ---- Cheating doesn't pay ----------------------------------------------------------------------
{
  const w = world();
  const a = join(w, 1, 'A', true);
  const b = join(w, 2, 'B');
  w.say(a, { t: 'start' });
  const { seed, startAt } = w.state(a);
  w.until(startAt + 2000);
  // A plays the whole round in an instant and reports it all at once.
  const fast = bot(w, a, seed, startAt);
  fast.run(startAt + ROUND_MS);
  fast.report();
  const p = w.room.players[0];
  assert.ok(p.game.timeMs <= 2000 + 1500, 'the room only replays as far as the clock allows');
  assert.ok(p.game.score < fast.game.score || fast.game.score === 0, 'so the score is capped too');
  // Turns for steps the room has already replayed are refused.
  w.say(a, { t: 'moves', from: fast.moves.length, moves: [[0, 'up']], step: 1 });
  assert.equal(w.last(a, 'error').code, 'bad-moves');
  // A gap in the reports asks for a resend instead of guessing.
  w.say(b, { t: 'moves', from: 5, moves: [], step: 3 });
  assert.equal(w.last(b, 'resend').from, 0);
  // Malformed reports are refused.
  for (const bad of [{ from: -1, moves: [], step: 1 }, { from: 0, moves: 'x', step: 1 }, { from: 0, moves: [[0, 'north']], step: 1 }, { from: 0, moves: [], step: 1.5 }]) {
    w.say(b, { t: 'moves', ...bad });
    assert.equal(w.last(b, 'error').code, 'bad-moves', JSON.stringify(bad));
  }
  // The rest of the round, played honestly, catches up.
  play(w, [fast], startAt + ROUND_MS + BELL_GRACE_MS + 500);
  assert.equal(w.room.players[0].game.score, fast.game.score, 'honest in the end, counted in the end');
}

// ---- Floods are cut off ----------------------------------------------------------------------
{
  const w = world();
  const a = join(w, 1, 'A', true);
  for (let i = 0; i < MAX_MESSAGES_PER_SECOND + 5; i++) w.say(a, { t: 'ping', c: i });
  assert.ok(w.closed.has(a), 'too many messages in a second');
  const b = join(w, 2, 'B');
  w.after(1100);
  w.say(b, 'x'.repeat(20_000));
  assert.ok(w.closed.has(b), 'a message too large');
  // Pings are answered with the room's clock, for the countdown.
  const c = join(w, 3, 'C');
  w.say(c, { t: 'ping', c: 123 });
  assert.deepEqual(w.last(c, 'pong'), { t: 'pong', c: 123, s: w.t });
}

console.log('snake party room: all checks passed');
