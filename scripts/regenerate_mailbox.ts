/**
 * Generate a new larger mailbox prop (64×96, 2x the original 32×48).
 * Run: npx vite-node scripts/regenerate_mailbox.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

const STYLE = 'pixel art, 16-bit SNES RPG style, clean crisp pixel edges, 2-3 tone cel shading on every surface, warm sunset directional lighting with soft golden ambient glow, saturated but harmonious warm palette, no dithering, no blur, no anti-aliasing, no gradients within pixels, cozy sunset yard pixel art game';
const STYLE_NEGATIVE = 'photorealistic, painterly, blurry, noisy, dithered, too much detail, muddy colors, dark, desaturated, anti-aliased, smooth gradients';

const PROMPT = `cute red mailbox on brown wooden post, classic rounded mailbox shape with small red flag raised on side, warm red body with darker red shadow tones, brown wooden post, warm golden sunset highlight on top and left side, clear readable silhouette, front three-quarter view, single object centered on empty canvas, no ground no grass no dirt no sky, ${STYLE}`;

const SEEDS = [1300, 1310, 1320];
const OUT_DIR = 'public/assets/generated/review/environment/outdoor/props';

async function main() {
  const apiKey = getApiKey();
  console.log('Generating new larger mailbox (64×96)...\n');

  for (const seed of SEEDS) {
    process.stdout.write(`  mailbox seed ${seed}...`);
    try {
      const response = await fetch(PIXELLAB_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          description: PROMPT,
          negative_description: STYLE_NEGATIVE,
          image_size: { width: 64, height: 96 },
          no_background: true,
          text_guidance_scale: 12,
          seed,
        }),
      });

      if (!response.ok) {
        console.log(` FAILED: ${await response.text()}`);
        continue;
      }

      const data = (await response.json()) as { image: { base64: string }; usage: { usd: number } };
      const buf = Buffer.from(data.image.base64, 'base64');

      if (buf.length < 300) {
        console.log(` DEGENERATE (${buf.length}b)`);
        continue;
      }

      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.writeFileSync(path.join(OUT_DIR, `prop_mailbox_seed${seed}.png`), buf);
      console.log(` OK (${buf.length}b) $${data.usage.usd.toFixed(4)}`);
    } catch (err) {
      console.log(` ERROR: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log('\nDone — check review/outdoor/props/ for candidates');
}

main().catch(console.error);
