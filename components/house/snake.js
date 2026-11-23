// Snake, for the terminal on the desk monitor. Pure game logic: no drawing,
// no timers, no randomness of its own (the caller passes `random`), so it can
// be checked step by step.

export const GRID = { cols: 28, rows: 15 };

const DIRS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

const same = (a, b) => a[0] === b[0] && a[1] === b[1];

/** A free cell for the food, or null if the snake fills the board. */
function placeFood(snake, random) {
  const free = [];
  for (let y = 0; y < GRID.rows; y++) {
    for (let x = 0; x < GRID.cols; x++) {
      if (!snake.some((s) => s[0] === x && s[1] === y)) free.push([x, y]);
    }
  }
  return free.length ? free[Math.floor(random() * free.length)] : null;
}

/** A new game: a three-long snake in the middle, heading right. */
export function newGame(random = Math.random) {
  const y = Math.floor(GRID.rows / 2);
  const x = Math.floor(GRID.cols / 3);
  const snake = [
    [x, y],
    [x - 1, y],
    [x - 2, y],
  ];
  return { snake, dir: 'right', queued: [], food: placeFood(snake, random), score: 0, over: false, won: false };
}

/**
 * Asks the snake to turn. Turns are queued (up to two), so quick presses
 * between steps all count; turning straight back is ignored.
 */
export function turn(game, dir) {
  if (!DIRS[dir] || game.over) return game;
  const last = game.queued.length ? game.queued[game.queued.length - 1] : game.dir;
  if (dir === last || dir === OPPOSITE[last] || game.queued.length >= 2) return game;
  return { ...game, queued: [...game.queued, dir] };
}

/** One step: move, eat and grow, or hit a wall or itself and end the game. */
export function step(game, random = Math.random) {
  if (game.over) return game;
  const [dir, ...queued] = game.queued.length ? game.queued : [game.dir];
  const [dx, dy] = DIRS[dir];
  const head = [game.snake[0][0] + dx, game.snake[0][1] + dy];
  const eats = game.food && same(head, game.food);
  // The tail moves out of the way this step unless the snake is growing.
  const body = eats ? game.snake : game.snake.slice(0, -1);
  const hitsWall = head[0] < 0 || head[1] < 0 || head[0] >= GRID.cols || head[1] >= GRID.rows;
  if (hitsWall || body.some((s) => same(s, head))) return { ...game, dir, queued, over: true };
  const snake = [head, ...body];
  if (!eats) return { ...game, snake, dir, queued };
  const food = placeFood(snake, random);
  return { ...game, snake, dir, queued, food, score: game.score + 1, over: !food, won: !food };
}

/** Milliseconds between steps: a little quicker for every five eaten, never frantic. */
export const stepMs = (score) => Math.max(70, 140 - Math.floor(score / 5) * 10);
