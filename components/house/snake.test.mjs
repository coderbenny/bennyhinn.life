// Checks for Snake: the rules, the seeds, and that a party round can be
// replayed exactly. Run: npm run test:house
import assert from 'node:assert/strict';
import { GOLDEN, GRID, MAX_MOVES, ROUND_MS, isMoves, isSeed, newGame, randomSeed, recordTurn, replay, step, stepMs, turn } from './snake.js';

const SEED = '0123456789abcdef0123456789abcdef';

// ---- Seeds: random, well formed, and they matter ----
const seeds = new Set(Array.from({ length: 2000 }, randomSeed));
assert.equal(seeds.size, 2000, 'every seed is new');
for (const s of seeds) assert.ok(isSeed(s), s);
for (const bad of ['', 'abc', SEED.toUpperCase(), `${SEED}0`, 'g'.repeat(32), 42, null]) assert.ok(!isSeed(bad), String(bad));
assert.throws(() => newGame('not a seed'));
// Different seeds put the first fruit in many different places.
const firsts = new Set([...seeds].map((s) => newGame(s).food.join()));
assert.ok(firsts.size > 300, `first fruit lands all over the board (${firsts.size} places)`);
// A one-bit change in the seed moves the fruit (all 128 bits count).
for (let i = 0; i < 32; i++) {
  const flipped = SEED.slice(0, i) + ((parseInt(SEED[i], 16) ^ 1).toString(16)) + SEED.slice(i + 1);
  const g1 = newGame(SEED);
  const g2 = newGame(flipped);
  // The first few fruit, eaten by teleporting the head onto them.
  const path = (g) => {
    const out = [];
    for (let n = 0; n < 6; n++) {
      out.push(g.food.join());
      g = step({ ...g, snake: [[g.food[0] - 1, g.food[1]], ...g.snake.slice(1)], dir: 'right', queued: [] });
    }
    return out.join('|');
  };
  assert.notEqual(path(g1), path(g2), `hex digit ${i} of the seed changes the fruit`);
}

// ---- Same seed, same fruit for everyone, wherever their snakes are ----
// Two players' snakes lie differently on the board (one trails off to the
// left, one curls below); the n-th fruit lands in the same place for both
// unless it would fall on one of them.
{
  // Puts the head just left of the fruit and steps onto it. The body trails
  // left (`flat`) or down then left (`curled`), clipped to the board.
  const inside = ([x, y]) => x >= 0 && y >= 0 && x < GRID.cols && y < GRID.rows;
  const eat = (g, shape) => {
    const [fx, fy] = g.food;
    const body = [];
    for (let i = 0; body.length < g.snake.length - 1 && i < 60; i++) {
      const c = shape === 'flat' ? [fx - 2 - i, fy] : i < 3 ? [fx - 1, fy + 1 + i] : [fx - 2 - (i - 3), fy + 3];
      if (inside(c)) body.push(c);
    }
    return step({ ...g, snake: [[fx - 1, fy], ...body], dir: 'right', queued: [] });
  };
  let a = newGame(SEED);
  let b = newGame(SEED);
  assert.deepEqual(a.food, b.food);
  let shared = 0;
  let n = 0;
  for (; n < 40 && !a.over && !b.over; n++) {
    if (a.food[0] === 0 || b.food[0] === 0) break; // no room to stand left of it
    a = eat(a, 'flat');
    b = eat(b, 'curled');
    if (a.over || b.over) break;
    assert.equal(a.fruit, b.fruit);
    assert.equal(a.golden, b.golden, 'golden fruit are the same for everyone');
    if (a.food.join() === b.food.join()) shared++;
  }
  assert.ok(n >= 10 && shared >= n - 3, `the same fruit in the same place (${shared} of ${n})`);
}

// ---- The rules ----
let g = newGame(SEED);
assert.equal(g.snake.length, 3);
assert.equal(g.score, 0);
assert.ok(!g.golden, 'the first fruit is never golden');
assert.ok(!g.snake.some((s) => s[0] === g.food[0] && s[1] === g.food[1]), 'fruit never starts on the snake');
// Moving right one step keeps the length, and counts time.
const head = g.snake[0];
g = step({ ...g, food: [0, 0] });
assert.deepEqual(g.snake[0], [head[0] + 1, head[1]]);
assert.equal(g.snake.length, 3);
assert.equal(g.steps, 1);
assert.equal(g.timeMs, stepMs(0));
// Food straight ahead: eat, grow, score; the next fruit is never on the snake.
g = step({ ...g, food: [g.snake[0][0] + 1, g.snake[0][1]], golden: false });
assert.equal(g.snake.length, 4);
assert.equal(g.score, 1);
assert.equal(g.eaten, 1);
assert.ok(!g.snake.some((s) => s[0] === g.food[0] && s[1] === g.food[1]));
// A golden fruit is worth more.
const gold = step({ ...g, food: [g.snake[0][0] + 1, g.snake[0][1]], golden: true });
assert.equal(gold.score, g.score + GOLDEN.points);
assert.equal(gold.eaten, g.eaten + 1);
// No turning straight back; queued turns apply one per step.
assert.equal(turn(g, 'left'), g, 'cannot reverse into itself');
assert.equal(turn(g, 'right'), g, 'pressing the way you are going changes nothing');
let t = turn(turn(g, 'up'), 'left');
assert.deepEqual(t.queued, ['up', 'left']);
assert.equal(turn(t, 'down'), t, 'at most two turns queued');
t = step({ ...t, food: [0, 0] });
assert.equal(t.dir, 'up');
t = step({ ...t, food: [0, 0] });
assert.equal(t.dir, 'left');
// Walls and your own body end the game, and say why.
let w = { ...newGame(SEED), food: [0, 0] };
for (let i = 0; i < GRID.cols && !w.over; i++) w = step(w);
assert.ok(w.over && !w.won && w.reason === 'wall');
assert.equal(step(w), w, 'nothing moves after game over');
let s = { ...newGame(SEED), snake: [[5, 5], [4, 5], [4, 6], [5, 6], [6, 6]], dir: 'up', food: [0, 0] };
s = step(turn(s, 'left'));
assert.ok(s.over && s.reason === 'self');
// Speed: quicker with fruit eaten (not points), with a floor.
assert.ok(stepMs(0) > stepMs(10) && stepMs(1000) === 70);

