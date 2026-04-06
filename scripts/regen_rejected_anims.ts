/**
 * Regenerate the 3 rejected animation sprite sheets: anim_slash, anim_lightning, anim_slam.
 * Uses stronger consistency prompts and a shared style prefix.
 * Run: npx vite-node scripts/regen_rejected_anims.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';
const FRAME_SIZE = 128;

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

// Shared style prefix for consistency
const VFX = 'pixel art game VFX effect sprite, 128x128 frame, transparent background, no characters no scenery no objects, only visual effect particles and energy,';

interface FrameDef { prompt: string; seed: number; }
interface AnimEffect { name: string; frames: FrameDef[]; }

const EFFECTS: AnimEffect[] = [
  {
    name: 'anim_slash',
    frames: [
      { prompt: `${VFX} very faint thin white diagonal scratch line just appearing, subtle glow, frame 1 of 6 slash attack sequence`, seed: 900 },
      { prompt: `${VFX} two bright white diagonal slash lines sweeping across, motion blur trails, glowing edges, frame 2 of 6 slash attack`, seed: 901 },
      { prompt: `${VFX} three bold white diagonal claw slash marks fully extended, bright glowing white edges with sparks, frame 3 of 6 slash attack peak`, seed: 902 },
      { prompt: `${VFX} three white slash marks with bright flash burst at center, white sparks flying outward, maximum intensity, frame 4 of 6 slash`, seed: 903 },
      { prompt: `${VFX} three fading white diagonal slash marks becoming transparent, dissipating sparkle particles, frame 5 of 6 slash fading`, seed: 904 },
      { prompt: `${VFX} very faint ghost traces of diagonal marks nearly invisible, tiny fading white sparkles, almost gone, frame 6 of 6 slash end`, seed: 905 },
    ],
  },
  {
    name: 'anim_lightning',
    frames: [
      { prompt: `${VFX} tiny bright yellow electric spark at top center, small electrical charge dot, dark surrounding, frame 1 of 6 lightning strike`, seed: 920 },
      { prompt: `${VFX} bright yellow jagged lightning bolt halfway down from top, electric glow and small sparks at tip, frame 2 of 6 lightning`, seed: 921 },
      { prompt: `${VFX} full bright yellow-white jagged lightning bolt from top to bottom center, bright flash at base, electric arcs, frame 3 of 6 lightning`, seed: 922 },
      { prompt: `${VFX} brilliant white-blue lightning bolt at peak brightness, electric explosion burst at base, sparks radiating, blinding flash, frame 4 of 6 lightning peak`, seed: 923 },
      { prompt: `${VFX} thin fading blue electric arcs where lightning was, residual sparks crackling, dimming glow, frame 5 of 6 lightning fading`, seed: 924 },
      { prompt: `${VFX} last tiny blue-white electric crackles and sparks dissipating, nearly invisible, frame 6 of 6 lightning end`, seed: 925 },
    ],
  },
  {
    name: 'anim_slam',
    frames: [
      { prompt: `${VFX} small dark circular shadow on ground at bottom, anticipation of impact, dust motes, frame 1 of 6 ground slam`, seed: 930 },
      { prompt: `${VFX} brown dust cloud bursting upward from bottom center, small brown rocks starting to fly up, frame 2 of 6 slam impact starting`, seed: 931 },
      { prompt: `${VFX} large circular shockwave ring expanding from center bottom, brown rocks and debris flying upward, dust cloud, frame 3 of 6 slam`, seed: 932 },
      { prompt: `${VFX} massive ground impact shockwave ring at full size, rocks at peak height, bright orange impact flash at center bottom, frame 4 of 6 slam peak`, seed: 933 },
      { prompt: `${VFX} rocks falling back down, shockwave ring fading, brown dust settling, debris scattering outward, frame 5 of 6 slam fading`, seed: 934 },
      { prompt: `${VFX} last dust particles settling, faint crack marks remaining, tiny debris, impact aftermath nearly clear, frame 6 of 6 slam end`, seed: 935 },
    ],
  },
];

async function generate(prompt: string, seed: number): Promise<Buffer> {
  const apiKey = getApiKey();
  const response = await fetch(PIXELLAB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      description: prompt,
      image_size: { width: FRAME_SIZE, height: FRAME_SIZE },
      no_background: true,
      text_guidance_scale: 12,
      seed,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'unknown');
    throw new Error(`API ${response.status}: ${err}`);
  }

  const data = await response.json() as { image: { base64: string } };
  return Buffer.from(data.image.base64, 'base64');
}

async function stitchSheet(name: string, frameBuffers: Buffer[]): Promise<void> {
  const sheetWidth = frameBuffers.length * FRAME_SIZE;
  const rawPath = path.resolve(`public/assets/generated/raw/${name}.png`);
  const finalPath = path.resolve(`public/assets/generated/final/${name}.png`);

  // Back up existing
  if (fs.existsSync(finalPath)) {
    const backupPath = path.resolve(`public/assets/generated/final/${name}_rejected_backup.png`);
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(finalPath, backupPath);
      console.log(`  Backed up old ${name} to ${name}_rejected_backup.png`);
    }
  }

  const composites = frameBuffers.map((buf, i) => ({
    input: buf,
    left: i * FRAME_SIZE,
    top: 0,
  }));

  await sharp({
    create: {
      width: sheetWidth,
      height: FRAME_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(rawPath);

  fs.copyFileSync(rawPath, finalPath);
  console.log(`  ${name}: ${sheetWidth}x${FRAME_SIZE} → ${finalPath}`);
}

async function main() {
  const totalFrames = EFFECTS.reduce((sum, e) => sum + e.frames.length, 0);
  let completed = 0;
  let failed = 0;

  console.log(`\n=== Regenerating ${EFFECTS.length} rejected animations (${totalFrames} frames) ===\n`);

  for (const effect of EFFECTS) {
    console.log(`--- ${effect.name} ---`);
    const frameBuffers: Buffer[] = [];
    let allOk = true;

    for (let i = 0; i < effect.frames.length; i++) {
      const frame = effect.frames[i];
      console.log(`  [${completed + 1}/${totalFrames}] frame_${i}...`);

      try {
        const buf = await generate(frame.prompt, frame.seed);
        frameBuffers.push(buf);

        // Also save individual frame
        const frameDir = path.resolve(`public/assets/generated/frames/${effect.name}`);
        fs.mkdirSync(frameDir, { recursive: true });
        fs.writeFileSync(path.join(frameDir, `frame_${i}.png`), buf);

        console.log(`    OK (${buf.length} bytes)`);
        completed++;
      } catch (err) {
        console.error(`    FAILED: ${err}`);
        failed++;
        allOk = false;
      }
    }

    if (allOk && frameBuffers.length === effect.frames.length) {
      await stitchSheet(effect.name, frameBuffers);
    } else {
      console.log(`  Skipping stitch for ${effect.name} — ${failed} frame(s) failed`);
    }
  }

  console.log(`\n=== DONE: ${completed}/${totalFrames} frames generated, ${failed} failed ===`);
}

main().catch(console.error);
