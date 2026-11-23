// Checks for the desk terminal and its Snake. Run: npm run test:house
import assert from 'node:assert/strict';
import { run, COMMANDS, PROMPT } from './terminal.js';
import { GRID, newGame, step, turn, stepMs } from './snake.js';

// Commands, with or without the slash, any case.
for (const c of COMMANDS) {
  const [a, b] = [run(`/${c.name}`), run(c.name)];
  assert.deepEqual([a.lines.slice(1), a.action], [b.lines.slice(1), b.action]);
  assert.deepEqual(run(c.name.toUpperCase()).action, run(c.name).action);
}
const help = run('/help');
assert.equal(help.lines[0].text, `${PROMPT} /help`, 'the typed line is echoed');
for (const c of COMMANDS) assert.ok(help.lines.some((l) => l.text.includes(`/${c.name}`)), `help lists /${c.name}`);
assert.ok(run('whoami').lines.some((l) => l.text.includes('Benny Hinn Mathew')));
assert.ok(run('contact').lines.some((l) => l.text.includes('info@bennyhinn.life')));
assert.equal(run('/snake').action, 'snake');
assert.equal(run('clear').action, 'clear');
assert.equal(run('exit').action, 'exit');
assert.equal(run('').lines.length, 1);
const bad = run('rm -rf /');
assert.equal(bad.action, null);
assert.ok(bad.lines.some((l) => l.kind === 'error'));
assert.ok(run('x'.repeat(500)).lines.every((l) => l.text.length < 120), 'long input is cut short');

// Snake: a fixed "random" so the food lands where we say.
const r0 = () => 0; // food at the first free cell
let g = newGame(r0);
assert.equal(g.snake.length, 3);
assert.equal(g.score, 0);
// Moving right one step keeps the length.
const head = g.snake[0];
g = step({ ...g, food: [0, 0] }, r0);
assert.deepEqual(g.snake[0], [head[0] + 1, head[1]]);
assert.equal(g.snake.length, 3);
// Food straight ahead: eat, grow, score.
g = step({ ...g, food: [g.snake[0][0] + 1, g.snake[0][1]] }, r0);
assert.equal(g.snake.length, 4);
assert.equal(g.score, 1);
assert.ok(!g.snake.some((s) => s[0] === g.food[0] && s[1] === g.food[1]), 'new food is never on the snake');
// No turning straight back; queued turns apply one per step.
assert.equal(turn(g, 'left'), g, 'cannot reverse into itself');
let t = turn(turn(g, 'up'), 'left');
assert.deepEqual(t.queued, ['up', 'left']);
t = step({ ...t, food: [0, 0] }, r0);
assert.equal(t.dir, 'up');
t = step({ ...t, food: [0, 0] }, r0);
assert.equal(t.dir, 'left');
// Running into a wall ends the game.
let w = { ...newGame(r0), food: [0, 0] };
for (let i = 0; i < GRID.cols && !w.over; i++) w = step(w, r0);
assert.ok(w.over && !w.won);
assert.equal(step(w, r0), w, 'nothing moves after game over');
// Running into itself ends the game.
let s = { ...newGame(r0), snake: [[5, 5], [4, 5], [4, 6], [5, 6], [6, 6]], dir: 'up', food: [0, 0] };
s = step(turn(s, 'left'), r0); // the head turns left into its own neck at (4, 5)
assert.ok(s.over, 'turning into your own body ends the game');
// Speed: quicker with score, with a floor.
assert.ok(stepMs(0) > stepMs(10) && stepMs(1000) === 70);
console.log('terminal: all checks passed');
