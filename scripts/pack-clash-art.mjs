// Reuse approved transparent sprites. The generated concept atlas is review-only:
// its painted checkerboard failed alpha validation and must not ship as furniture.
import sharp from 'sharp';
import { mkdir, copyFile } from 'node:fs/promises';
const output = new URL('../public/assets/clash-v1/', import.meta.url);
await mkdir(output, { recursive: true });
const sources = { clash_trophy: 'reward_trophy_gold', clash_bed: 'item_bed', clash_lamp: 'room_lamp', clash_rug: 'room_rug', clash_tree: 'room_plant', clash_books: 'room_shelf' };
for (const [id, source] of Object.entries(sources)) {
  const path = new URL(`../public/assets/generated/final/${source}.png`, import.meta.url);
  const meta = await sharp(path.pathname).metadata(), stats = await sharp(path.pathname).stats();
  if (!meta.hasAlpha || stats.isOpaque) throw new Error(`${source}: real transparency required`);
  await copyFile(path, new URL(`${id}.png`, output));
}
console.log('Packed six approved transparent decoration sprites.');
