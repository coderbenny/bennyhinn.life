// The arrivals board in the entry hall: a split-flap display that greets the
// visitor by the time in Nairobi and flips through a few lines about Benny.
// Pure: what each line says and how one flap steps towards the next letter.
// Coordinates are three.js metres (Blender (x, y, z) is (x, z, -y) here); the
// housing is modelled in scripts/blender/walkway.py (entry_hall()).

import { EXPERIENCE } from '../../constants/experience.js';
import { ARTIST, TRACKS } from '../../constants/music.js';
import { PROJECTS } from '../../constants/projects.js';

export const BOARD = {
  centre: [-2.45, 1.825, -4.116], // just in front of the housing's face
  width: 1.04,
  height: 0.69,
  cols: 18,
  rows: 4,
};

// The flaps on each wheel, in the order they turn.
export const FLAPS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:-/&!?'";

/** One flap on from `c` towards `target` (the wheel only turns one way). */
export function nextFlap(c, target) {
  if (c === target) return c;
  const i = FLAPS.indexOf(c);
  return FLAPS[(i < 0 ? 0 : i + 1) % FLAPS.length];
}

/** How many flaps a wheel turns to get from `c` to `target`. */
export function flapsBetween(c, target) {
  const a = Math.max(0, FLAPS.indexOf(c));
  const b = FLAPS.indexOf(target);
  if (b < 0) return 0;
  return (b - a + FLAPS.length) % FLAPS.length;
}

/** Upper case, only characters the board has, centred in `cols`. */
export function fitLine(text, cols = BOARD.cols) {
  const clean = text
    .toUpperCase()
    .split('')
    .map((ch) => (FLAPS.includes(ch) ? ch : ' '))
    .join('')
    .slice(0, cols);
  const left = Math.floor((cols - clean.length) / 2);
  return (' '.repeat(left) + clean).padEnd(cols, ' ');
}

/** "Good morning" before noon, "Good afternoon" until six, then "Good evening"; "Hello" in the small hours. */
export function greeting(hours) {
  if (hours >= 5 && hours < 12) return 'Good morning';
  if (hours >= 12 && hours < 18) return 'Good afternoon';
  if (hours >= 18 || hours < 1) return 'Good evening';
  return 'Hello, night owl';
}

/** The pairs of lines the board flips through, after the greeting. All from the data files. */
export function messages() {
  const current = EXPERIENCE.find((e) => e.current);
  const out = [
    ['Benny Hinn', 'Software engineer'],
    ['Based in', 'Nairobi, Kenya'],
    ['Makes music as', ARTIST.name],
    [`${PROJECTS.length} projects`, 'In the gallery'],
    [`${TRACKS.length} records`, 'In the studio'],
  ];
  if (current) out.splice(2, 0, [`Now: ${current.title}`, current.company.split(' • ')[0]]);
  return out;
}

/** The whole board for page `page` (0 is the greeting): `rows` lines of `cols`. */
export function boardPage(page, hours) {
  const all = [[greeting(hours), 'Welcome in'], ...messages()];
  const [a, b] = all[page % all.length];
  return ['', a, b, ''].map((l) => fitLine(l));
}

export const PAGE_COUNT = messages().length + 1;
