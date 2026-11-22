// Makes the pictures for the gallery frames: a small WebP copy of each
// project screenshot in public/projects/, written to public/house/frames/.
// The originals are around 2 MB each, too heavy to load into the 3D scene.
//
// Run: npm run house:frames (again whenever a project or its screenshot changes)

import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { PROJECTS } from '../constants/projects.js';
import { frameImage } from '../components/house/galleryLayout.js';

const WIDTH = 1024; // px: sharp at the size a frame fills on a laptop screen
const QUALITY = 78;

await mkdir('public/house/frames', { recursive: true });
let total = 0;
for (const p of PROJECTS) {
  const source = path.join('public', p.image);
  const out = path.join('public', frameImage(p));
  await sharp(source).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(out);
  const { size } = await stat(out);
  total += size;
  console.log(`${out}  ${(size / 1024).toFixed(0)} KB`);
}
console.log(`${PROJECTS.length} frames, ${(total / 1024 / 1024).toFixed(2)} MB in total`);
