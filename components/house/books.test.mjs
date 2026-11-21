// Checks for the skills bookshelf. Run: npm run test:house
import assert from 'node:assert/strict';
import { PROJECTS } from '../../constants/projects.js';
import { EXPERIENCE } from '../../constants/experience.js';
import { TECH_STACK, SKILL_DETAILS } from '../../constants/skills.js';
import { layoutBooks, mentions, usesOf, thicknessFor, SHELF } from './books.js';

// Word-start matching.
assert.ok(mentions('PostgreSQL', ['postgres']));
assert.ok(mentions('Expo / React Native', ['react']));
assert.ok(mentions('Next.js 16', ['next.js']));
assert.ok(!mentions('Reduced downtime proactively', ['react']));
assert.ok(!mentions('Nextjsish', ['next.js']));
assert.ok(mentions('telecom VAS solutions (SMS, MMS, IVR, USSD)', ['ussd']));

// Every skill has details, and the real data fits the shelf.
const books = layoutBooks(TECH_STACK, SKILL_DETAILS, PROJECTS, EXPERIENCE);
assert.equal(books.length, Object.values(TECH_STACK).flat().length);
for (const b of books) {
  assert.ok(b.size.every((v) => v > 0));
  assert.ok(b.size[1] < SHELF.clearHeight, `${b.skill} taller than its row`);
  assert.ok(b.position[0] + b.size[0] / 2 <= SHELF.frontX && b.position[0] - b.size[0] / 2 >= SHELF.backX, `${b.skill} depth`);
}
// No two books overlap.
for (const a of books) for (const b of books) {
  if (a === b || a.position[1] - a.size[1] / 2 !== b.position[1] - b.size[1] / 2) continue;
  const overlap = Math.abs(a.position[2] - b.position[2]) < (a.size[2] + b.size[2]) / 2;
  assert.ok(!overlap, `${a.skill} overlaps ${b.skill}`);
}
// Telecom skills count the Zuri Health role; Flask counts its projects.
const by = Object.fromEntries(books.map((b) => [b.skill, b]));
assert.equal(by.USSD.roles.length, 1);
assert.equal(by.Flask.projects.length, PROJECTS.filter((p) => p.tech.some((t) => /flask/i.test(t))).length);
assert.ok(by['React.js'].size[2] > by.TypeScript.size[2]);
assert.equal(thicknessFor(0), thicknessFor(0));
assert.equal(thicknessFor(100), thicknessFor(13));
// Missing details and overflow are caught.
assert.throws(() => layoutBooks({ A: ['Nope'] }, SKILL_DETAILS, PROJECTS, EXPERIENCE), /No SKILL_DETAILS/);
const many = { A: Array.from({ length: 12 }, () => 'React.js') };
assert.throws(() => layoutBooks(many, SKILL_DETAILS, PROJECTS, EXPERIENCE), /wider than/);
assert.equal(usesOf(['zzz'], PROJECTS, EXPERIENCE).projects.length, 0);
for (const b of books) console.log(b.area.padEnd(9), b.skill.padEnd(12), String(b.projects.length).padStart(2), 'projects', b.roles.length, 'roles');
console.log('books: all checks passed');
