// Production export only: extract generated cells, preserve alpha, pack frames.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
const source = new URL('../art/companions-v1/', import.meta.url).pathname;
const output = new URL('../public/assets/companions-v1/', import.meta.url).pathname;
await mkdir(output, { recursive: true });
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
async function bounds(input, isolate = false) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Two owl cells contain a sliver of the neighbouring pose. Locate the main
  // connected sprite to set its crop, without painting or replacing any alpha.
  if (isolate) {
    const seen = new Uint8Array(info.width * info.height);
    let largest = [];
    for (let start = 0; start < seen.length; start++) {
      if (seen[start] || data[start * 4 + 3] <= 32) continue;
      const component = [start]; seen[start] = 1;
      for (let cursor = 0; cursor < component.length; cursor++) {
        const p = component[cursor], x = p % info.width, y = Math.floor(p / info.width);
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nx = x + dx, ny = y + dy, next = ny * info.width + nx;
          if (nx < 0 || nx >= info.width || ny < 0 || ny >= info.height || seen[next] || data[next * 4 + 3] <= 32) continue;
          seen[next] = 1; component.push(next);
        }
      }
      if (component.length > largest.length) largest = component;
    }
    if (!largest.length) throw new Error('Empty sprite');
    let left = info.width, top = info.height, right = 0, bottom = 0;
    for (const p of largest) {
      const x = p % info.width, y = Math.floor(p / info.width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    return { left, top, width: right - left + 1, height: bottom - top + 1 };
  }
  let left = info.width, top = info.height, right = 0, bottom = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 32) {
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (left > right) throw new Error('Empty sprite');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}
const layout = {
  ember_fox: [0, 290, 610, 1086], moss_turtle: [0, 317, 660, 1086],
  luna_owl: [0, 307, 622, 1086], koala_sprite: [0, 443, 887],
};
for (const [id, cuts] of Object.entries(layout)) {
  const file = source + id + '.png', meta = await sharp(file).metadata();
  if (!(await sharp(file).stats()).channels[3] || (await sharp(file).stats()).isOpaque) throw new Error(id + ' must have real alpha');
  const referenceHeight = cuts.at(-1);
  for (let row = 0; row < cuts.length - 1; row++) {
    const stage = ['baby', 'juvenile', 'adult'][row + (id === 'koala_sprite' ? 1 : 0)];
    const top = Math.round(cuts[row] * meta.height / referenceHeight), bottom = Math.round(cuts[row + 1] * meta.height / referenceHeight);
    const cells = [];
    for (let col = 0; col < 4; col++) {
      const columns = id === 'luna_owl' && stage === 'adult' ? [0, 362, 686, 1080, 1448].map(x => x / 1448) : [0, .25, .5, .75, 1];
      const left = Math.round(columns[col] * meta.width), right = Math.round(columns[col + 1] * meta.width);
      const input = await sharp(file).extract({ left, top, width: right - left, height: bottom - top }).png().toBuffer();
      cells.push({ input, box: await bounds(input, id === 'luna_owl' && stage === 'adult' && (col === 1 || col === 2)) });
    }
    const target = stage === 'baby' ? 83 : stage === 'juvenile' ? 99 : 112;
    const factor = target / Math.max(...cells.map(c => Math.max(c.box.width, c.box.height)));
    const frames = [];
    for (const { input, box } of cells) {
      const width = Math.round(box.width * factor), height = Math.round(box.height * factor);
      const sprite = await sharp(input).extract(box).resize(width, height, { kernel: 'nearest' }).png().toBuffer();
      frames.push(await sharp({ create: { width: 128, height: 128, channels: 4, background: clear } }).composite([{ input: sprite, left: Math.round((128 - width) / 2), top: 116 - height }]).png().toBuffer());
    }
    // Pose atlas: idle+blink, joyful, action. Animation ranges select the
    // appropriate pose; don't pretend these are full walk cycles.
    await sharp({ create: { width: 512, height: 128, channels: 4, background: clear } }).composite(frames.map((input, i) => ({ input, left: i * 128, top: 0 }))).png().toFile(output + `${id}-${stage}.png`);
    await sharp(frames[0]).png().toFile(output + `${id}-${stage}-portrait.png`);
    await sharp({ create: { width: 512, height: 128, channels: 4, background: clear } }).composite([0, 3, 3, 0].map((f, i) => ({ input: frames[f], left: i * 128, top: 0 }))).png().toFile(output + `${id}-${stage}-action.png`);
  }
}
const eggs = source + 'eggs.png', meta = await sharp(eggs).metadata();
for (const [row, id] of ['koala_sprite', 'ember_fox', 'moss_turtle', 'luna_owl'].entries()) {
  const frames = [];
  for (let col = 0; col < 4; col++) {
    const left = Math.round(col * meta.width / 4), top = Math.round(row * meta.height / 4);
    const input = await sharp(eggs).extract({ left, top, width: Math.round((col + 1) * meta.width / 4) - left, height: Math.round((row + 1) * meta.height / 4) - top }).resize(128, 128, { kernel: 'nearest' }).png().toBuffer();
    frames.push(input);
  }
  await sharp({ create: { width: 512, height: 128, channels: 4, background: clear } }).composite(frames.map((input, i) => ({ input, left: i * 128, top: 0 }))).png().toFile(output + `${id}-hatch.png`);
  await sharp(frames[0]).png().toFile(output + `${id}-egg.png`);
}
console.log('Exported 11 growth stages (Pip baby retained) and four hatch sequences.');
