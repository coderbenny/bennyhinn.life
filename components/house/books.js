// The skills bookshelf in the living room: one compartment per area of
// TECH_STACK, one book per technology. A book's thickness shows how much it
// is used: the projects in constants/projects.js plus the roles in
// constants/experience.js that mention it.
//
// The shelf itself is modelled and baked in Blender (scripts/blender/walkway.py,
// `skills_shelf`); the numbers below must match it. Coordinates are three.js
// metres: Blender (x, y, z) is (x, z, -y) here. The shelf stands against the
// living room's left wall with its open front facing +x, into the room.

export const SHELF = {
  backX: 0.62, // inside face of the back panel
  frontX: 0.95, // front edge of the boards
  // Compartment columns, along the wall: z from, z to (three.js z = -Blender y).
  columns: [
    [-0.44, -1.28],
    [-1.32, -2.16],
  ],
  // Top of each row's floor board, top row first (three.js y).
  rows: [1.71, 1.12, 0.53],
  clearHeight: 0.56,
};

const MIN_THICKNESS = 0.03; // metres: an unused technology is still a book you can pick out
const THICKNESS_PER_USE = 0.012;
const MAX_USES_SHOWN = 13; // the thickest book, so a full compartment still fits
const GAP = 0.004;
const HEIGHTS = [0.34, 0.39, 0.31, 0.42, 0.36, 0.33, 0.4];
const DEPTHS = [0.22, 0.25, 0.21, 0.24];
// Cloth colours, the same family as the books baked into the corner shelf.
export const COLORS = ['#7a3b2e', '#2f4858', '#c9a96e', '#3e5641', '#d8d3c4', '#5c3d5e', '#a4572f'];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True when `text` contains one of `terms` at the start of a word, ignoring case. */
export function mentions(text, terms) {
  return terms.some((t) => new RegExp(`(^|[^a-z0-9])${escapeRegExp(t)}`, 'i').test(text));
}

/** The projects and roles that use a skill, by its match terms. */
export function usesOf(terms, projects, experience) {
  return {
    projects: projects.filter((p) => p.tech.some((t) => mentions(t, terms))),
    roles: experience.filter((e) => mentions([e.title, ...e.achievements].join(' '), terms)),
  };
}

export function thicknessFor(uses) {
  return MIN_THICKNESS + THICKNESS_PER_USE * Math.min(uses, MAX_USES_SHOWN);
}

/**
 * Every book, placed on the shelf: area i goes to compartment i, read left to
 * right, top row first. Throws if the data would not fit, so a new skill that
 * overflows a compartment is caught in the checks, not on the live site.
 */
export function layoutBooks(stack, details, projects, experience) {
  const areas = Object.entries(stack);
  const compartments = SHELF.rows.length * SHELF.columns.length;
  if (areas.length > compartments) throw new Error(`${areas.length} areas for ${compartments} compartments`);
  const books = [];
  let n = 0;
  areas.forEach(([area, skills], i) => {
    const floor = SHELF.rows[Math.floor(i / SHELF.columns.length)];
    const [zStart, zEnd] = SHELF.columns[i % SHELF.columns.length];
    let z = zStart - 0.03; // a little room at the left of the compartment
    for (const skill of skills) {
      const detail = details[skill];
      if (!detail) throw new Error(`No SKILL_DETAILS entry for ${skill}`);
      const used = usesOf(detail.match, projects, experience);
      const thickness = thicknessFor(used.projects.length + used.roles.length);
      const height = HEIGHTS[n % HEIGHTS.length];
      const depth = DEPTHS[n % DEPTHS.length];
      books.push({
        skill,
        area,
        note: detail.note,
        projects: used.projects,
        roles: used.roles,
        color: COLORS[(n * 3) % COLORS.length],
        size: [depth, height, thickness],
        // Centre of the book: spine flush with the front, standing on the floor.
        position: [SHELF.frontX - 0.015 - depth / 2, floor + height / 2, z - thickness / 2],
      });
      z -= thickness + GAP;
      n++;
    }
    if (z < zEnd) throw new Error(`The ${area} books are wider than their compartment`);
  });
  return books;
}
