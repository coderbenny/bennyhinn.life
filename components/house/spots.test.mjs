// Checks for the routes between spots. Run: npm run test:house
import assert from 'node:assert/strict';
import { SPOTS, HOTSPOTS, route, lineage, withLooks, spotFromSearch, spotUrl, walkSeconds, isSpot } from './spots.js';
const p = (id) => SPOTS[id].pos;
const ids = Object.keys(SPOTS);
// every route starts at `from`, ends at `to`, has no repeated neighbours
for (const a of ids) for (const b of ids) {
  const r = route(a, b);
  assert.deepEqual(r[0].pos, p(a), `${a}->${b} start`);
  assert.deepEqual(r.at(-1).pos, p(b), `${a}->${b} end`);
  for (let i = 1; i < r.length; i++) assert.notDeepEqual(r[i].pos, r[i - 1].pos);
  // every point gets a look after withLooks
  assert.ok(withLooks(r).every((q) => Array.isArray(q.look) && q.look.every(Number.isFinite)));
  if (a === b) assert.equal(r.length, 1);
}
// going there and back are mirror images
for (const a of ids) for (const b of ids) assert.deepEqual(route(a, b).map((q) => q.pos), route(b, a).map((q) => q.pos).reverse());
// living -> studio passes the entry and the gallery
const ls = route('living', 'studio').map((q) => q.pos);
assert.ok(ls.some((q) => q === p('entry')) && ls.some((q) => q === p('gallery')));
// walkway -> entry goes through the porch
assert.deepEqual(route('walkway', 'entry').map((q) => q.pos), [p('walkway'), [-0.6, 1.6, 3.4], p('entry')]);
assert.deepEqual(lineage('desk'), ['walkway', 'entry', 'gallery', 'desk']);
assert.throws(() => lineage('attic'));
// URLs
assert.equal(spotFromSearch('?room=studio'), 'studio');
assert.equal(spotFromSearch('?room=attic'), 'walkway');
assert.equal(spotFromSearch('?room=__proto__'), 'walkway');
assert.equal(spotFromSearch('?room=constructor'), 'walkway');
assert.equal(spotFromSearch(''), 'walkway');
assert.equal(spotUrl('walkway'), '/');
assert.equal(spotUrl('desk'), '/?room=desk');
for (const id of ids) assert.equal(spotFromSearch(spotUrl(id).slice(1)), id);
assert.equal(isSpot(undefined), false);
// hotspots point at real spots that are children of their spot
for (const [id, hs] of Object.entries(HOTSPOTS)) for (const h of hs) assert.equal(SPOTS[h.to].parent, id);
// walk times
assert.equal(walkSeconds(0), 1.2); assert.equal(walkSeconds(1000), 4);
console.log('spots: all checks passed');
