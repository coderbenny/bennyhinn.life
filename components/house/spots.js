// The places the camera can stand, and how it walks between them.
//
// Spots form a tree rooted at the walkway: each spot names its parent and the
// points the camera passes through on the way from the parent (doorways), so
// every move follows the rooms instead of cutting through walls.
//
// Coordinates are three.js metres. The house is modelled in Blender
// (scripts/blender/walkway.py), where a point (x, y, z) becomes (x, z, -y)
// here. Floors are at y = 0.38, eye height is 1.6.

import { PROJECTS } from '../../constants/projects.js';
import { TRACKS } from '../../constants/music.js';
import { hang } from './galleryLayout.js';
import { hangRecords } from './recordWall.js';

const EYE = 1.6;

// The framed projects in the gallery (see galleryLayout.js).
export const FRAMES = hang(PROJECTS);
// The records on the studio's back wall (see recordWall.js).
export const RECORDS = hangRecords(TRACKS);

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
    // On a portrait phone, a step back and turned left, so the arrivals board
    // fits beside the gallery opening.
    portrait: { pos: [-0.6, EYE, -0.3], look: [-1.6, 1.45, -4.2] },
  },
  living: {
    label: 'Living room',
    parent: 'entry',
    // In through the opening, across the room, then turn back to face the
    // skills shelf on the wall you came in by.
    via: [{ pos: [-0.45, EYE, -2.9] }, { pos: [0.25, EYE, -2.9] }, { pos: [1.6, EYE, -2.5] }, { pos: [2.8, EYE, -1.8] }],
    pos: [3.3, 1.5, -1.4],
    // Aimed low enough that the bottom row clears the room card.
    look: [0.75, 1.05, -1.3],
    fov: 55,
  },
  tv: {
    label: 'TV',
    parent: 'living',
    // Sitting on the front of the sofa, eyes at seated height, facing the TV.
    pos: [2.75, 1.28, -3.35],
    look: [4.4, 1.55, -3.35],
    // On a portrait phone, standing behind the sofa so the whole screen fits.
    portrait: { pos: [1.75, 1.55, -3.35], look: [4.4, 1.55, -3.35] },
    fov: 45,
  },
  gallery: {
    label: 'Gallery',
    parent: 'entry',
    // Walking between two places off the gallery (frames, studio, desk) goes
    // straight along it, not back to where you first stepped in.
    corridor: true,
    via: [{ pos: [-0.6, EYE, -4.3] }],
    pos: [-0.6, EYE, -5.0],
    look: [-0.6, 1.45, -12.4],
    fov: 55,
  },
  painting: {
    label: 'Living painting',
    parent: 'gallery',
    // Up close at the end of the gallery, eyes level with the painting.
    pos: [-0.6, 1.75, -10.45],
    // Aimed a little below its middle, so it sits above the room card.
    look: [-0.6, 2.02, -12.35],
    fov: 45,
  },
  studio: {
    label: 'Studio',
    parent: 'gallery',
    // Through the doorway facing the desk, then a step back into the front
    // corner, turning to take in the desk, the record wall and the guitars.
    via: [
      { pos: [-0.6, EYE, -9.6] },
      { pos: [-1.7, EYE, -9.6], look: [-4.4, 1.3, -9.8] },
      { pos: [-2.15, EYE, -8.4], look: [-4.0, 1.25, -11.0] },
    ],
    pos: [-2.25, EYE, -7.15],
    look: [-4.0, 1.2, -11.6],
    portrait: { pos: [-2.3, EYE, -7.0], look: [-3.7, 1.3, -11.8] },
    fov: 60,
  },
  beats: {
    label: 'Beat station',
    parent: 'studio',
    // Leaning over the desk, looking down at the pads and the keyboard.
    pos: [-3.05, 1.85, -9.45],
    look: [-4.0, 1.1, -9.45],
    // On a portrait phone, further back so all the keys fit across.
    portrait: { pos: [-2.2, 2.0, -9.5], look: [-4.0, 1.1, -9.5] },
    fov: 55,
  },
  records: {
    label: 'Record wall',
    parent: 'studio',
    // Square on to the back wall. The aim sits a little right of the records,
    // so they clear the panel that opens on the right on wide screens.
    pos: [-2.85, EYE, -9.2],
    look: [-2.85, 1.5, -12.4],
    // On a portrait phone, straight on and far enough back for all five in a row.
    portrait: { pos: [-3.2, EYE, -8.9], look: [-3.2, 1.62, -12.4] },
    fov: 50,
  },
  desk: {
    label: 'Desk',
    parent: 'gallery',
    // In through the doorway, then a step towards the front of the room, so
    // the desk with its screen and the corkboard are both in view.
    via: [{ pos: [-0.6, EYE, -10.8] }, { pos: [0.5, EYE, -10.8], look: [3.4, 1.3, -12.0] }],
    pos: [1.2, EYE, -9.0],
    // Turned a little left of the corner, so the wall calendar by the desk is in view too.
    look: [3.6, 1.45, -11.45],
    portrait: { pos: [1.0, EYE, -8.8], look: [3.6, 1.45, -11.4] },
    fov: 58,
  },
  corkboard: {
    label: 'Corkboard',
    parent: 'desk',
    // Square on to the board. The aim sits a little right of its centre, so
    // the cards clear the panel that opens on the right on wide screens.
    pos: [2.4, EYE, -10.2],
    look: [4.53, 1.85, -9.85],
    portrait: { pos: [1.0, EYE, -10.2], look: [4.53, 1.9, -10.2] },
    fov: 50,
  },
  monitor: {
    label: 'Monitor',
    parent: 'desk',
    // Standing behind the chair, looking at the screen; aimed a little right
    // of it for the panel.
    // A little above eye height, so the chair's back stays below the screen.
    pos: [3.1, 1.64, -10.6],
    look: [3.4, 1.47, -12.05],
    // On a portrait phone, far enough back for the whole screen to fit.
    portrait: { pos: [3.1, 1.75, -10.1], look: [3.1, 1.47, -12.05] },
    fov: 45,
  },
  // One spot in front of each frame, reached down the middle of the gallery.
  ...Object.fromEntries(
    FRAMES.map((f) => [
      f.id,
      {
        label: f.name,
        parent: 'gallery',
        via: [{ pos: [-0.6, EYE, f.view.pos[2]] }],
        pos: f.view.pos,
        look: f.view.look,
        portrait: f.portraitView,
        fov: 50,
        frame: f,
      },
    ])
  ),
};

