// The record wall in the studio: one vinyl record per track in
// constants/music.js, hung on the back wall above the turntable cabinet, in
// the order of that file. Each record is its sleeve (the cover art) with the
// disc half out of it to the right, as record shops hang them.
//
// Coordinates are three.js metres (Blender (x, y, z) is (x, z, -y) here).
// The wall and the cabinet below it are modelled in scripts/blender/walkway.py
// (studio()), which uses the same numbers.

export const WALL = {
  z: -12.4, // the studio's back wall; records face +z, into the room
  centreX: -3.2,
  // Bass traps stand in both corners; records keep inside them.
  from: -4.25,
  to: -2.15,
};

export const RECORD = {
  sleeve: 0.3, // metres, square, about the size of a real LP sleeve
  disc: 0.29, // the disc's diameter
  peek: 0.07, // how far the disc stands out of the sleeve, to the right
  gap: 0.06, // between one record's disc and the next sleeve
  perRow: 5,
  rowY: [1.95, 1.5], // centres of the rows, top first
  standOff: 0.02, // metres off the wall, on a hidden bracket
};

/** The cover art made by scripts/house-records.mjs. */
export const recordImage = (t) => `/house/records/${t.spotifyId}.webp`;

export const recordId = (t) => `track-${t.spotifyId}`;

/**
 * Hangs every track: rows of RECORD.perRow from the top, left to right,
 * centred on the wall. Throws if the tracks do not fit, so a new track that
 * overflows the wall is caught in the checks, not on the live site.
 */
export function hangRecords(tracks) {
  const ids = new Set();
  for (const t of tracks) {
    if (ids.has(t.spotifyId)) throw new Error(`Track ${t.spotifyId} is listed twice`);
    ids.add(t.spotifyId);
  }
  const rows = Math.ceil(tracks.length / RECORD.perRow);
  if (rows > RECORD.rowY.length) {
    throw new Error(`${tracks.length - RECORD.perRow * RECORD.rowY.length} tracks do not fit on the record wall`);
  }
  const pitch = RECORD.sleeve + RECORD.peek + RECORD.gap;
  return tracks.map((track, i) => {
    const row = Math.floor(i / RECORD.perRow);
    const inRow = Math.min(RECORD.perRow, tracks.length - row * RECORD.perRow);
    const col = i % RECORD.perRow;
    // Centre the whole record (sleeve plus the disc out of it) in its slot.
    const rowWidth = inRow * pitch - RECORD.gap;
    const left = WALL.centreX - rowWidth / 2;
    const x = left + col * pitch + RECORD.sleeve / 2;
    return {
      track,
      index: i,
      id: recordId(track),
      position: [x, RECORD.rowY[row], WALL.z + RECORD.standOff],
    };
  });
}

/** The left and right edges of a hung record, sleeve and disc together. */
export const recordExtent = (r) => [r.position[0] - RECORD.sleeve / 2, r.position[0] + RECORD.sleeve / 2 + RECORD.peek];
