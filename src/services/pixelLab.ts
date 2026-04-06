const PIXELLAB_API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';

function getApiKey(): string {
  const key = import.meta.env.VITE_PIXELLAB_API_KEY;
  if (!key) {
    throw new Error('Missing PIXELLAB_API_KEY — set VITE_PIXELLAB_API_KEY in .env');
  }
  return key;
}

export interface PixelLabRequest {
  description: string;
  width?: number;
  height?: number;
}

export interface PixelLabResponse {
  usage: { type: string; usd: number };
  image: { type: string; base64: string };
}

export async function generatePixelArt(
  description: string,
  options?: { width?: number; height?: number },
): Promise<PixelLabResponse> {
  const apiKey = getApiKey();
  const width = options?.width ?? 128;
  const height = options?.height ?? 128;

  const response = await fetch(PIXELLAB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      description,
      image_size: { width, height },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error');
    throw new Error(`Pixel Lab API error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<PixelLabResponse>;
}
