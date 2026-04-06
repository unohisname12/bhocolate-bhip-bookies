/**
 * Generate multi-frame combat animation sprites.
 * Each effect gets 6 frames, then we stitch them into a horizontal sprite sheet.
 * Run: npx vite-node scripts/generate_combat_anim_frames.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) throw new Error('Missing VITE_PIXELLAB_API_KEY in .env');
  return key;
}

interface FrameDef {
  prompt: string;
  seed: number;
}

interface AnimEffect {
  name: string;
  frames: FrameDef[];
  width: number;
  height: number;
}

const EFFECTS: AnimEffect[] = [
  {
    name: 'anim_slash',
    width: 128, height: 128,
    frames: [
      { prompt: 'pixel art combat VFX frame, very faint thin white diagonal line just starting to appear from top-right, dark fantasy, transparent background, single scratch mark beginning', seed: 800 },
      { prompt: 'pixel art combat VFX frame, two thin white diagonal slash lines sweeping from top-right to bottom-left, motion blur trails, dark fantasy, transparent background', seed: 801 },
      { prompt: 'pixel art combat VFX frame, three bold white diagonal claw slash marks fully extended across frame, bright glowing edges, dark fantasy, transparent background', seed: 802 },
      { prompt: 'pixel art combat VFX frame, three white diagonal slash marks with bright flash at center intersection, sparks flying, peak impact moment, dark fantasy, transparent background', seed: 803 },
      { prompt: 'pixel art combat VFX frame, three fading diagonal slash marks with dissipating white sparkle particles, marks getting transparent, dark fantasy, transparent background', seed: 804 },
      { prompt: 'pixel art combat VFX frame, very faint ghost traces of diagonal slash marks almost invisible, tiny fading sparkles, nearly gone, dark fantasy, transparent background', seed: 805 },
    ],
  },
  {
    name: 'anim_fire',
    width: 128, height: 128,
    frames: [
      { prompt: 'pixel art combat VFX frame, tiny orange ember spark igniting at center, small flame starting, dark background, game fire effect frame 1', seed: 810 },
      { prompt: 'pixel art combat VFX frame, small orange fireball growing with yellow core, flames spreading outward, dark background, game fire effect frame 2', seed: 811 },
      { prompt: 'pixel art combat VFX frame, medium blazing fire explosion, bright orange yellow flames expanding, hot center white glow, dark background, game fire effect frame 3', seed: 812 },
      { prompt: 'pixel art combat VFX frame, large intense fire explosion at peak size, red orange yellow flames filling frame, bright white-hot center, dark background, game fire effect', seed: 813 },
      { prompt: 'pixel art combat VFX frame, fire explosion starting to die down, orange flames shrinking, rising smoke wisps, embers floating up, dark background, game fire effect', seed: 814 },
      { prompt: 'pixel art combat VFX frame, fading fire embers and gray smoke wisps rising upward, last tiny flames disappearing, dark background, game fire effect final frame', seed: 815 },
    ],
  },
  {
    name: 'anim_lightning',
    width: 128, height: 128,
    frames: [
      { prompt: 'pixel art combat VFX frame, dark sky with tiny bright spark appearing at top, electrical charge building, single electric dot, dark background, game lightning frame 1', seed: 820 },
      { prompt: 'pixel art combat VFX frame, jagged bright yellow lightning bolt striking downward halfway, electric sparks at tip, dark background, game lightning effect frame 2', seed: 821 },
      { prompt: 'pixel art combat VFX frame, full bright yellow-white lightning bolt striking from top to bottom, bright flash at impact point, electric arcs, dark background, game lightning frame 3', seed: 822 },
      { prompt: 'pixel art combat VFX frame, lightning bolt at peak brightness with blue-white electric explosion at base, sparks radiating outward, blinding flash, dark background, game lightning', seed: 823 },
      { prompt: 'pixel art combat VFX frame, lightning bolt fading to thin blue electric arcs, residual sparks crackling, dimming glow, dark background, game lightning effect frame 5', seed: 824 },
      { prompt: 'pixel art combat VFX frame, last faint electric crackles dissipating into tiny blue sparks, almost gone, dark background, game lightning effect final frame', seed: 825 },
    ],
  },
  {
    name: 'anim_slam',
    width: 128, height: 128,
    frames: [
      { prompt: 'pixel art combat VFX frame, small dark shadow appearing on ground below, something about to land, anticipation frame, dark background, game impact effect frame 1', seed: 830 },
      { prompt: 'pixel art combat VFX frame, brown dust cloud starting to burst upward from ground, small rocks starting to fly, beginning of impact, dark background, game slam effect', seed: 831 },
      { prompt: 'pixel art combat VFX frame, large ground impact shockwave ring expanding, brown rocks and debris flying upward, dust cloud, dark background, game slam effect peak frame', seed: 832 },
      { prompt: 'pixel art combat VFX frame, massive ground crater impact with shockwave ring at full size, rocks at maximum height, bright impact flash, dark background, game slam effect', seed: 833 },
      { prompt: 'pixel art combat VFX frame, rocks falling back down, shockwave ring fading, dust cloud settling, debris scattering, dark background, game slam effect frame 5', seed: 834 },
      { prompt: 'pixel art combat VFX frame, last dust particles settling to ground, faint crack marks on floor, impact aftermath, nearly clear, dark background, game slam effect final', seed: 835 },
    ],
  },
  {
    name: 'anim_shield',
    width: 128, height: 128,
    frames: [
      { prompt: 'pixel art combat VFX frame, tiny blue energy point appearing at center, shield beginning to form, single glowing blue dot, dark background, game shield effect frame 1', seed: 840 },
      { prompt: 'pixel art combat VFX frame, blue hexagonal shield barrier half-formed, translucent blue energy expanding outward in circle, dark background, game shield effect frame 2', seed: 841 },
      { prompt: 'pixel art combat VFX frame, full circular blue energy shield barrier formed, bright glowing blue edges, translucent center, hexagonal pattern visible, dark background, game shield', seed: 842 },
      { prompt: 'pixel art combat VFX frame, blue energy shield at peak brightness pulsing with bright white flash, fully solid barrier, protective dome at maximum power, dark background, game shield', seed: 843 },
      { prompt: 'pixel art combat VFX frame, blue shield barrier starting to fade, becoming more translucent, energy dissipating from edges inward, dark background, game shield effect frame 5', seed: 844 },
      { prompt: 'pixel art combat VFX frame, very faint ghost of blue shield almost invisible, last blue sparkles fading, nearly gone, dark background, game shield effect final frame', seed: 845 },
    ],
  },
  {
    name: 'anim_heal',
    width: 128, height: 128,
    frames: [
      { prompt: 'pixel art combat VFX frame, two tiny green sparkle particles appearing from edges, healing magic beginning, dark background, game heal effect frame 1', seed: 850 },
      { prompt: 'pixel art combat VFX frame, several green glowing orbs floating inward toward center, green sparkle trail behind each, healing magic gathering, dark background, game heal effect', seed: 851 },
      { prompt: 'pixel art combat VFX frame, many bright green healing orbs converging at center with green plus symbol forming, swirling green particles, dark background, game heal effect frame 3', seed: 852 },
      { prompt: 'pixel art combat VFX frame, bright green healing burst at center with large glowing green plus sign, maximum green glow and sparkles, peak healing power, dark background, game heal', seed: 853 },
      { prompt: 'pixel art combat VFX frame, green healing glow fading outward in ring, green sparkles floating upward, plus sign dimming, dark background, game heal effect frame 5', seed: 854 },
      { prompt: 'pixel art combat VFX frame, last few tiny green sparkles drifting upward and fading, very faint green glow remaining, dark background, game heal effect final frame', seed: 855 },
    ],
  },
];

async function generate(prompt: string, width: number, height: number, seed: number): Promise<Buffer> {
  const apiKey = getApiKey();
  const response = await fetch(PIXELLAB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      description: prompt,
      image_size: { width, height },
      no_background: true,
      text_guidance_scale: 12,
      seed,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'unknown');
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json() as { usage: { usd: number }; image: { base64: string } };
  return Buffer.from(data.image.base64, 'base64');
}

async function main() {
  const framesDir = path.resolve('public/assets/generated/frames');
  fs.mkdirSync(framesDir, { recursive: true });

  const totalFrames = EFFECTS.reduce((sum, e) => sum + e.frames.length, 0);
  let completed = 0;
  let failed = 0;

  console.log(`\n=== Generating ${totalFrames} animation frames for ${EFFECTS.length} effects ===\n`);

  for (const effect of EFFECTS) {
    const effectDir = path.join(framesDir, effect.name);
    fs.mkdirSync(effectDir, { recursive: true });

    console.log(`--- ${effect.name} (${effect.frames.length} frames) ---`);

    for (let i = 0; i < effect.frames.length; i++) {
      const frame = effect.frames[i];
      const filename = `frame_${i}.png`;
      console.log(`  [${completed + 1}/${totalFrames}] ${effect.name}/frame_${i}...`);

      try {
        const buf = await generate(frame.prompt, effect.width, effect.height, frame.seed);
        fs.writeFileSync(path.join(effectDir, filename), buf);
        console.log(`    OK (${buf.length} bytes)`);
        completed++;
      } catch (err) {
        console.error(`    FAILED: ${err}`);
        failed++;
      }
    }
  }

  console.log(`\n=== DONE: ${completed} frames generated, ${failed} failed ===`);
  console.log('Run scripts/stitch_sprite_sheets.ts next to combine frames into sprite sheets.');
}

main().catch(console.error);