export const HOME = 'walkway';

// Where each spot's hotspots sit in the scene: the doorway or object you
// would walk towards. Back to the parent is a separate button, not a hotspot.
// `portraitAt`, where given, replaces `at` on a portrait screen.
export const HOTSPOTS = {
  walkway: [],
  entry: [
    // On a portrait phone the opening is just off screen to the right, so its
    // button sits at the edge; higher up, clear of the Gallery button.
    { to: 'living', at: [0.25, 1.55, -2.9], portraitAt: [0.25, 2.2, -2.9] },
    { to: 'gallery', at: [-0.6, 1.55, -6.5] },
  ],
  // The TV is behind you at the shelf; the room card's Watch TV button leads there.
  living: [],
  tv: [],
  gallery: [
    { to: 'studio', at: [-1.7, 1.55, -9.6] },
    { to: 'desk', at: [0.5, 1.55, -10.8] },
    { to: 'painting', at: [-0.6, 2.85, -12.3] },
  ],
  painting: [],
  studio: [
    { to: 'records', at: [-3.2, 0.8, -12.0] },
    { to: 'beats', at: [-3.95, 1.45, -9.6] },
  ],
  beats: [],
  records: [],
  desk: [
    { to: 'corkboard', at: [4.45, 2.52, -10.2] },
    { to: 'monitor', at: [3.1, 1.86, -12.0] },
  ],
  corkboard: [],
  monitor: [],
  ...Object.fromEntries(FRAMES.map((f) => [f.id, []])),
};

/** Where the camera stands at a spot: its portrait pose on a portrait screen, if it has one. */
export function pose(id, portrait = false) {
  const spot = SPOTS[id];
  return portrait && spot.portrait ? spot.portrait : spot;
}

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
export function route(from, to, portrait = false) {
  const up = lineage(from);
  const down = lineage(to);
  let common = 0;
  while (common < up.length && common < down.length && up[common] === down[common]) common++;
  const points = [];
  const add = (p) => points.push({ pos: p.pos, look: p.look });
  // Walking up: leave each spot through its doorways in reverse.
  for (let i = up.length - 1; i >= common; i--) {
    const spot = SPOTS[up[i]];
    add(pose(up[i], portrait));
    for (let v = (spot.via || []).length - 1; v >= 0; v--) add(spot.via[v]);
  }
  // The common ancestor: the spot the walk turns at (or starts or ends at).
  // A corridor is passed along, not returned to, when the walk only crosses it.
  const turn = SPOTS[down[common - 1]];
  const crossing = up.length > common && down.length > common;
  if (!(turn.corridor && crossing)) add(pose(down[common - 1], portrait));
  // Walking down: enter each spot through its doorways.
  for (let i = common; i < down.length; i++) {
    const spot = SPOTS[down[i]];
    for (const v of spot.via || []) add(v);
    add(pose(down[i], portrait));
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