// ---- The bell: a party round ends at ROUND_MS ----
{
  // A snake that laps the edge of the board, clockwise, until the bell (or
  // until it grows long enough to catch its own tail).
  const lap = [];
  let game = newGame(SEED, { roundMs: ROUND_MS });
  const route = (gm) => {
    const [x, y] = gm.snake[0];
    if (gm.dir === 'right' && x === GRID.cols - 1) return 'down';
    if (gm.dir === 'down' && y === GRID.rows - 1) return 'left';
    if (gm.dir === 'left' && x === 0) return 'up';
    if (gm.dir === 'up' && y === 0) return 'right';
    return null;
  };
  // Start by heading up to the top edge.
  const first = recordTurn(game, 'up');
  game = first.game;
  lap.push(first.move);
  while (!game.over) {
    const d = route(game);
    if (d) {
      const r = recordTurn(game, d);
      game = r.game;
      if (r.move) lap.push(r.move);
    }
    game = step(game);
  }
  assert.equal(game.reason === 'time' || game.reason === 'self', true, game.reason);
  if (game.reason === 'time') assert.ok(game.timeMs <= ROUND_MS && game.timeMs + stepMs(game.eaten) > ROUND_MS, 'stops at the bell');
  // Without a limit, solo games go on.
  assert.equal(newGame(SEED).roundMs, Infinity);
  // And the replay of that lap is the same game.
  const again = replay(SEED, lap, { roundMs: ROUND_MS });
  assert.deepEqual([again.score, again.steps, again.reason], [game.score, game.steps, game.reason]);
}

// ---- Replays: a recorded game plays back exactly ----
// A bot that steers towards the fruit, recording its moves the way the
// terminal does; the replay must reach the same snake, score and end.
function bot(seed, { roundMs = ROUND_MS, cheat = false } = {}) {
  let game = newGame(seed, { roundMs });
  const moves = [];
  for (let i = 0; i < 5000 && !game.over; i++) {
    const [hx, hy] = game.snake[0];
    const [fx, fy] = game.food;
    const want = fx > hx ? 'right' : fx < hx ? 'left' : fy > hy ? 'down' : 'up';
    const r = recordTurn(game, want);
    game = r.game;
    if (r.move) moves.push(r.move);
    // Two quick presses between steps, now and then, both recorded.
    if (i % 17 === 0) {
      const r2 = recordTurn(game, game.dir === 'up' || game.dir === 'down' ? 'left' : 'up');
      game = r2.game;
      if (r2.move) moves.push(r2.move);
    }
    game = step(game);
  }
  if (cheat) game = { ...game, score: game.score + 5 };
  return { game, moves };
}
let checked = 0;
for (const seed of [...seeds].slice(0, 60)) {
  const { game, moves } = bot(seed);
  assert.ok(isMoves(moves));
  const again = replay(seed, moves);
  assert.deepEqual(again.snake, game.snake, 'same snake');
  assert.deepEqual([again.score, again.eaten, again.steps, again.reason], [game.score, game.eaten, game.steps, game.reason]);
  // Part-way: the score after N steps matches too (how the room checks live scores).
  const half = Math.floor(game.steps / 2);
  let partial = newGame(seed, { roundMs: ROUND_MS });
  let j = 0;
  while (partial.steps < half) {
    while (j < moves.length && moves[j][0] === partial.steps) partial = turn(partial, moves[j++][1]);
    partial = step(partial);
  }
  assert.equal(replay(seed, moves, { untilStep: half }).score, partial.score);
  checked++;
}
assert.equal(checked, 60);
// A doctored score doesn't survive the replay.
{
  const { game, moves } = bot(SEED, { cheat: true });
  assert.notEqual(replay(SEED, moves).score, game.score, 'a faked score is caught');
}
// A different seed with the same moves is a different game.
{
  const { game, moves } = bot(SEED);
  const other = replay('f'.repeat(32), moves);
  assert.ok(other.score !== game.score || other.steps !== game.steps || other.snake.join() !== game.snake.join());
}
// Golden fruit turn up about one time in six.
{
  let golden = 0;
  let total = 0;
  for (const seed of [...seeds].slice(0, 400)) {
    let gm = newGame(seed);
    for (let n = 0; n < 10; n++) {
      gm = step({ ...gm, snake: [[gm.food[0] - 1, gm.food[1]], ...gm.snake.slice(1)], dir: 'right', queued: [] });
      if (gm.over) break;
      total++;
      if (gm.golden) golden++;
    }
  }
  const share = golden / total;
  assert.ok(share > 0.12 && share < 0.22, `golden share ${share.toFixed(3)}`);
}
// Malformed moves are refused.
for (const bad of [null, {}, [[0]], [[0, 'north']], [[3, 'up'], [2, 'left']], [[-1, 'up']], [[0.5, 'up']], Array(MAX_MOVES + 1).fill([0, 'up'])]) {
  assert.ok(!isMoves(bad), JSON.stringify(bad)?.slice(0, 40));
  assert.throws(() => replay(SEED, bad));
}
// A replay never runs past the bell, even with a huge step count asked for.
assert.ok(replay(SEED, [], { roundMs: ROUND_MS }).over);

console.log('snake: all checks passed');
