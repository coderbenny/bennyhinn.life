// Soft sounds for the house: the door, the mailbox flag, a book sliding out,
// a record leaving its sleeve, a card coming off the corkboard, the arrivals
// board's flaps. All are made
// with the Web Audio API on the spot (filtered noise and a few oscillators),
// so there are no audio files to load. They only ever play in answer to the
// visitor's own clicks, and a mute button in the corner turns them off; the
// choice is remembered in this browser.

const STORAGE_KEY = 'house:muted';
const VOLUME = 0.32; // everything is quiet; this is the loudest any of it gets

let ctx = null;
let master = null;
let noise = null;
let muted = readMuted();
const listeners = new Set();

function readMuted() {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Private windows can refuse storage; the choice still holds for this visit.
  }
  if (master) master.gain.value = muted ? 0 : VOLUME;
  for (const l of listeners) l(muted);
}

/** Calls `fn(muted)` whenever the setting changes; returns the unsubscribe. */
export function onMutedChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function audio() {
  if (ctx) return ctx;
  const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctx) return null;
  ctx = new Ctx();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOLUME;
  master.connect(ctx.destination);
  // Two seconds of white noise, reused by every sound.
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

/** A burst of filtered noise. `freq` may be [from, to] for a sweep. */
function hiss(at, { duration, type = 'bandpass', freq, q = 1, gain = 0.5, attack = 0.01 }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  const [f0, f1] = Array.isArray(freq) ? freq : [freq, freq];
  filter.frequency.setValueAtTime(f0, at);
  filter.frequency.exponentialRampToValueAtTime(f1, at + duration);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  src.connect(filter).connect(env).connect(master);
  src.start(at, Math.random() * 1.5);
  src.stop(at + duration + 0.05);
}

/** A short tone that dies away: knocks and clicks. */
function tone(at, { freq, duration, gain = 0.3, type = 'sine', to }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, at + duration);
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(env).connect(master);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

const SOUNDS = {
  // The latch, then a low creak as the door swings in.
  door(t) {
    hiss(t, { duration: 0.06, type: 'lowpass', freq: 900, gain: 0.5 });
    tone(t, { freq: 140, to: 90, duration: 0.09, gain: 0.25 });
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t + 0.12);
    osc.frequency.linearRampToValueAtTime(70, t + 0.9);
    // Stick-slip: the creak stutters, so its volume flutters quickly.
    const flutter = ctx.createOscillator();
    flutter.frequency.value = 28;
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t + 0.12);
    env.gain.exponentialRampToValueAtTime(0.05, t + 0.3);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    flutter.connect(depth).connect(env.gain);
    const body = ctx.createBiquadFilter();
    body.type = 'bandpass';
    body.frequency.value = 700;
    body.Q.value = 3;
    osc.connect(body).connect(env).connect(master);
    osc.start(t + 0.12);
    flutter.start(t + 0.12);
    osc.stop(t + 1);
    flutter.stop(t + 1);
  },
  // The door settling shut.
  close(t) {
    hiss(t, { duration: 0.08, type: 'lowpass', freq: 600, gain: 0.45 });
    tone(t, { freq: 110, to: 70, duration: 0.12, gain: 0.25 });
  },
  // The mailbox flag: a small metal click.
  flag(t) {
    hiss(t, { duration: 0.025, type: 'highpass', freq: 3000, gain: 0.25, attack: 0.002 });
    tone(t, { freq: 1900, duration: 0.09, gain: 0.05, type: 'triangle' });
  },
  // A book slides along the shelf and comes free.
  book(t) {
    hiss(t, { duration: 0.32, freq: [1700, 650], q: 0.9, gain: 0.3, attack: 0.05 });
    hiss(t + 0.3, { duration: 0.05, type: 'lowpass', freq: 500, gain: 0.25 });
  },
  // A record slides out of its sleeve, then a few seconds of needle crackle.
  record(t) {
    hiss(t, { duration: 0.24, freq: [3200, 1400], q: 0.7, gain: 0.22, attack: 0.04 });
    hiss(t + 0.25, { duration: 1.8, type: 'highpass', freq: 5000, gain: 0.025, attack: 0.1 });
    for (let i = 0; i < 26; i++) {
      hiss(t + 0.3 + Math.random() * 1.6, { duration: 0.008, type: 'highpass', freq: 2500, gain: 0.08 + Math.random() * 0.1, attack: 0.001 });
    }
  },
  // The arrivals board: a run of small flap clicks that thins out as the
  // wheels arrive.
  flaps(t) {
    for (let i = 0; i < 34; i++) {
      const at = t + Math.pow(i / 34, 1.6) * 1.6 + Math.random() * 0.02;
      hiss(at, { duration: 0.012, type: 'bandpass', freq: 2600 + Math.random() * 900, q: 2, gain: 0.07 + Math.random() * 0.05, attack: 0.001 });
    }
  },
  // A pin pulled and the card lifted off the cork.
  card(t) {
    hiss(t, { duration: 0.02, type: 'highpass', freq: 2500, gain: 0.2, attack: 0.002 });
    hiss(t + 0.03, { duration: 0.14, freq: 2800, q: 0.8, gain: 0.12, attack: 0.02 });
  },
  // Snake party: someone joins (a bright two-note pop).
  join(t) {
    tone(t, { freq: 660, to: 880, duration: 0.09, gain: 0.16, type: 'triangle' });
    tone(t + 0.08, { freq: 990, to: 1320, duration: 0.14, gain: 0.14, type: 'triangle' });
  },
  // The countdown: 3, 2, 1...
  tick(t) {
    tone(t, { freq: 740, duration: 0.14, gain: 0.22, type: 'square' });
  },
  // ...go! An octave up, with a fifth on top.
  go(t) {
    tone(t, { freq: 1480, duration: 0.32, gain: 0.2, type: 'square' });
    tone(t, { freq: 2220, duration: 0.32, gain: 0.08, type: 'triangle' });
  },
};

