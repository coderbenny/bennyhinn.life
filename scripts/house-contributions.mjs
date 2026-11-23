// Writes public/house/contributions.json for the wall calendar in the desk
// nook: Benny's public GitHub contributions for the last year, one entry per
// day, read from GitHub's public contribution calendar (no login needed).
// If GitHub cannot be reached, or its page has changed, it falls back to the
// commits in this repository; if that fails too, it keeps the file there is.
// It never fails the build.
//
// Run: npm run house:contributions (also runs before every `npm run build`)

import { execSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const USER = 'coderbenny';
const OUT = 'public/house/contributions.json';
const TIMEOUT_MS = 8000;

async function fromGitHub() {
  const res = await fetch(`https://github.com/users/${USER}/contributions`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (portfolio build script)' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const html = await res.text();
  // Each day is a cell with a date and a level (0 to 4); its count is in a
  // tooltip that points at the cell's id.
  const cells = {};
  for (const m of html.matchAll(/<td\b[^>]*>/g)) {
    const tag = m[0];
    const date = tag.match(/data-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    const level = Number(tag.match(/data-level="(\d)"/)?.[1]);
    if (date && id && Number.isInteger(level)) cells[id] = { date, level };
  }
  const days = {};
  for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const cell = cells[m[1]];
    if (!cell) continue;
    const n = m[2].match(/^([\d,]+) contribution/);
    days[cell.date] = { count: n ? Number(n[1].replace(/,/g, '')) : 0, level: cell.level };
  }
  if (Object.keys(days).length < 300) throw new Error('the contribution calendar looks different than expected');
  return { source: 'github', user: USER, days };
}

function fromGit() {
  const out = execSync('git log --since="1 year ago" --format=%cd --date=format-local:%Y-%m-%d', {
    stdio: ['ignore', 'pipe', 'ignore'],
    env: { ...process.env, TZ: 'Africa/Nairobi' },
  }).toString();
  const counts = {};
  for (const d of out.split('\n').filter(Boolean)) counts[d] = (counts[d] ?? 0) + 1;
  const max = Math.max(1, ...Object.values(counts));
  const days = {};
  for (const [d, count] of Object.entries(counts)) days[d] = { count, level: Math.max(1, Math.ceil((count / max) * 4)) };
  return { source: 'git', user: USER, days };
}

let data;
try {
  data = await fromGitHub();
} catch (e) {
  console.warn(`contributions: GitHub failed (${e.message}); using this repository's commits`);
  try {
    data = fromGit();
  } catch (e2) {
    console.warn(`contributions: git failed too (${e2.message}); keeping ${OUT} as it is`);
    process.exit(0);
  }
}
const total = Object.values(data.days).reduce((sum, d) => sum + d.count, 0);
await writeFile(OUT, `${JSON.stringify({ ...data, total, fetchedAt: new Date().toISOString() })}\n`);
console.log(`contributions: ${total} over ${Object.keys(data.days).length} days from ${data.source} -> ${OUT}`);
