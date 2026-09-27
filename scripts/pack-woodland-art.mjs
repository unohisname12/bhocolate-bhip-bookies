// Mechanical game exports only: preserve generated alpha; crop cells, align feet,
// and pack native-resolution sheets. No drawing or background removal here.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../public/assets/woodland-v1/', import.meta.url));
await mkdir(root, { recursive: true });
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

async function cell(file, col, row, cols, rows) {
  const meta = await sharp(file).metadata();
  const left = Math.round(col * meta.width / cols);
  const top = Math.round(row * meta.height / rows);
  return sharp(file).extract({ left, top,
    width: Math.round((col + 1) * meta.width / cols) - left,
    height: Math.round((row + 1) * meta.height / rows) - top,
  }).png().toBuffer();
}

async function bounds(input, largestOnly = false) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = 0, bottom = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    // Ignore nearly transparent export noise when finding bounds, but do not
    // alter the alpha or colors of the generated pixels inside those bounds.
    if (data[(y * info.width + x) * 4 + 3] > 32) {
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  if (largestOnly) {
    const seen = new Uint8Array(info.width * info.height);
    let best = 0;
    for (let start = 0; start < seen.length; start++) {
      if (seen[start] || data[start * 4 + 3] <= 32) continue;
      const queue = [start]; seen[start] = 1;
      let l = info.width, t = info.height, r = 0, b = 0;
      for (let q = 0; q < queue.length; q++) {
        const p = queue[q], x = p % info.width, y = Math.floor(p / info.width);
        l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);
        for (const n of [x > 0 ? p - 1 : -1, x < info.width - 1 ? p + 1 : -1, p - info.width, p + info.width]) {
          if (n >= 0 && n < seen.length && !seen[n] && data[n * 4 + 3] > 32) { seen[n] = 1; queue.push(n); }
        }
      }
      if (queue.length > best) { best = queue.length; left = l; right = r; top = t; bottom = b; }
    }
  }
  if (left > right) throw new Error('Empty generated cell');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

const rows = ['idle', 'walking', 'happy', 'eating', 'sleeping', 'action'];
for (const [row, name] of rows.entries()) {
  const frames = [];
  for (let col = 0; col < 4; col++) {
    const input = await cell(root + 'source/pip-atlas.png', col, row, 4, 6);
    const box = await bounds(input, true);
    // Fixed global scale keeps head/body size consistent between poses.
    const width = Math.round(box.width * .43), height = Math.round(box.height * .43);
    const sprite = await sharp(input).extract(box).resize(width, height, { kernel: 'nearest' }).png().toBuffer();
    const frame = await sharp({ create: { width: 128, height: 128, channels: 4, background: transparent } })
      .composite([{ input: sprite, left: Math.round((128 - width) / 2), top: 116 - height }]).png().toBuffer();
    frames.push(frame);
  }
  await sharp({ create: { width: 512, height: 128, channels: 4, background: transparent } })
    .composite(frames.map((input, i) => ({ input, left: i * 128, top: 0 })))
    .png().toFile(root + `pip-${name}.png`);
  if (name === 'idle') await sharp(frames[0]).png().toFile(root + 'pip-portrait.png');
}
for (const name of ['home', 'yard']) {
  await sharp(root + `source/${name}.png`).resize(400, 224, { fit: 'fill', kernel: 'nearest' }).png().toFile(root + `${name}.png`);
}
for (const [i, name] of ['math', 'catch', 'momentum', 'merge', 'care', 'battle', 'feed', 'heart'].entries()) {
  const input = await cell(root + 'source/icons.png', i % 4, Math.floor(i / 4), 4, 2);
  const sprite = await sharp(input).extract(await bounds(input)).resize(56, 56, { fit: 'inside', kernel: 'nearest' }).png().toBuffer();
  const { width, height } = await sharp(sprite).metadata();
  await sharp({ create: { width: 64, height: 64, channels: 4, background: transparent } })
    .composite([{ input: sprite, left: Math.floor((64 - width) / 2), top: Math.floor((64 - height) / 2) }])
    .png().toFile(root + `icon-${name}.png`);
}
console.log('Exported six 4-frame Pip sheets, portrait, two 400×224 scenes, eight icons.');
