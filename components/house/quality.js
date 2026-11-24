// How hard the house works, chosen once per device.
//
// The lighting is baked, so there are no shadows or lights to turn off; what
// costs is the size of the baked textures in GPU memory and how many pixels
// are drawn each frame.
//
//   high  every ordinary laptop, tablet and phone: full 2048 px textures, up to
//         2× pixel ratio, antialiasing. Phones get this too: at less, the
//         slats, frames and edges looked soft and jagged on a 3× iPhone
//         screen, and any recent phone draws the house at full quality.
//   low   weak devices only (2 GB of memory or less, or the visitor asked to
//         save data): walkway-mobile.glb, the same model with 1024 px textures
//         (about 29 MB on the GPU instead of about 117 MB), up to 1.5×, still
//         antialiased.
//
// On top of this, House.js lowers the pixel ratio if the frame rate stays
// under 30 fps, and raises it again when there is room.
// Add ?quality=low (or high) to the address to force a level.

export const LEVELS = {
  high: { model: '/house/walkway.glb', dpr: [1, 2], antialias: true, anisotropy: 8 },
  low: { model: '/house/walkway-mobile.glb', dpr: [1, 1.5], antialias: true, anisotropy: 4 },
};

/** Frame rates below which the pixel ratio steps down, and above which it steps back up. */
export const FPS_BOUNDS = [30, 50];

/**
 * The level for a device.
 * memory    navigator.deviceMemory, GB (undefined where the browser hides it, as Safari does)
 * saveData  the visitor asked the browser to save data
 * forced    a level named in the address, if any
 */
export function chooseQuality({ memory, saveData, forced }) {
  if (forced && LEVELS[forced]) return forced;
  if (saveData) return 'low';
  if (memory !== undefined && memory <= 2) return 'low';
  return 'high';
}

let chosen = null;

/** This device's level and its settings. Browser only. */
export function getQuality() {
  if (chosen) return chosen;
  let forced = null;
  try {
    forced = new URLSearchParams(window.location.search).get('quality');
  } catch {
    // no address to read
  }
  const level = chooseQuality({
    memory: navigator.deviceMemory,
    saveData: Boolean(navigator.connection?.saveData),
    forced,
  });
  chosen = { level, ...LEVELS[level] };
  return chosen;
}
