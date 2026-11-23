// Checks for the arrivals board in the hall. Run: npm run test:house
import assert from 'node:assert/strict';
import { BOARD, FLAPS, nextFlap, flapsBetween, fitLine, greeting, messages, boardPage, PAGE_COUNT } from './splitFlap.js';

// A wheel turns one way, one flap at a time, and arrives.
assert.equal(nextFlap('A', 'C'), 'B');
assert.equal(nextFlap('B', 'C'), 'C');
assert.equal(nextFlap('C', 'C'), 'C');
assert.equal(nextFlap("'", 'A'), ' ', 'wraps round from the last flap');
for (const [a, b] of [[' ', 'Z'], ['Z', 'A'], ['9', '9'], ['?', ' ']]) {
  let c = a;
  let n = 0;
  while (c !== b && n < 100) { c = nextFlap(c, b); n++; }
  assert.equal(c, b);
  assert.equal(n, flapsBetween(a, b));
}
// Lines: upper case, centred, exactly the board's width, unknown characters blanked.
assert.equal(fitLine('hi'), '        HI        ');
assert.equal(fitLine('x'.repeat(40)).length, BOARD.cols);
assert.equal(fitLine('Café €5').trim(), 'CAF   5', 'letters the board lacks become blanks');
assert.ok(fitLine('Café €5').split('').every((c) => FLAPS.includes(c)));
// Greetings by the hour in Nairobi.
assert.equal(greeting(8), 'Good morning');
assert.equal(greeting(14), 'Good afternoon');
assert.equal(greeting(20), 'Good evening');
assert.equal(greeting(3), 'Hello, night owl');
// Every message fits the board, and the pages cycle.
for (const [a, b] of messages()) {
  assert.ok(a.length <= BOARD.cols && b.length <= BOARD.cols, `"${a}" / "${b}" is too long for the board`);
}
for (let p = 0; p < PAGE_COUNT; p++) {
  const page = boardPage(p, 9);
  assert.equal(page.length, BOARD.rows);
  assert.ok(page.every((l) => l.length === BOARD.cols));
}
assert.deepEqual(boardPage(PAGE_COUNT, 9), boardPage(0, 9));
assert.ok(boardPage(0, 9)[1].includes('GOOD MORNING'));
console.log('arrivals board: all checks passed');
