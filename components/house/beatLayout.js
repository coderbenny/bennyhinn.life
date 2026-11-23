// The beat station on the studio desk: the 16 drum pads and the 49-key MIDI
// keyboard modelled in scripts/blender/walkway.py (studio_desk()), made
// playable. Pure: where each pad and key is, and what it plays.
//
// Coordinates are three.js metres (Blender (x, y, z) is (x, z, -y) here).
// Sitting at the desk you face the wall (-x), so your right is towards -z.

const DESK_TOP = 1.14;

// The pads: Blender rows r (0 at the wall) and columns c (0 on the left).
export const PAD_SOUNDS = [
  'kick', 'snare', 'clap', 'hat', // bottom row, nearest you
  'open hat', 'low tom', 'mid tom', 'high tom',
  'rim', 'cowbell', 'shaker', 'crash',
  'bass C', 'bass D#', 'bass F', 'bass G', // top row
];
// Computer keys for the pads, laid out like the pads themselves.
export const PAD_KEYS = ['z', 'x', 'c', 'v', 'a', 's', 'd', 'f', 'q', 'w', 'e', 'r', '1', '2', '3', '4'];

export const PADS = [];
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 4; c++) {
    const px = -4.105 + r * 0.055;
    const py = 8.875 + c * 0.064;
    PADS.push({
      index: (3 - r) * 4 + c, // the row nearest you is pads 1 to 4
      position: [px + 0.0225, DESK_TOP + 0.033, -(py + 0.026)],
      size: [0.045, 0.052], // along x, along z
    });
  }
}
PADS.sort((a, b) => a.index - b.index);

const WHITE_STEPS = [0, 2, 4, 5, 7, 9, 11];
const LOWEST = 36; // C2, the bottom key of a 49-key keyboard
const WHITE_WIDTH = 0.72 / 29;

export const KEYS = [];
for (let j = 0; j < 29; j++) {
  const y0 = 9.45 + j * WHITE_WIDTH;
  const note = LOWEST + 12 * Math.floor(j / 7) + WHITE_STEPS[j % 7];
  KEYS.push({ note, black: false, position: [-3.933, DESK_TOP + 0.074, -(y0 + WHITE_WIDTH / 2)], size: [0.134, WHITE_WIDTH - 0.0014] });
  if (j < 28 && [0, 1, 3, 4, 5].includes(j % 7)) {
    KEYS.push({ note: note + 1, black: true, position: [-3.9575, DESK_TOP + 0.087, -(y0 + WHITE_WIDTH)], size: [0.085, 0.014] });
  }
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const noteName = (midi) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
export const noteHz = (midi) => 440 * 2 ** ((midi - 69) / 12);
