// The places the camera can stand, and how it walks between them.
//
// Spots form a tree rooted at the walkway: each spot names its parent and the
// points the camera passes through on the way from the parent (doorways), so
// every move follows the rooms instead of cutting through walls.
//
// Coordinates are three.js metres. The house is modelled in Blender
// (scripts/blender/walkway.py), where a point (x, y, z) becomes (x, z, -y)
// here. Floors are at y = 0.38, eye height is 1.6.

const EYE = 1.6;

export const SPOTS = {
  walkway: {
    label: 'Outside',
    parent: null,
    pos: [0.2, EYE, 13.6],
    look: [-0.4, 1.45, 1.0],
    fov: 45,
  },
  entry: {
    label: 'Entry',
    parent: 'walkway',
    // Up the path, through the porch and the front door.
    via: [{ pos: [-0.6, EYE, 3.4], look: [-0.6, 1.5, 0] }],
    pos: [-0.6, EYE, -0.55],
    look: [-0.5, 1.35, -4.2],
    fov: 55,
  },
  living: {
    label: 'Living room',
    parent: 'entry',
    via: [{ pos: [-0.45, EYE, -2.9] }, { pos: [0.25, EYE, -2.9] }, { pos: [1.5, EYE, -2.4] }],
    pos: [3.6, 1.55, -0.9],
    look: [1.3, 1.25, -3.7],
    fov: 55,
  },
  gallery: {
    label: 'Gallery',
    parent: 'entry',
    via: [{ pos: [-0.6, EYE, -4.3] }],
    pos: [-0.6, EYE, -5.0],
    look: [-0.6, 1.45, -12.4],
    fov: 55,
  },
  studio: {
    label: 'Studio',
    parent: 'gallery',
    via: [{ pos: [-0.6, EYE, -9.6] }, { pos: [-1.7, EYE, -9.6] }],
    pos: [-1.95, EYE, -9.6],
    look: [-4.4, 1.15, -10.0],
    fov: 60,
  },
  desk: {
    label: 'Desk',
    parent: 'gallery',
    via: [{ pos: [-0.6, EYE, -10.8] }, { pos: [0.5, EYE, -10.8] }],
    pos: [1.1, EYE, -10.4],
    look: [3.2, 1.2, -12.2],
    fov: 55,
  },
};

export const HOME = 'walkway';

// Where each spot's hotspots sit in the scene: the doorway or object you
// would walk towards. Back to the parent is a separate button, not a hotspot.
export const HOTSPOTS = {
  walkway: [],
  entry: [
    { to: 'living', at: [0.25, 1.55, -2.9] },
    { to: 'gallery', at: [-0.6, 1.55, -6.5] },
  ],
  living: [],
  gallery: [
    { to: 'studio', at: [-1.7, 1.55, -9.6] },
    { to: 'desk', at: [0.5, 1.55, -10.8] },
  ],
  studio: [],
  desk: [],
};

export function isSpot(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(SPOTS, id);
}

/** The spot ids from the root down to `id`, inclusive. */
export function lineage(id) {
  if (!isSpot(id)) throw new Error(`Unknown spot: ${id}`);
  const chain = [];
  for (let at = id; at; at = SPOTS[at].parent) chain.unshift(at);
  return chain;
}

/**
 * The points the camera passes on the way from spot `from` to spot `to`:
 * up the tree to their common ancestor, then down. Each point has a `pos`
 * and, where the walk should face a set direction, a `look`. The first and
 * last points are the spots themselves.
 */
export function route(from, to) {
  const up = lineage(from);
  const down = lineage(to);
  let common = 0;
  while (common < up.length && common < down.length && up[common] === down[common]) common++;
  const points = [];
  const add = (p) => points.push({ pos: p.pos, look: p.look });
  // Walking up: leave each spot through its doorways in reverse.
  for (let i = up.length - 1; i >= common; i--) {
    const spot = SPOTS[up[i]];
    add(spot);
    for (let v = (spot.via || []).length - 1; v >= 0; v--) add(spot.via[v]);
  }
  // The common ancestor: the spot the walk turns at (or starts or ends at).
  add(SPOTS[down[common - 1]]);
  // Walking down: enter each spot through its doorways.
  for (let i = common; i < down.length; i++) {
    const spot = SPOTS[down[i]];
    for (const v of spot.via || []) add(v);
    add(spot);
  }
  return dedupe(points);
}

function dedupe(points) {
  return points.filter((p, i) => i === 0 || !samePos(p.pos, points[i - 1].pos));
}

function samePos(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

/**
 * Fills in a look target for every point that has none: straight ahead in
 * the direction of travel, at eye level. The camera then faces where it walks
 * and turns towards the destination's view only at the end.
 */
export function withLooks(points) {
  return points.map((p, i) => {
    if (p.look) return p;
    const prev = points[Math.max(0, i - 1)].pos;
    const next = points[Math.min(points.length - 1, i + 1)].pos;
    let dx = next[0] - prev[0];
    let dz = next[2] - prev[2];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    return { pos: p.pos, look: [p.pos[0] + dx * LOOK_AHEAD, 1.45, p.pos[2] + dz * LOOK_AHEAD] };
  });
}

const LOOK_AHEAD = 4; // metres: far enough that small path wiggles don't swing the view

/** Seconds a walk of `metres` takes: a calm pace, never a lurch or a crawl. */
export function walkSeconds(metres) {
  return Math.min(MAX_WALK_SECONDS, Math.max(MIN_WALK_SECONDS, 0.9 + metres * 0.18));
}

const MIN_WALK_SECONDS = 1.2;
const MAX_WALK_SECONDS = 4;

/** The spot's address: `/` for the walkway, `/?room=<id>` for the rest. */
export function spotUrl(id) {
  return id === HOME ? '/' : `/?room=${id}`;
}

/** The spot named in a URL's query string, or the walkway if none or unknown. */
export function spotFromSearch(search) {
  const room = new URLSearchParams(search).get('room');
  return isSpot(room) ? room : HOME;
}
