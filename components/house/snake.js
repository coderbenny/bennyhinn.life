// Snake, for the terminal on the desk monitor, alone or in a party of up to
// five. Pure game logic: no drawing, no timers, no hidden randomness, so the
// same seed and the same key presses always give the same game. That is what
// makes a party fair (everyone races the same game) and checkable (the room
// replays each player's key presses and arrives at the same score).
//
// The seed is 128 random bits from the platform's secure random generator
// (crypto.getRandomValues), written as 32 hex digits: a fresh, unguessable
// combination for every game. Each fruit's place is drawn from the seed and
// the fruit's number alone, not from the board, so every player in a round
// sees the same fruit in the same places in the same order. If a fruit would
// land on your own snake, it takes the next place drawn for that fruit.

export const GRID = { cols: 28, rows: 15 };

/** A party round lasts at most this long; scores at the bell count. */
export const ROUND_MS = 3 * 60 * 1000;

/** Golden fruit: worth more, rarer, and the same ones for every player. */
export const GOLDEN = { points: 3, oneIn: 6 };

const DIRS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const CELLS = GRID.cols * GRID.rows;
const TRIES = 64; // places drawn for one fruit before falling back to a scan
const GOLDEN_SALT = 0xffff;

const same = (a, b) => a[0] === b[0] && a[1] === b[1];

// ---- Seeds ----------------------------------------------------------------

const SEED = /^[0-9a-f]{32}$/;

/** True for a well-formed seed: 32 lowercase hex digits. */
export const isSeed = (seed) => typeof seed === 'string' && SEED.test(seed);

/** A fresh seed from the secure random generator (browsers, Node and Workers all have it). */
export function randomSeed() {
  const words = new Uint32Array(4);
  globalThis.crypto.getRandomValues(words);
  return [...words].map((n) => n.toString(16).padStart(8, '0')).join('');
}

const seedWords = (seed) => [0, 8, 16, 24].map((i) => parseInt(seed.slice(i, i + 8), 16) >>> 0);