/** Plays one of the sounds above, unless muted or audio is unavailable. */
export function play(name) {
  if (muted || !SOUNDS[name]) return;
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  try {
    SOUNDS[name](c.currentTime + 0.01);
  } catch {
    // A sound that fails to play should never break the house.
  }
}

// The beat station in the studio: 16 drum pads and a 49-key synth, made the
// same way as the sounds above. Louder than the house's sounds, since the
// visitor is playing them on purpose; still quiet, and still muted by Mute.

function voice(at, { type, freq, to, duration, gain, filter }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, at + duration);
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  let node = osc;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = filter;
    osc.connect(f);
    node = f;
  }
  node.connect(env).connect(master);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

const DRUMS = {
  kick(t) {
    voice(t, { type: 'sine', freq: 150, to: 42, duration: 0.38, gain: 1.4 });
    hiss(t, { duration: 0.02, type: 'lowpass', freq: 3000, gain: 0.4, attack: 0.001 });
  },
  snare(t) {
    hiss(t, { duration: 0.2, freq: 1900, q: 0.7, gain: 0.9, attack: 0.002 });
    voice(t, { type: 'triangle', freq: 220, to: 160, duration: 0.11, gain: 0.5 });
  },
  clap(t) {
    for (const d of [0, 0.012, 0.025]) hiss(t + d, { duration: 0.025, freq: 1300, q: 1.2, gain: 0.8, attack: 0.001 });
    hiss(t + 0.03, { duration: 0.18, freq: 1200, q: 0.9, gain: 0.5, attack: 0.002 });
  },
  hat(t) {
    hiss(t, { duration: 0.05, type: 'highpass', freq: 7500, gain: 0.45, attack: 0.001 });
  },
  'open hat'(t) {
    hiss(t, { duration: 0.38, type: 'highpass', freq: 7000, gain: 0.35, attack: 0.002 });
  },
  'low tom'(t) {
    voice(t, { type: 'sine', freq: 110, to: 70, duration: 0.4, gain: 1.0 });
  },
  'mid tom'(t) {
    voice(t, { type: 'sine', freq: 150, to: 95, duration: 0.35, gain: 0.95 });
  },
  'high tom'(t) {
    voice(t, { type: 'sine', freq: 205, to: 130, duration: 0.3, gain: 0.9 });
  },
  rim(t) {
    voice(t, { type: 'triangle', freq: 1700, duration: 0.035, gain: 0.5 });
    hiss(t, { duration: 0.015, type: 'highpass', freq: 3000, gain: 0.3, attack: 0.001 });
  },
  cowbell(t) {
    voice(t, { type: 'square', freq: 540, duration: 0.28, gain: 0.18, filter: 900 });
    voice(t, { type: 'square', freq: 800, duration: 0.28, gain: 0.18, filter: 900 });
  },
  shaker(t) {
    hiss(t, { duration: 0.13, type: 'highpass', freq: 5000, gain: 0.35, attack: 0.04 });
  },
  crash(t) {
    hiss(t, { duration: 1.5, type: 'highpass', freq: 4000, gain: 0.35, attack: 0.003 });
  },
};

function bass(semitones) {
  return (t) => {
    const f = 65.41 * 2 ** (semitones / 12); // from C2
    voice(t, { type: 'sine', freq: f * 1.06, to: f, duration: 0.9, gain: 1.1 });
  };
}
DRUMS['bass C'] = bass(0);
DRUMS['bass D#'] = bass(3);
DRUMS['bass F'] = bass(5);
DRUMS['bass G'] = bass(7);

/** Plays a drum pad by its sound's name (see beatLayout.js). */
export function drum(name) {
  if (muted || !DRUMS[name]) return;
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  try {
    DRUMS[name](c.currentTime + 0.005);
  } catch {
    // A sound that fails to play should never break the house.
  }
}

/** Plays a note on the synth: two slightly detuned saws through a closing filter. */
export function note(hz) {
  if (muted) return;
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  try {
    const t = c.currentTime + 0.005;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(2600, t);
    filter.frequency.exponentialRampToValueAtTime(700, t + 0.5);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.28, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.09, t + 0.3);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    filter.connect(env).connect(master);
    for (const cents of [-7, 7]) {
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = hz;
      osc.detune.value = cents;
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + 0.95);
    }
  } catch {
    // A sound that fails to play should never break the house.
  }
}
