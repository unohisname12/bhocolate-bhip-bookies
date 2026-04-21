/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ASSETS } from '../assetManifest';
import type { SpriteSheetConfig } from '../../engine/animation/types';

/**
 * PNG files encode width/height as big-endian uint32s at bytes 16–23.
 * Reading the first 24 bytes is enough to extract them without a decoder.
 */
function readPngDimensions(absPath: string): { width: number; height: number } {
  const buf = readFileSync(absPath);
  if (buf.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`Not a PNG: ${absPath}`);
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

const PUBLIC_DIR = join(process.cwd(), 'public');

describe('assetManifest — sprite sheet dimensions', () => {
  const entries = Object.entries(ASSETS.pets).filter(
    ([, cfg]) => (cfg as SpriteSheetConfig).spriteSheet,
  ) as Array<[string, SpriteSheetConfig]>;

  for (const [key, cfg] of entries) {
    it(`${key} config matches sheet at ${cfg.url}`, () => {
      // Only assert for pet-art sheets that live under /assets/pets/
      if (!cfg.url.startsWith('/assets/pets/')) return;

      const absPath = join(PUBLIC_DIR, cfg.url);
      if (!existsSync(absPath)) {
        throw new Error(`Missing sprite file: ${absPath}`);
      }

      const { width, height } = readPngDimensions(absPath);
      const expectedWidth = cfg.cols * cfg.frameWidth;
      const expectedHeight = cfg.rows * cfg.frameHeight;

      expect(width, `${key}: cols×frameWidth (${expectedWidth}) must equal image width (${width})`).toBe(expectedWidth);
      expect(height, `${key}: rows×frameHeight (${expectedHeight}) must equal image height (${height})`).toBe(expectedHeight);

      // Frame count must also match cols × rows
      expect(cfg.frames, `${key}: frames (${cfg.frames}) must equal cols×rows (${cfg.cols * cfg.rows})`).toBe(cfg.cols * cfg.rows);
    });
  }
});

describe('assetManifest — combatAnim dimensions', () => {
  const species = Object.entries(ASSETS.combatAnims);
  for (const [speciesId, anims] of species) {
    for (const [animName, cfg] of Object.entries(anims as Record<string, { url: string; frameCount: number; frameWidth: number; frameHeight: number }>)) {
      it(`combatAnims.${speciesId}.${animName} matches sheet`, () => {
        if (!cfg.url.startsWith('/assets/pets/')) return;

        const absPath = join(PUBLIC_DIR, cfg.url);
        if (!existsSync(absPath)) {
          throw new Error(`Missing combat sprite: ${absPath}`);
        }

        const { width, height } = readPngDimensions(absPath);
        const expectedWidth = cfg.frameCount * cfg.frameWidth;
        expect(width, `${speciesId}.${animName}: frameCount×frameWidth (${expectedWidth}) must equal image width (${width})`).toBe(expectedWidth);
        expect(height, `${speciesId}.${animName}: frameHeight (${cfg.frameHeight}) must equal image height (${height})`).toBe(cfg.frameHeight);
      });
    }
  }
});