// A strong 32-bit mixer (an avalanche hash): every bit of the input changes
// about half the bits of the output.
function mix(h) {
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** A 32-bit number for fruit `n`, draw `salt`, from all 128 bits of the seed. */
function draw(words, n, salt) {
  let h = mix(words[0] ^ Math.imul(n + 1, 0x9e3779b9));
  h = mix(h ^ words[1] ^ Math.imul(salt + 1, 0x85ebca6b));
  h = mix(h ^ words[2]);
  return mix(h ^ words[3]);
}

/** Where fruit `n` goes, given the snake: null only when the snake fills the board. */
function placeFruit(words, n, snake) {
  const taken = new Set(snake.map(([x, y]) => y * GRID.cols + x));
  if (taken.size >= CELLS) return null;
  for (let t = 0; t < TRIES; t++) {
    const cell = draw(words, n, t) % CELLS;
    if (!taken.has(cell)) return [cell % GRID.cols, Math.floor(cell / GRID.cols)];
  }
  // A nearly full board: the first free cell after the last place drawn.
  const start = draw(words, n, TRIES) % CELLS;
  for (let i = 0; i < CELLS; i++) {
    const cell = (start + i) % CELLS;
    if (!taken.has(cell)) return [cell % GRID.cols, Math.floor(cell / GRID.cols)];
  }
  return null;
}

/** Whether fruit `n` is golden (never the first). */
const isGolden = (words, n) => n > 0 && draw(words, n, GOLDEN_SALT) % GOLDEN.oneIn === 0;

// ---- The game ---------------------------------------------------------------

/**
 * A new game: a three-long snake in the middle, heading right.
 * seed     32 hex digits (randomSeed()); the same seed gives the same fruit
 * roundMs  the round's length (ROUND_MS in a party); no limit when left out
 */
export function newGame(seed = randomSeed(), { roundMs = Infinity } = {}) {
  if (!isSeed(seed)) throw new Error('newGame: the seed must be 32 hex digits');
  const words = seedWords(seed);
  const y = Math.floor(GRID.rows / 2);
  const x = Math.floor(GRID.cols / 3);
  const snake = [
    [x, y],
    [x - 1, y],
    [x - 2, y],
  ];
  return {
    seed,
    words,
    roundMs,
    snake,
    dir: 'right',
    queued: [],
    fruit: 0, // the number of the fruit on the board
    food: placeFruit(words, 0, snake),
    golden: false,
    score: 0, // points: 1 a fruit, GOLDEN.points for a golden one
    eaten: 0, // fruit eaten (sets the speed)
    steps: 0,
    timeMs: 0, // game time: the sum of every step's length
    over: false,
    won: false,
    reason: null, // 'wall' | 'self' | 'time' | 'full'
  };
}

/**
 * Asks the snake to turn. Turns are queued (up to two), so quick presses
 * between steps all count; turning straight back is ignored, and so is a
 * press that changes nothing (the same game comes back).
 */
export function turn(game, dir) {
  if (!DIRS[dir] || game.over) return game;
  const last = game.queued.length ? game.queued[game.queued.length - 1] : game.dir;
  if (dir === last || dir === OPPOSITE[last] || game.queued.length >= 2) return game;
  return { ...game, queued: [...game.queued, dir] };
}

/** Milliseconds between steps: a little quicker for every five fruit eaten, never frantic. */
export const stepMs = (eaten) => Math.max(70, 140 - Math.floor(eaten / 5) * 10);

/** One step: move, eat and grow, or hit a wall or itself and end the game. The bell ends it too. */
export function step(game) {
  if (game.over) return game;
  const dt = stepMs(game.eaten);
  if (game.timeMs + dt > game.roundMs) return { ...game, over: true, reason: 'time' };
  const [dir, ...queued] = game.queued.length ? game.queued : [game.dir];
  const [dx, dy] = DIRS[dir];
  const head = [game.snake[0][0] + dx, game.snake[0][1] + dy];
  const eats = game.food && same(head, game.food);
  // The tail moves out of the way this step unless the snake is growing.
  const body = eats ? game.snake : game.snake.slice(0, -1);
  const moved = { ...game, dir, queued, steps: game.steps + 1, timeMs: game.timeMs + dt };
  const hitsWall = head[0] < 0 || head[1] < 0 || head[0] >= GRID.cols || head[1] >= GRID.rows;
  if (hitsWall) return { ...moved, over: true, reason: 'wall' };
  if (body.some((s) => same(s, head))) return { ...moved, over: true, reason: 'self' };
  const snake = [head, ...body];
  if (!eats) return { ...moved, snake };
  const fruit = game.fruit + 1;
  const food = placeFruit(game.words, fruit, snake);
  return {
    ...moved,
    snake,
    fruit,
    food,
    golden: Boolean(food) && isGolden(game.words, fruit),
    score: game.score + (game.golden ? GOLDEN.points : 1),
    eaten: game.eaten + 1,
    over: !food,
    won: !food,
    reason: food ? null : 'full',
  };
}

// ---- Recording and replaying --------------------------------------------------

/** The most moves a round can hold: two turns a step, at the quickest speed. */
export const MAX_MOVES = Math.ceil(ROUND_MS / 70) * 2;

/**
 * Turns the snake and notes the move for the replay: [step, direction], the
 * step the turn was pressed before. A press that changes nothing isn't noted.
 * Returns { game, move } (move is null when nothing changed).
 */
export function recordTurn(game, dir) {
  const next = turn(game, dir);
  return { game: next, move: next === game ? null : [game.steps, dir] };
}

/** True for a well-formed list of moves: [step, direction] pairs, steps never going back. */
export function isMoves(moves) {
  if (!Array.isArray(moves) || moves.length > MAX_MOVES) return false;
  let last = 0;
  for (const m of moves) {
    if (!Array.isArray(m) || m.length !== 2 || !Number.isInteger(m[0]) || m[0] < last || !DIRS[m[1]]) return false;
    last = m[0];
  }
  return true;
}

/**
 * Plays a game again from its seed and moves: the same game, step for step.
 * untilStep  stop after this many steps (to check a score reported mid-round);
 *            otherwise play until the game ends.
 */
export function replay(seed, moves, { roundMs = ROUND_MS, untilStep = Infinity } = {}) {
  if (!isMoves(moves)) throw new Error('replay: malformed moves');
  let game = newGame(seed, { roundMs });
  let i = 0;
  // Even with no limit, a game can't outlast the round: it ends at the bell.
  while (!game.over && game.steps < untilStep) {
    while (i < moves.length && moves[i][0] === game.steps) game = turn(game, moves[i++][1]);
    game = step(game);
  }
  return game;
}
