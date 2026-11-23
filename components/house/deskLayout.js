// The desk nook: the corkboard on its right wall, with one index card per
// role in constants/experience.js and a card with the contact details, and
// the monitor on the desk, which shows the site's latest commit.
//
// Coordinates are three.js metres (Blender (x, y, z) is (x, z, -y) here).
// The board and the screen are modelled in scripts/blender/walkway.py
// (desk_nook()), which uses the same numbers.

import { EXPERIENCE } from '../../constants/experience.js';

export const BOARD = {
  x: 4.53, // the cork's face; cards face -x, into the room
  centreZ: -10.2,
  centreY: 1.9,
  width: 2.0, // along the wall (z -11.2 to -9.2)
  height: 1.0, // y 1.4 to 2.4
};

export const SCREEN = {
  z: -12.04, // just in front of the monitor's glass; faces +z
  centre: [3.1, 1.465],
  width: 0.94,
  height: 0.51,
};

const ROLE_CARD = { width: 0.6, height: 0.56 };
const CONTACT_CARD = { width: 0.44, height: 0.32 };
const MARGIN = 0.07;

export const roleCardId = (i) => `role-${i}`;
export const CONTACT_CARD_ID = 'contact';

/**
 * Pins every role and the contact card to the board, left to right as a
 * visitor facing it reads: the current role first. `u` runs along the board
 * from its left edge to its right (world +z), `v` up from its centre. Throws
 * if they do not fit, so a new role that overflows the board is caught in the
 * checks, not on the live site.
 */
export function pinCards(roles) {
  const cards = roles.map((role, i) => ({ id: roleCardId(i), kind: 'role', role, ...ROLE_CARD }));
  cards.push({ id: CONTACT_CARD_ID, kind: 'contact', ...CONTACT_CARD });
  const used = cards.reduce((sum, c) => sum + c.width, 0);
  const gap = (BOARD.width - 2 * MARGIN - used) / (cards.length - 1);
  if (gap < 0.04) throw new Error(`${cards.length} cards do not fit on the corkboard`);
  let u = -BOARD.width / 2 + MARGIN;
  // A slight, fixed tilt per card, as pinned by hand; the contact card sits higher.
  const tilts = [-0.035, 0.025, 0.045, -0.02, 0.03];
  return cards.map((c, i) => {
    const centreU = u + c.width / 2;
    u += c.width + gap;
    const v = c.kind === 'contact' ? 0.16 : 0.0;
    return {
      ...c,
      tilt: tilts[i % tilts.length],
      // Facing -x, the board's left edge (u < 0) is at the far end, -z.
      position: [BOARD.x - 0.004, BOARD.centreY + v, BOARD.centreZ + centreU],
    };
  });
}

export const CARDS = pinCards(EXPERIENCE);

/** The commit the site was built from, set by next.config.mjs; null if unknown. */
export function parseCommit(raw) {
  try {
    const c = JSON.parse(raw ?? 'null');
    if (!c || typeof c.sha !== 'string' || !/^[0-9a-f]{7,40}$/.test(c.sha)) return null;
    const date = new Date(c.date);
    if (Number.isNaN(date.getTime())) return null;
    return { sha: c.sha, short: c.sha.slice(0, 7), date, message: String(c.message ?? '') };
  } catch {
    return null;
  }
}

// Written out in full so Next.js can put the value into the browser bundle.
export const COMMIT = parseCommit(process.env.HOUSE_COMMIT);

export const REPO_URL = 'https://github.com/coderbenny/bennyhinn.life';
export const commitUrl = (c) => `${REPO_URL}/commit/${c.sha}`;

/** "just now", "5 minutes ago", "3 hours ago", "yesterday", "12 days ago", "2 months ago". */
export function timeSince(date, now = new Date()) {
  const s = Math.max(0, (now.getTime() - date.getTime()) / 1000);
  const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
  if (s < 60) return 'just now';
  if (s < 3600) return plural(Math.floor(s / 60), 'minute');
  if (s < 86400) return plural(Math.floor(s / 3600), 'hour');
  const days = Math.floor(s / 86400);
  if (days === 1) return 'yesterday';
  if (days < 45) return plural(days, 'day');
  if (days < 365) return plural(Math.round(days / 30.44), 'month');
  return plural(Math.floor(days / 365.25), 'year');
}

// Phase 7: the small things in the nook. The back wall is at z -12.4; the
// desk top (Blender DeskTop) is x 1.9 to 4.3, z -11.7 to -12.35, at y 1.03.
export const CLOCK = { position: [3.1, 2.42, -12.388], radius: 0.15 };
export const CALENDAR = { position: [1.95, 2.04, -12.392], width: 0.36, height: 0.52 };
export const MUG = { position: [2.55, 1.03, -11.86], radius: 0.041, height: 0.095 };
