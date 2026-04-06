/**
 * Asset generation script — run with: npx vite-node scripts/generate_assets.ts
 * Generates pixel art via Pixel Lab API and saves to public/assets/generated/raw/
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

interface GenerateOptions {
  description: string;
  width: number;
  height: number;
  no_background?: boolean;
  text_guidance_scale?: number;
  seed?: number;
}

async function generate(opts: GenerateOptions): Promise<Buffer> {
  const apiKey = getApiKey();
  const response = await fetch(PIXELLAB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      description: opts.description,
      image_size: { width: opts.width, height: opts.height },
      no_background: opts.no_background ?? true,
      text_guidance_scale: opts.text_guidance_scale ?? 10,
      ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'unknown');
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json() as { usage: { usd: number }; image: { base64: string } };
  console.log(`  Cost: $${data.usage.usd}`);
  return Buffer.from(data.image.base64, 'base64');
}

async function generateAndSave(name: string, opts: GenerateOptions, outDir: string): Promise<string> {
  console.log(`Generating: ${name}...`);
  const buf = await generate(opts);
  const outPath = path.join(outDir, `${name}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`  Saved: ${outPath} (${buf.length} bytes)`);
  return outPath;
}

async function main() {
  const rawDir = path.resolve('public/assets/generated/raw');
  fs.mkdirSync(rawDir, { recursive: true });

  // --- TOKEN ICON (32x32, 3 variations) ---
  const tokenPrompt = 'pixel art energy token icon, glowing yellow lightning bolt crystal, small game currency icon, dark fantasy RPG style, clean pixel edges, single object centered';

  console.log('\n=== TOKEN ICON (32x32) ===');
  await generateAndSave('token_icon_v1', { description: tokenPrompt, width: 64, height: 64, no_background: true, text_guidance_scale: 10, seed: 100 }, rawDir);
  await generateAndSave('token_icon_v2', { description: tokenPrompt, width: 64, height: 64, no_background: true, text_guidance_scale: 10, seed: 200 }, rawDir);
  await generateAndSave('token_icon_v3', { description: tokenPrompt, width: 64, height: 64, no_background: true, text_guidance_scale: 12, seed: 300 }, rawDir);

  // --- POTION ITEM (64x64, 3 variations) ---
  const potionPrompt = 'pixel art healing potion bottle, glass flask with glowing blue-green magical liquid, cork stopper, RPG game item icon, clean pixel art style, single object centered';

  console.log('\n=== POTION ITEM (64x64) ===');
  await generateAndSave('potion_v1', { description: potionPrompt, width: 64, height: 64, no_background: true, text_guidance_scale: 10, seed: 100 }, rawDir);
  await generateAndSave('potion_v2', { description: potionPrompt, width: 64, height: 64, no_background: true, text_guidance_scale: 10, seed: 200 }, rawDir);
  await generateAndSave('potion_v3', { description: potionPrompt, width: 64, height: 64, no_background: true, text_guidance_scale: 12, seed: 300 }, rawDir);

  console.log('\n=== DONE ===');
  console.log('Generated 6 images in:', rawDir);
  console.log('Review them and move the best candidates to public/assets/generated/review/');
}

main().catch(console.error);
