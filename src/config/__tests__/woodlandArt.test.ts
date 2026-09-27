import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { ASSETS } from '../assetManifest';
import { PIP_PETS, PIP_COMBAT } from '../woodlandArt';
import { getSceneConfig } from '../sceneConfig';

describe('Woodland production art', () => {
  it('uses new art for every live Pip reaction and combat action', () => {
    for (const [key, config] of Object.entries(PIP_PETS)) {
      expect(ASSETS.pets[key]).toBe(config);
      expect(config.url).toContain('/woodland-v1/');
      for (const range of Object.values(config.animations)) {
        expect(range.startFrame).toBeGreaterThanOrEqual(0);
        expect(range.endFrame).toBeLessThan(config.frames);
      }
    }
    expect(ASSETS.combatAnims.koala_sprite).toBe(PIP_COMBAT);
    expect(ASSETS.petPortraits.koala_sprite).toContain('/woodland-v1/');
  });

  it('ships correctly sized transparent sheets with grounded feet', async () => {
    for (const name of ['idle', 'walking', 'happy', 'eating', 'sleeping', 'action']) {
      const file = `public/assets/woodland-v1/pip-${name}.png`;
      const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect([info.width, info.height]).toEqual([512, 128]);
      for (let frame = 0; frame < 4; frame++) {
        let bottom = 0, solid = 0;
        for (let y = 0; y < 128; y++) for (let x = frame * 128; x < (frame + 1) * 128; x++) {
          if (data[(y * 512 + x) * 4 + 3] > 32) { solid++; bottom = y; }
        }
        expect(solid).toBeGreaterThan(1500);
        expect(bottom).toBeGreaterThanOrEqual(114);
        expect(bottom).toBeLessThanOrEqual(116);
        expect(data[(frame * 128) * 4 + 3]).toBe(0);
      }
    }
  });

  it('replaces both rooms without layering old props over the new backdrops', async () => {
    for (const room of ['inside', 'outside'] as const) {
      const scene = getSceneConfig(room);
      expect(scene.props).toEqual([]);
      expect(scene.layers).toHaveLength(1);
      const meta = await sharp(`public${scene.layers[0].asset}`).metadata();
      expect([meta.width, meta.height]).toEqual([400, 224]);
      expect(scene.walkBounds.minX).toBeGreaterThan(100);
      expect(scene.walkBounds.maxX).toBeLessThan(300);
    }
  });
});
