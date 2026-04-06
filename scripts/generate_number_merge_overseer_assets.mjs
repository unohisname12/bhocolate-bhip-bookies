import fs from 'fs';
import path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey() {
  const key = process.env.VITE_PIXELLAB_API_KEY;
  if (!key) {
    throw new Error('Missing VITE_PIXELLAB_API_KEY. Run with node --env-file=.env');
  }
  return key;
}

const STYLE = 'modern pixel art, crisp clean silhouette, readable for kids, transparent background, game UI asset, moody cosmic sci-fi';

const ASSETS = [
  {
    name: 'overseer-portrait',
    width: 128,
    height: 128,
    seed: 8801,
    prompt: `hostile cosmic overseer portrait, floating geometric alien mask with one giant eye, cracked neon halo, digital god face, slightly creepy but readable for kids, teal and crimson glow, centered bust portrait, ${STYLE}`,
  },
  {
    name: 'corruption-tile',
    width: 128,
    height: 128,
    seed: 8802,
    prompt: `corrupted tile symbol, fractured neon crystal eye sigil trapped in dark red glitch cube, hostile board blocker icon, ominous but clear, centered object, ${STYLE}`,
  },
  {
    name: 'overseer-warning-sigil',
    width: 128,
    height: 128,
    seed: 8803,
    prompt: `warning sigil from cosmic machine intelligence, triangular eye rune with glitch sparks and amber alarm light, hostile countdown marker, centered effect sprite, ${STYLE}`,
  },
  {
    name: 'overseer-meter-eye',
    width: 96,
    height: 96,
    seed: 8804,
    prompt: `small UI icon of celestial machine eye, neon red iris inside geometric metal frame, pressure meter emblem, centered icon, ${STYLE}`,
  },
];

async function generateAsset(asset) {
  const response = await fetch(PIXELLAB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      description: asset.prompt,
      image_size: { width: asset.width, height: asset.height },
      no_background: true,
      text_guidance_scale: 11,
      seed: asset.seed,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown');
    throw new Error(`PixelLab error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return Buffer.from(data.image.base64, 'base64');
}

async function main() {
  const rawDir = path.resolve('public/assets/generated/raw/number-merge');
  const finalDir = path.resolve('public/assets/generated/final/number-merge');
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(finalDir, { recursive: true });

  for (const asset of ASSETS) {
    console.log(`Generating ${asset.name}...`);
    const image = await generateAsset(asset);
    const rawPath = path.join(rawDir, `${asset.name}.png`);
    const finalPath = path.join(finalDir, `${asset.name}.png`);
    fs.writeFileSync(rawPath, image);
    fs.writeFileSync(finalPath, image);
    console.log(`  saved ${rawPath}`);
    console.log(`  saved ${finalPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
