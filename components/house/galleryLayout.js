// The projects gallery: one framed screenshot per project in
// constants/projects.js, hung along the gallery walls in the order of that
// file. The first projects there are the flagships and get larger frames.
//
// Coordinates are three.js metres (Blender (x, y, z) is (x, z, -y) here).
// The wall spans below are the gallery walls in scripts/blender/walkway.py,
// minus the studio and desk doorways and a little room at each corner.

export const WALLS = {
  left: { x: -1.6, facing: 1 }, // frames on it face +x
  right: { x: 0.4, facing: -1 }, // frames on it face -x
};

// Spans of bare wall, in the order a visitor walking in meets them. The long
// left span, opposite the flagships, is hung two high ("salon" style) so
// every project fits.
export const SPANS = [
  { wall: 'right', from: -4.6, to: -10.1, rows: 1 }, // entry to the desk doorway
  { wall: 'left', from: -4.6, to: -8.9, rows: 2 }, // entry to the studio doorway
  { wall: 'left', from: -10.3, to: -12.3, rows: 1 }, // studio doorway to the end wall
  { wall: 'right', from: -11.5, to: -12.3, rows: 1 }, // desk doorway to the end wall
];

export const LARGE_FRAMES = 3; // the flagships, first in constants/projects.js
export const FRAME = {
  largeWidth: 0.95, // metres, the picture itself
  smallWidth: 0.55,
  aspect: 1.9, // width / height; screenshots are cropped to fit
  centreY: 1.55, // eye height, as galleries hang
  minGap: 0.2, // between frames, and from a frame to a span's end
  rowOffset: 0.36, // a two-high hang: rows this far above and below centreY
  border: 0.035, // moulding around the mat
  mat: 0.04, // pale card between moulding and picture
};

// How far from the wall the camera stands to look at one frame, and how far
// it shifts its aim sideways so the frame clears the panel that opens on the
// right on wide screens.
const VIEW_DISTANCE = 1.25;
const PANEL_SHIFT = 0.27;
const WIDE_DISTANCE_PER_WIDTH = 1.3;
// On a portrait phone there is no panel beside the frame, so the camera aims
// straight at it, standing back until the frame fits the narrow screen
// (metres of distance per metre of frame width), but no closer to the
// opposite wall than this.
const PORTRAIT_DISTANCE_PER_WIDTH = 1.8;
const MAX_PORTRAIT_DISTANCE = 1.75;
const EYE = 1.6;

/** The part of a project's name before " - ": "Tizi Plus". */
export const shortName = (p) => p.name.split(' - ')[0].trim();

/** The part after " - ": "Multi-Gym Membership Network". */
export const subtitle = (p) => p.name.split(' - ').slice(1).join(' - ').trim();

/** From the screenshot's file name: "/projects/tizi.png" -> "tizi". */
export const slugOf = (p) => p.image.split('/').pop().replace(/\.[a-z]+$/i, '');

/** The small copy of the screenshot made by scripts/house-frames.mjs. */
export const frameImage = (p) => `/house/frames/${slugOf(p)}.webp`;

export const projectSpotId = (p) => `project-${slugOf(p)}`;

/**
 * Hangs every project. Frames fill the spans in order, in columns: one frame
 * per column, or on a two-high span up to two small frames, top first. Within
 * a span the columns are spread out evenly. Throws if they do not all fit, so
 * a new project that overflows the walls is caught in the checks, not on the
 * live site.
 */
export function hang(projects) {
  const slugs = new Set();
  for (const p of projects) {
    const s = slugOf(p);
    if (slugs.has(s)) throw new Error(`Two projects share the screenshot name ${s}`);
    slugs.add(s);
  }
  const widths = projects.map((_, i) => (i < LARGE_FRAMES ? FRAME.largeWidth : FRAME.smallWidth));
  const outer = (w) => w + 2 * (FRAME.border + FRAME.mat);
  const frames = [];
  let next = 0;
  for (const span of SPANS) {
    const length = span.from - span.to;
    const columns = [];
    let used = FRAME.minGap;
    while (next < projects.length) {
      // A large frame always has a column to itself.
      const column = [next];
      if (span.rows === 2 && widths[next] === FRAME.smallWidth && widths[next + 1] === FRAME.smallWidth) column.push(next + 1);
      const width = Math.max(...column.map((i) => outer(widths[i])));
      if (used + width + FRAME.minGap > length + 1e-9) break;
      used += width + FRAME.minGap;
      columns.push({ items: column, width });
      next += column.length;
    }
    if (!columns.length) continue;
    // Spread the columns evenly along the span.
    const free = length - columns.reduce((sum, c) => sum + c.width, 0);
    const gap = free / (columns.length + 1);
    let z = span.from - gap;
    for (const c of columns) {
      const centreZ = z - c.width / 2;
      const ys = c.items.length === 2 ? [FRAME.centreY + FRAME.rowOffset, FRAME.centreY - FRAME.rowOffset] : [FRAME.centreY];
      c.items.forEach((i, row) => frames.push(frameAt(projects[i], i, span.wall, centreZ, ys[row], widths[i])));
      z -= c.width + gap;
    }
  }
  if (next < projects.length) {
    throw new Error(`${projects.length - next} projects do not fit on the gallery walls`);
  }
  return frames;
}

function frameAt(project, index, wall, z, y, width) {
  const { x, facing } = WALLS[wall];
  const outerWidth = width + 2 * (FRAME.border + FRAME.mat);
  // Large frames want a step further back to fit beside the panel.
  const standX = x + facing * Math.max(VIEW_DISTANCE, outerWidth * WIDE_DISTANCE_PER_WIDTH);
  const portraitDistance = Math.min(MAX_PORTRAIT_DISTANCE, Math.max(VIEW_DISTANCE, outerWidth * PORTRAIT_DISTANCE_PER_WIDTH));
  // Facing the left wall the camera looks along -x, so screen-right is -z;
  // facing the right wall, screen-right is +z.
  const shift = facing > 0 ? -PANEL_SHIFT : PANEL_SHIFT;
  return {
    project,
    index,
    id: projectSpotId(project),
    name: shortName(project),
    wall,
    facing,
    width,
    height: width / FRAME.aspect,
    position: [x, y, z],
    view: { pos: [standX, EYE, z], look: [x, y - 0.05, z + shift] },
    portraitView: { pos: [x + facing * portraitDistance, EYE, z], look: [x, y - 0.05, z] },
  };
}
