/**
 * Generate 20 animation grid images via Pixel Lab API.
 *
 * Each animation = ONE 640x512 API call producing a 5x4 grid of 128x128 frames.
 * This ensures character consistency across all frames.
 *
 * Usage:
 *   npx vite-node scripts/generate_animations.ts              # generate all missing
 *   npx vite-node scripts/generate_animations.ts --action eating  # (re)generate one
 *   npx vite-node scripts/generate_animations.ts --force          # regenerate all
 */
import * as fs from 'fs';
import * as path from 'path';

// Import animation definitions — paths are relative to project root
const DEFINITIONS_PATH = path.resolve('src/config/animationManifest.ts');

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';
const OUTPUT_BASE = path.resolve('public/assets/generated/review/animations');

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

interface AnimDef {
  id: string;
  action: string;
  label: string;
  prompt: string;
}

async function generateGrid(apiKey: string, anim: AnimDef): Promise<Buffer> {
  // API max is 400x400. Use 384x384 for a 3x3 grid of 128x128 frames.
  // This gives 9 consistent frames per animation (one API call = one image).
  const body = {
    description: anim.prompt,
    image_size: { width: 384, height: 384 },
    no_background: true,
    text_guidance_scale: 10,
  };

  const res = await fetch(PIXELLAB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pixel Lab API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { image: { base64: string }; usage?: { usd: number } };
  if (!data.image?.base64) throw new Error('No image in API response');

  if (data.usage) {
    console.log(`    Cost: $${data.usage.usd}`);
  }

  return Buffer.from(data.image.base64, 'base64');
}

async function main() {
  const args = process.argv.slice(2);
  const forceAll = args.includes('--force');
  const actionIdx = args.indexOf('--action');
  const singleAction = actionIdx >= 0 ? args[actionIdx + 1] : null;

  // Dynamic import of the manifest (vite-node resolves TS imports)
  const { ANIMATION_DEFINITIONS } = await import('../src/config/animationManifest');
  const apiKey = getApiKey();

  const targets: AnimDef[] = singleAction
    ? ANIMATION_DEFINITIONS.filter((a: AnimDef) => a.action === singleAction)
    : ANIMATION_DEFINITIONS;

  if (targets.length === 0) {
    console.error(`No animation found for action: ${singleAction}`);
    process.exit(1);
  }

  console.log(`\n=== Generating ${targets.length} animation grid images ===\n`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const anim of targets) {
    const outDir = path.join(OUTPUT_BASE, anim.action);
    const gridPath = path.join(outDir, 'grid.png');

    if (!forceAll && !singleAction && fs.existsSync(gridPath)) {
      console.log(`  SKIP ${anim.action} — grid.png exists`);
      skipped++;
      continue;
    }

    fs.mkdirSync(outDir, { recursive: true });
    console.log(`  Generating ${anim.action}...`);
    console.log(`    Prompt: "${anim.prompt.slice(0, 100)}..."`);

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const buf = await generateGrid(apiKey, anim);
        fs.writeFileSync(gridPath, buf);
        console.log(`    ✓ Saved ${gridPath} (${buf.length} bytes)`);
        generated++;
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`    ✗ Attempt ${attempts}/${maxAttempts} failed: ${msg}`);
        if (attempts >= maxAttempts) {
          console.error(`    FAILED: ${anim.action}`);
          failed++;
        }
      }
    }

    // Small delay between API calls to avoid rate limiting
    if (targets.indexOf(anim) < targets.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`  Generated: ${generated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
}

main().catch(console.error);
