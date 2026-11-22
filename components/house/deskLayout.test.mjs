// Checks for the desk nook: corkboard cards and the commit on the monitor. Run: npm run test:house
import assert from 'node:assert/strict';
import { EXPERIENCE } from '../../constants/experience.js';
import { BOARD, CARDS, CONTACT_CARD_ID, pinCards, parseCommit, timeSince, commitUrl } from './deskLayout.js';

// One card per role, in order, then the contact card.
assert.equal(CARDS.length, EXPERIENCE.length + 1);
EXPERIENCE.forEach((r, i) => assert.equal(CARDS[i].role, r));
assert.equal(CARDS.at(-1).id, CONTACT_CARD_ID);
// Every card, tilt and all, stays on the cork, and no two overlap.
for (const c of CARDS) {
  const reach = Math.hypot(c.width, c.height) / 2; // the furthest a tilted corner can go
  const [, y, z] = c.position;
  assert.ok(z - c.width / 2 >= BOARD.centreZ - BOARD.width / 2 && z + c.width / 2 <= BOARD.centreZ + BOARD.width / 2, `${c.id} off the board sideways`);
  const corner = c.height / 2 * Math.cos(c.tilt) + c.width / 2 * Math.abs(Math.sin(c.tilt));
  assert.ok(y - corner >= BOARD.centreY - BOARD.height / 2 && y + corner <= BOARD.centreY + BOARD.height / 2, `${c.id} off the board vertically`);
  assert.ok(reach > 0 && c.position[0] < BOARD.x, 'cards sit just in front of the cork');
}
for (let i = 1; i < CARDS.length; i++) {
  const a = CARDS[i - 1], b = CARDS[i];
  assert.ok(b.position[2] - b.width / 2 - (a.position[2] + a.width / 2) >= 0.04, `${a.id} and ${b.id} overlap`);
}
assert.throws(() => pinCards([...EXPERIENCE, ...EXPERIENCE]), /do not fit/);

// The commit set by next.config.mjs.
const c = parseCommit(JSON.stringify({ sha: '19edd99aaaabbbbccccddddeeeeffff000011112', date: '2026-11-22T16:52:34+03:00', message: 'Hang the records' }));
assert.equal(c.short, '19edd99');
assert.equal(c.message, 'Hang the records');
assert.equal(commitUrl(c), 'https://github.com/coderbenny/bennyhinn.life/commit/19edd99aaaabbbbccccddddeeeeffff000011112');
for (const bad of [undefined, 'null', 'nonsense', JSON.stringify({ sha: 'not hex', date: '2026-01-01' }), JSON.stringify({ sha: 'abcdef1', date: 'never' })]) {
  assert.equal(parseCommit(bad), null, `rejects ${bad}`);
}
// Time since, in words.
const t0 = new Date('2026-11-22T12:00:00Z');
const after = (s) => timeSince(t0, new Date(t0.getTime() + s * 1000));
assert.equal(after(5), 'just now');
assert.equal(after(60), '1 minute ago');
assert.equal(after(150), '2 minutes ago');
assert.equal(after(3 * 3600), '3 hours ago');
assert.equal(after(30 * 3600), 'yesterday');
assert.equal(after(12 * 86400), '12 days ago');
assert.equal(after(70 * 86400), '2 months ago');
assert.equal(after(800 * 86400), '2 years ago');
assert.equal(after(-50), 'just now', 'a clock behind the commit does not go negative');
console.log('desk: all checks passed');
