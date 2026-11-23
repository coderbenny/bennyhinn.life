// Checks for the clock and the wall calendar. Run: npm run test:house
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { nairobiTime, handAngles, monthGrid, monthTotal, dayKey } from './wallTime.js';

// Nairobi is UTC+3, across the date line too.
let t = nairobiTime(new Date('2026-11-22T21:30:00Z'));
assert.deepEqual([t.year, t.month, t.day, t.hours, t.minutes], [2026, 10, 23, 0, 30]);
t = nairobiTime(new Date('2026-12-31T22:00:00Z'));
assert.deepEqual([t.year, t.month, t.day, t.hours], [2027, 0, 1, 1]);
assert.equal(nairobiTime(new Date('2026-11-23T09:00:00Z')).weekday, 1, '23 November 2026 is a Monday');

// Hands: 3:00 has the hour hand at a quarter turn; 9:30 has it halfway between 9 and 10.
const q = Math.PI / 2;
assert.ok(Math.abs(handAngles({ hours: 15, minutes: 0, seconds: 0 }).hour - q) < 1e-9);
assert.ok(Math.abs(handAngles({ hours: 9, minutes: 30, seconds: 0 }).hour - (9.5 / 12) * 2 * Math.PI) < 1e-9);
assert.ok(Math.abs(handAngles({ hours: 0, minutes: 15, seconds: 0 }).minute - q) < 1e-9);
assert.equal(handAngles({ hours: 0, minutes: 0, seconds: 30.7 }).second, Math.PI, 'the second hand ticks, it does not sweep');

// November 2026 starts on a Sunday: six blanks before the 1st, Monday first.
const nov = monthGrid(2026, 10);
assert.deepEqual(nov[0], [null, null, null, null, null, null, 1]);
assert.equal(nov.flat().filter(Boolean).length, 30);
assert.ok(nov.every((w) => w.length === 7));
assert.equal(monthGrid(2027, 1).flat().filter(Boolean).length, 28);
assert.equal(monthGrid(2028, 1).flat().filter(Boolean).length, 29, 'leap year');
assert.equal(monthGrid(2027, 1)[0][0], 1, 'February 2027 starts on a Monday');
assert.equal(dayKey(2026, 0, 5), '2026-01-05');

// The contributions file the build writes.
const file = 'public/house/contributions.json';
assert.ok(existsSync(file), `missing ${file}: run npm run house:contributions`);
const data = JSON.parse(readFileSync(file, 'utf8'));
assert.ok(['github', 'git'].includes(data.source));
for (const [k, d] of Object.entries(data.days)) {
  assert.match(k, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Number.isInteger(d.count) && d.count >= 0 && d.level >= 0 && d.level <= 4);
}
assert.equal(Object.values(data.days).reduce((s, d) => s + d.count, 0), data.total);
assert.equal(monthTotal({ '2026-11-01': { count: 3 }, '2026-11-30': { count: 2 }, '2026-10-31': { count: 9 } }, 2026, 10), 5);
console.log('wall time: all checks passed');
