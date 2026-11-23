// Fetches the poster for the TV in the living room: the thumbnail of the
// first video in Benny's YouTube playlist, from YouTube's public oEmbed
// endpoint (no login or key needed). The TV shows it until the player is on
// screen. Writes public/house/tv-poster.webp.
//
// Run: npm run house:tv (again if the playlist's first video changes)

import { stat } from 'node:fs/promises';
import sharp from 'sharp';
import { YOUTUBE_PLAYLIST } from '../constants/music.js';

const OUT = 'public/house/tv-poster.webp';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (portfolio build script)' };

async function get(url, kind) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  if (!type.startsWith(kind)) throw new Error(`${url}: expected ${kind}, got ${type}`);
  return res;
}

const embed = await (await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(YOUTUBE_PLAYLIST.url)}`, 'application/json')).json();
const video = String(embed.thumbnail_url ?? '').match(/\/vi\/([\w-]{11})\//)?.[1];
if (!video) throw new Error('No video in YouTube\'s answer for the playlist');
let image;
try {
  image = await (await get(`https://i.ytimg.com/vi/${video}/maxresdefault.jpg`, 'image/')).arrayBuffer();
} catch {
  image = await (await get(`https://i.ytimg.com/vi/${video}/hqdefault.jpg`, 'image/')).arrayBuffer();
}
await sharp(Buffer.from(image)).resize(1024, 576, { fit: 'cover' }).webp({ quality: 78 }).toFile(OUT);
console.log(`${OUT}  ${((await stat(OUT)).size / 1024).toFixed(0)} KB  (video ${video})`);
