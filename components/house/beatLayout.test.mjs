// Checks for the beat station in the studio. Run: npm run test:house
import assert from 'node:assert/strict';
import { PADS, PAD_SOUNDS, PAD_KEYS, KEYS, noteName, noteHz } from './beatLayout.js';

assert.equal(PADS.length, 16);
assert.equal(PAD_SOUNDS.length, 16);
assert.equal(new Set(PAD_KEYS).size, 16);
PADS.forEach((p, i) => assert.equal(p.index, i));
// Pad 1 (kick) is bottom-left as you sit: nearest you (largest x) and furthest left (largest z).
const kick = PADS[0];
assert.ok(PADS.every((p) => p.position[0] <= kick.position[0] + 1e-9 && p.position[2] <= kick.position[2] + 1e-9));
// The keyboard: 49 keys, 29 white and 20 black, notes C2 to C6 with none twice.
assert.equal(KEYS.length, 49);
assert.equal(KEYS.filter((k) => k.black).length, 20);
const notes = KEYS.map((k) => k.note).sort((a, b) => a - b);
assert.deepEqual(notes, Array.from({ length: 49 }, (_, i) => 36 + i));
assert.equal(noteName(36), 'C2');
assert.equal(noteName(61), 'C#4');
assert.ok(Math.abs(noteHz(69) - 440) < 1e-9);
// Going up the keyboard goes to your right (towards -z), and black keys sit between whites.
const whites = KEYS.filter((k) => !k.black);
for (let i = 1; i < whites.length; i++) assert.ok(whites[i].position[2] < whites[i - 1].position[2]);
for (const b of KEYS.filter((k) => k.black)) {
  const below = KEYS.find((k) => !k.black && k.note === b.note - 1);
  assert.ok(b.position[2] < below.position[2] && b.position[1] > below.position[1]);
}
console.log('beat station: all checks passed');
