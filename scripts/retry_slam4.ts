import * as fs from 'fs';
import * as path from 'path';
const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';
function getApiKey(): string { const key = import.meta.env.VITE_PIXELLAB_API_KEY; if (!key) throw new Error('Missing key'); return key; }
async function main() {
  const apiKey = getApiKey();
  const response = await fetch(PIXELLAB_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ description: 'pixel art combat VFX frame, rocks falling back down, shockwave ring fading, dust cloud settling, debris scattering, dark background, game slam effect frame 5', image_size: { width: 128, height: 128 }, no_background: true, text_guidance_scale: 12, seed: 834 }) });
  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json() as { image: { base64: string } };
  const buf = Buffer.from(data.image.base64, 'base64');
  fs.writeFileSync(path.resolve('public/assets/generated/frames/anim_slam/frame_4.png'), buf);
  console.log(`OK (${buf.length} bytes)`);
}
main().catch(console.error);
