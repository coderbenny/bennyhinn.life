// Checks for the projects gallery. Run: npm run test:house
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { PROJECTS } from '../../constants/projects.js';
import { hang, SPANS, WALLS, FRAME, LARGE_FRAMES, shortName, subtitle, slugOf, frameImage } from './galleryLayout.js';

const frames = hang(PROJECTS);
assert.equal(frames.length, PROJECTS.length);
frames.forEach((f, i) => {
  assert.equal(f.project, PROJECTS[i], 'frames keep the order of constants/projects.js');
  assert.equal(f.width, i < LARGE_FRAMES ? FRAME.largeWidth : FRAME.smallWidth);
  assert.ok(existsSync(`public${frameImage(f.project)}`), `missing ${frameImage(f.project)}: run npm run house:frames`);
  assert.equal(f.position[0], WALLS[f.wall].x);
});
// Every frame lies inside a span of its wall, and none overlap.
const half = (f) => f.width / 2 + FRAME.border + FRAME.mat;
for (const f of frames) {
  const z = f.position[2];
  assert.ok(SPANS.some((s) => s.wall === f.wall && z + half(f) <= s.from + 1e-9 && z - half(f) >= s.to - 1e-9), `${f.name} off its span`);
}
const halfH = (f) => f.height / 2 + FRAME.border + FRAME.mat;
for (const a of frames) for (const b of frames) {
  if (a === b || a.wall !== b.wall) continue;
  const apartZ = Math.abs(a.position[2] - b.position[2]) >= half(a) + half(b) + FRAME.minGap - 1e-9;
  // Two high: one above the other, with room for the top frame's label between.
  const apartY = Math.abs(a.position[1] - b.position[1]) >= halfH(a) + halfH(b) + 0.2;
  assert.ok(apartZ || apartY, `${a.name} and ${b.name} overlap`);
}
// Frames stay below the ceiling (3.25) and above the floor (0.38), labels included.
for (const f of frames) assert.ok(f.position[1] + halfH(f) < 3.1 && f.position[1] - halfH(f) - 0.2 > 0.6, `${f.name} height`);
// The camera stands in the gallery (x between the walls) and faces its frame.
for (const f of frames) {
  const x = f.view.pos[0];
  assert.ok(x > WALLS.left.x + 0.5 && x < WALLS.right.x - 0.5, `${f.name} view outside the gallery`);
}
// Names.
assert.equal(shortName(PROJECTS[0]), 'Tizi Plus');
assert.equal(subtitle(PROJECTS[0]), 'Multi-Gym Membership Network');
assert.equal(slugOf(PROJECTS[0]), 'tizi');
// Too many projects, or two with the same screenshot name, are caught.
assert.throws(() => hang([...PROJECTS, ...PROJECTS.slice(3).map((p, i) => ({ ...p, image: `/projects/extra${i}.png` }))]), /do not fit/);
assert.throws(() => hang([PROJECTS[0], PROJECTS[0]]), /share/);
for (const f of frames) console.log(f.wall.padEnd(6), f.position[2].toFixed(2).padStart(7), f.position[1].toFixed(2), f.name);
console.log('gallery: all checks passed');
