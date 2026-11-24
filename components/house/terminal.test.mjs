// Checks for the desk terminal and its Snake. Run: npm run test:house
import assert from 'node:assert/strict';
import { run, COMMANDS, PROMPT } from './terminal.js';

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
assert.equal(run('/party').action, 'party');
assert.equal(run('clear').action, 'clear');
assert.equal(run('exit').action, 'exit');
assert.equal(run('').lines.length, 1);
const bad = run('rm -rf /');
assert.equal(bad.action, null);
assert.ok(bad.lines.some((l) => l.kind === 'error'));
assert.ok(run('x'.repeat(500)).lines.every((l) => l.text.length < 120), 'long input is cut short');

// Snake's own rules are checked in snake.test.mjs.
console.log('terminal: all checks passed');
