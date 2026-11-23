// How hard the house works, chosen once per device.
//
// The lighting is baked, so there are no shadows or lights to turn off; what
// costs is the size of the baked textures in GPU memory (seven 2048 px maps
// are about 117 MB with mipmaps, more than a phone's browser tab can spare)
// and how many pixels are drawn each frame.
//
//   high    laptops and desktops: full textures, up to 2× pixel ratio, antialiasing
//   medium  tablets and small laptops: full textures, up to 1.5× pixel ratio
//   low     phones and low-memory devices: 1024 px textures (walkway-mobile.glb,
//           about 29 MB on the GPU), up to 1.5× pixel ratio, no antialiasing
//
// On top of this, House.js lowers the pixel ratio while the frame rate stays low.
// Add ?quality=low (or medium, high) to the address to force a level.

export const LEVELS = {
  high: { model: '/house/walkway.glb', dpr: [1, 2], antialias: true, anisotropy: 8 },
  medium: { model: '/house/walkway.glb', dpr: [1, 1.5], antialias: true, anisotropy: 4 },
  low: { model: '/house/walkway-mobile.glb', dpr: [1, 1.5], antialias: false, anisotropy: 2 },
};

/**
 * The level for a device.
 * coarse       the main pointer is a finger
 * shortSide    the screen's shorter side, CSS px
 * memory       navigator.deviceMemory, GB (undefined where the browser hides it)
 * cores        navigator.hardwareConcurrency
 * saveData     the visitor asked the browser to save data
 * forced       a level named in the address, if any
 */
export function chooseQuality({ coarse, shortSide, memory, cores, saveData, forced }) {
  if (forced && LEVELS[forced]) return forced;
  if (saveData) return 'low';
  if (coarse && shortSide < 600) return 'low'; // a phone
  if (memory !== undefined && memory <= 2) return 'low';
  if (coarse) return 'medium'; // a tablet
  if ((memory !== undefined && memory <= 4) || (cores && cores <= 4)) return 'medium';
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
    coarse: window.matchMedia('(pointer: coarse)').matches,
    shortSide: Math.min(window.screen.width, window.screen.height),
    memory: navigator.deviceMemory,
    cores: navigator.hardwareConcurrency,
    saveData: Boolean(navigator.connection?.saveData),
    forced,
  });
  chosen = { level, ...LEVELS[level] };
  return chosen;
}
