/**
 * House Asset Pass 01 — Generate 8 new anchor/structural assets for the room system.
 * Run: npx vite-node scripts/generate_house_assets.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

const STYLE = 'pixel art, game asset, clean pixel edges, dark fantasy RPG style, single object centered, transparent background, high contrast, crisp silhouette';

const HOUSE_ASSETS = [
  {
    filename: 'house_home_couch',
    prompt: `${STYLE}, large cozy dark leather couch sofa, three-seat sofa with cushions, living room furniture, side view`,
    width: 128,
    height: 128,
  },
  {
    filename: 'house_home_fireplace',
    prompt: `${STYLE}, stone brick fireplace with warm orange fire burning, cozy hearth, mantle shelf, front view`,
    width: 128,
    height: 128,
  },
  {
    filename: 'house_kitchen_counter',
    prompt: `${STYLE}, wooden kitchen counter with drawers, kitchen cabinet, cutting board on top, side view`,
    width: 128,
    height: 128,
  },
  {
    filename: 'house_kitchen_stove',
    prompt: `${STYLE}, small cooking stove with pot on top, kitchen appliance, warm orange glow, side view`,
    width: 128,
    height: 128,
  },
  {
    filename: 'house_playroom_banner',
    prompt: `${STYLE}, colorful triangular pennant banner flags on string, party bunting, festive decoration, horizontal`,
    width: 128,
    height: 128,
  },
  {
    filename: 'house_bathroom_bathtub',
    prompt: `${STYLE}, small clawfoot bathtub with bubbles, white porcelain tub, bathroom furniture, side view`,
    width: 128,
    height: 128,
  },
  {
    filename: 'house_bathroom_mirror',
    prompt: `${STYLE}, oval wall mirror with wooden frame, bathroom vanity mirror, reflective surface, hanging on wall`,
    width: 128,
    height: 128,
  },
  {
    filename: 'house_shared_doorframe',
    prompt: `${STYLE}, arched wooden doorframe with dark opening, room entrance, stone and wood door frame, no door`,
    width: 128,
    height: 128,
  },
];

async function main() {
  const reviewDir = path.resolve('public/assets/generated/review');
  fs.mkdirSync(reviewDir, { recursive: true });
  const apiKey = getApiKey();
  let success = 0;
  let failed = 0;

  console.log(`\nGENERATING ${HOUSE_ASSETS.length} HOUSE ASSETS\n`);

  for (const asset of HOUSE_ASSETS) {
    const outPath = path.join(reviewDir, `${asset.filename}.png`);

    try {
      process.stdout.write(`  ${asset.filename}...`);
      const response = await fetch(PIXELLAB_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          description: asset.prompt,
          image_size: { width: asset.width, height: asset.height },
          no_background: true,
          text_guidance_scale: 10,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`API ${response.status}: ${body}`);
      }

      const data = await response.json() as { usage: { usd: number }; image: { base64: string } };
      const buf = Buffer.from(data.image.base64, 'base64');
      fs.writeFileSync(outPath, buf);
      success++;
      console.log(` OK (${buf.length}b, $${data.usage.usd})`);
    } catch (err) {
      failed++;
      console.log(` FAILED: ${err instanceof Error ? err.message : err}`);

      // Retry once on failure
      try {
        process.stdout.write(`  ${asset.filename} (retry)...`);
        const response = await fetch(PIXELLAB_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            description: asset.prompt,
            image_size: { width: asset.width, height: asset.height },
            no_background: true,
            text_guidance_scale: 10,
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`API ${response.status}: ${body}`);
        }

        const data = await response.json() as { usage: { usd: number }; image: { base64: string } };
        const buf = Buffer.from(data.image.base64, 'base64');
        fs.writeFileSync(outPath, buf);
        failed--;
        success++;
        console.log(` OK (retry succeeded, ${buf.length}b, $${data.usage.usd})`);
      } catch (retryErr) {
        console.log(` RETRY FAILED: ${retryErr instanceof Error ? retryErr.message : retryErr}`);
      }
    }
  }

  console.log(`\nDone: ${success} success, ${failed} failed`);
  if (success > 0) {
    console.log(`\nHouse assets saved to: ${reviewDir}/`);
    console.log('Review them, then copy approved ones to public/assets/generated/final/');
  }
}

main().catch(console.error);
