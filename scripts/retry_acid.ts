/**
 * Retry the failed effect_acid generation.
 * Run: npx vite-node scripts/retry_acid.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

async function main() {
  const apiKey = getApiKey();
  console.log('Retrying effect_acid...');

  const response = await fetch(PIXELLAB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      description: 'pixel art green toxic acid splash with bubbles, corrosive liquid spray, neon green chemical burst, dripping poison, game combat VFX effect',
      image_size: { width: 128, height: 128 },
      no_background: true,
      text_guidance_scale: 12,
      seed: 705,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'unknown');
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json() as { usage: { usd: number }; image: { base64: string } };
  const buf = Buffer.from(data.image.base64, 'base64');

  const rawDir = path.resolve('public/assets/generated/raw');
  const finalDir = path.resolve('public/assets/generated/final');
  fs.writeFileSync(path.join(rawDir, 'effect_acid.png'), buf);
  fs.writeFileSync(path.join(finalDir, 'effect_acid.png'), buf);
  console.log(`Saved effect_acid.png (${buf.length} bytes)`);
}

main().catch(console.error);
