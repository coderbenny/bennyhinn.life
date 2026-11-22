// Fetches the cover art for each track in constants/music.js and writes a
// small WebP copy to public/house/records/<spotifyId>.webp, for the record
// wall in the studio. Spotify's oEmbed endpoint needs no login or app; it
// returns a 300 px cover, and the same image is served at 640 px under a
// different size code.
//
// Run: npm run house:records (again whenever a track is added or its cover changes)

import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { TRACKS } from '../constants/music.js';
import { recordImage } from '../components/house/recordWall.js';

const SIZE = 512; // px: a cover fills about this much of a laptop screen up close
const QUALITY = 80;
const SMALL = 'ab67616d00001e02'; // Spotify's size codes for album covers
const LARGE = 'ab67616d0000b273';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (portfolio build script)' };

async function get(url, kind) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  if (!type.startsWith(kind)) throw new Error(`${url}: expected ${kind}, got ${type}`);
  return res;
}

await mkdir('public/house/records', { recursive: true });
let total = 0;
for (const t of TRACKS) {
  const embed = await (await get(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${t.spotifyId}`, 'application/json')).json();
  const cover = String(embed.thumbnail_url ?? '');
  if (!cover.startsWith('https://')) throw new Error(`${t.title}: no cover in Spotify's answer`);
  const image = Buffer.from(await (await get(cover.replace(SMALL, LARGE), 'image/')).arrayBuffer());
  const out = path.join('public', recordImage(t));
  await sharp(image).resize(SIZE, SIZE, { fit: 'cover' }).webp({ quality: QUALITY }).toFile(out);
  const { size } = await stat(out);
  total += size;
  console.log(`${out}  ${(size / 1024).toFixed(0)} KB  ${t.title}`);
}
console.log(`${TRACKS.length} covers, ${(total / 1024).toFixed(0)} KB in total`);
