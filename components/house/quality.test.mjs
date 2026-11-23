import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { LEVELS, chooseQuality } from './quality.js';

const laptop = { coarse: false, shortSide: 900, memory: 8, cores: 8, saveData: false };
assert.equal(chooseQuality(laptop), 'high');
assert.equal(chooseQuality({ ...laptop, memory: undefined }), 'high', 'Safari and Firefox hide deviceMemory');
assert.equal(chooseQuality({ ...laptop, cores: 4 }), 'medium');
assert.equal(chooseQuality({ ...laptop, memory: 4 }), 'medium');
assert.equal(chooseQuality({ ...laptop, memory: 2 }), 'low');
assert.equal(chooseQuality({ ...laptop, saveData: true }), 'low');

const phone = { coarse: true, shortSide: 390, memory: undefined, cores: 6, saveData: false };
assert.equal(chooseQuality(phone), 'low');
assert.equal(chooseQuality({ ...phone, shortSide: 820 }), 'medium', 'a tablet');
assert.equal(chooseQuality({ ...phone, forced: 'high' }), 'high');
assert.equal(chooseQuality({ ...phone, forced: 'nonsense' }), 'low', 'an unknown level is ignored');

// Every level's model is in public/, and the phone model is lighter.
const file = (url) => new URL(`../../public${url}`, import.meta.url);
for (const [name, level] of Object.entries(LEVELS)) {
  assert.ok(existsSync(file(level.model)), `${name}: ${level.model} is missing (npm run house:mobile)`);
  assert.ok(level.dpr[1] <= 2, `${name}: pixel ratio capped at 2`);
}
assert.ok(statSync(file(LEVELS.low.model)).size < statSync(file(LEVELS.high.model)).size, 'the phone model is smaller');

console.log('quality: all checks pass');
