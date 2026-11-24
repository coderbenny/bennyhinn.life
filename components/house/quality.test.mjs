import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { FPS_BOUNDS, LEVELS, chooseQuality } from './quality.js';

// Laptops and phones alike get the full house; only weak devices get less.
assert.equal(chooseQuality({ memory: 8, saveData: false }), 'high');
assert.equal(chooseQuality({ memory: undefined, saveData: false }), 'high', 'Safari (every iPhone) hides deviceMemory');
assert.equal(chooseQuality({ memory: 4, saveData: false }), 'high', 'a mid-range Android phone');
assert.equal(chooseQuality({ memory: 2, saveData: false }), 'low');
assert.equal(chooseQuality({ memory: 8, saveData: true }), 'low');
assert.equal(chooseQuality({ memory: 2, saveData: false, forced: 'high' }), 'high');
assert.equal(chooseQuality({ memory: 8, saveData: false, forced: 'nonsense' }), 'high', 'an unknown level is ignored');
for (const level of Object.values(LEVELS)) assert.ok(level.antialias, 'every level is antialiased');
assert.ok(FPS_BOUNDS[0] <= 30, 'the pixel ratio only drops when the frame rate is really low');

// Every level's model is in public/, and the phone model is lighter.
const file = (url) => new URL(`../../public${url}`, import.meta.url);
for (const [name, level] of Object.entries(LEVELS)) {
  assert.ok(existsSync(file(level.model)), `${name}: ${level.model} is missing (npm run house:mobile)`);
  assert.ok(level.dpr[1] <= 2, `${name}: pixel ratio capped at 2`);
}
assert.ok(statSync(file(LEVELS.low.model)).size < statSync(file(LEVELS.high.model)).size, 'the phone model is smaller');

console.log('quality: all checks pass');
