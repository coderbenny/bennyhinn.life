// Checks for the Snake party's links and what it shows. Run: npm run test:house
import assert from 'node:assert/strict';
import { CODE_ALPHABET, ROOM_CODE, inviteUrl, isRoomCode, newRoomCode, newToken, partyFromSearch, shareText } from './partyLink.js';
import { GO_MS, countdownAt } from './partyView.js';

// Room codes: fresh, well formed, every character of the alphabet in use, no look-alikes.
const codes = Array.from({ length: 5000 }, newRoomCode);
assert.equal(new Set(codes).size, codes.length, 'codes do not repeat');
for (const c of codes) assert.ok(isRoomCode(c), c);
const seen = new Set(codes.join(''));
assert.equal(seen.size, CODE_ALPHABET.length, 'every character turns up');
for (const confusing of '01ilo') assert.ok(!CODE_ALPHABET.includes(confusing), `no ${confusing}`);
// Roughly even use of characters (rejection sampling, no bias).
const counts = [...seen].map((ch) => codes.join('').split(ch).length - 1);
assert.ok(Math.max(...counts) / Math.min(...counts) < 1.25, 'characters are about equally likely');
for (const bad of ['', 'abcdefg', 'abcdefghj', 'ABCDEFGH', 'abcdefg0', 'abc defg', null, 12345678]) assert.ok(!isRoomCode(bad), String(bad));
assert.ok(ROOM_CODE.test('k7q2mxab'));
// Tokens: 32 hex digits, fresh every time.
const t = new Set(Array.from({ length: 1000 }, newToken));
assert.equal(t.size, 1000);
for (const x of t) assert.match(x, /^[0-9a-f]{32}$/);

// Invite links round-trip; anything else in the address is ignored.
const code = newRoomCode();
const url = inviteUrl('https://bennyhinn.life', code);
assert.equal(url, `https://bennyhinn.life/?room=monitor&party=${code}`);
assert.equal(partyFromSearch(new URL(url).search), code);
assert.equal(partyFromSearch('?room=monitor'), null);
assert.equal(partyFromSearch('?party=<script>'), null);
assert.equal(partyFromSearch('?party=ABCDEFGH'), null);
assert.ok(shareText('Ana').startsWith('Ana invites you'));
assert.ok(shareText(null).includes('Snake'));

// The countdown: 3, 2, 1, GO, then nothing.
const start = 100_000;
assert.equal(countdownAt(start, start - 3500), 3, 'starts at 3, never 4');
assert.equal(countdownAt(start, start - 2999), 3);
assert.equal(countdownAt(start, start - 2000), 2);
assert.equal(countdownAt(start, start - 1001), 2);
assert.equal(countdownAt(start, start - 1), 1);
assert.equal(countdownAt(start, start), 0, 'GO at the start');
assert.equal(countdownAt(start, start + GO_MS - 1), 0);
assert.equal(countdownAt(start, start + GO_MS), -1);
assert.equal(countdownAt(null, start), -1);

console.log('snake party links: all checks passed');

// ---- The race: time, ranking, the reveal ----
{
  const { timeLeft, finalSeconds, clock, liveRanking, medal, revealed, REVEAL_MS, resultsText } = await import('./partyView.js');
  assert.equal(timeLeft(null, 5), null);
  assert.equal(timeLeft(10_000, 4_000), 6_000);
  assert.equal(timeLeft(10_000, 12_000), 0);
  assert.equal(finalSeconds(100_000, 100_000 - 10_001), null, 'quiet until the last ten seconds');
  assert.equal(finalSeconds(100_000, 100_000 - 10_000), 10);
  assert.equal(finalSeconds(100_000, 100_000 - 1), 1);
  assert.equal(finalSeconds(100_000, 100_000), null);
  assert.equal(clock(180_000), '3:00');
  assert.equal(clock(61_001), '1:02');
  assert.equal(clock(9_000), '0:09');

  const players = [
    { id: 'p1', name: 'Benny', score: 4, status: 'out' },
    { id: 'p2', name: 'Ana', score: 4, status: 'playing' },
    { id: 'p3', name: 'Joe', score: 9, status: 'playing' },
    { id: 'p4', name: 'Kim', score: 0, status: 'left' },
  ];
  const r = liveRanking(players);
  assert.deepEqual(
    r.map((x) => x.name),
    ['Joe', 'Ana', 'Benny', 'Kim'],
    'by score; on a tie, the one still playing first'
  );
  assert.deepEqual(
    r.map((x) => x.place),
    [1, 2, 2, 4],
    'a tie shares a place'
  );
  // Your own score from your screen, a moment ahead of the room's (never behind it).
  const mine = liveRanking(players, 'p1', 12);
  assert.equal(mine[0].name, 'Benny');
  assert.equal(liveRanking(players, 'p1', 2).find((x) => x.id === 'p1').score, 4);
  assert.equal(medal(1), '🥇');
  assert.equal(medal(4), '4.');
  // The reveal: one row, then one more every REVEAL_MS, never more than there are.
  assert.equal(revealed(4, 0), 1);
  assert.equal(revealed(4, REVEAL_MS - 1), 1);
  assert.equal(revealed(4, REVEAL_MS), 2);
  assert.equal(revealed(4, REVEAL_MS * 10), 4);
  const text = resultsText({ ranking: [{ place: 1, name: 'Joe', score: 9 }, { place: 2, name: 'Ana', score: 4 }] });
  assert.ok(text.includes('🥇 Joe: 9') && text.includes('🥈 Ana: 4') && text.includes('bennyhinn.life'));
}
console.log('snake party race: all checks passed');
