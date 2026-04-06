/**
 * Manual test for Pixel Lab API integration.
 * Run via: npx vite-node src/services/__tests__/pixelLab.test.ts
 *
 * SECURITY: Does NOT log the API key. Only reports success/failure and response shape.
 */

import { generatePixelArt } from '../pixelLab';

async function testPixelLab() {
  console.log('[PixelLab Test] Starting...');
  console.log('[PixelLab Test] VITE_PIXELLAB_API_KEY present:', !!import.meta.env.VITE_PIXELLAB_API_KEY);

  try {
    const result = await generatePixelArt('small pixel art blue potion', {
      width: 128,
      height: 128,
    });

    console.log('[PixelLab Test] SUCCESS');
    console.log('[PixelLab Test] Response keys:', Object.keys(result));
    console.log('[PixelLab Test] Has image base64:', !!result.image?.base64);
    console.log('[PixelLab Test] Image base64 length:', result.image?.base64?.length ?? 0);
    console.log('[PixelLab Test] Usage:', result.usage);
  } catch (err) {
    console.error('[PixelLab Test] FAILED:', err instanceof Error ? err.message : err);
  }
}

testPixelLab();
