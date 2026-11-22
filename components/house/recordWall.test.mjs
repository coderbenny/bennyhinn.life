// Checks for the record wall in the studio. Run: npm run test:house
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { TRACKS } from '../../constants/music.js';
import { hangRecords, recordExtent, recordImage, recordId, RECORD, WALL } from './recordWall.js';

const records = hangRecords(TRACKS);
assert.equal(records.length, TRACKS.length);
records.forEach((r, i) => {
  assert.equal(r.track, TRACKS[i], 'records keep the order of constants/music.js');
  assert.equal(r.id, recordId(r.track));
  assert.ok(existsSync(`public${recordImage(r.track)}`), `missing ${recordImage(r.track)}: run npm run house:records`);
  assert.ok(RECORD.rowY.includes(r.position[1]));
  assert.ok(r.position[2] > WALL.z && r.position[2] < WALL.z + 0.05, 'records hang just off the back wall');
  const [left, right] = recordExtent(r);
  assert.ok(left >= WALL.from - 1e-9 && right <= WALL.to + 1e-9, `${r.track.title} runs into a bass trap`);
});
// No two records overlap.
for (const a of records) for (const b of records) {
  if (a === b || a.position[1] !== b.position[1]) continue;
  const [al, ar] = recordExtent(a);
  const [bl, br] = recordExtent(b);
  assert.ok(ar + RECORD.gap - 1e-9 <= bl || br + RECORD.gap - 1e-9 <= al, `${a.track.title} and ${b.track.title} overlap`);
}
// Rows: one above the other with room between, the bottom row clear of the
// hi-fi speakers on the cabinet (their tops at 1.28), the top below the neon (2.4).
const [top, bottom] = RECORD.rowY;
assert.ok(top - bottom >= RECORD.sleeve + 0.1);
assert.ok(bottom - RECORD.sleeve / 2 > 1.3 && top + RECORD.sleeve / 2 < 2.4);
// Spotify ids are 22 base-62 characters, so the links and cover names are sound.
for (const t of TRACKS) assert.match(t.spotifyId, /^[0-9A-Za-z]{22}$/);
// Too many tracks, or the same one twice, is caught here rather than on the site.
const many = Array.from({ length: 11 }, (_, i) => ({ title: `T${i}`, with: [], spotifyId: `id${i}` }));
assert.throws(() => hangRecords(many), /do not fit/);
assert.throws(() => hangRecords([TRACKS[0], TRACKS[0]]), /twice/);
console.log('records: all checks passed');
