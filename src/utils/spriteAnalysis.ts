export interface FrameGroup {
  start: number;
  end: number;
  name?: string;
}

export interface SpriteAnalysis {
  frames: ImageData[];
  groups: FrameGroup[];
  cols: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
}

/**
 * Compare two ImageData objects using pixel difference
 */
export function compareFrames(frame1: ImageData, frame2: ImageData): number {
  if (frame1.width !== frame2.width || frame1.height !== frame2.height) {
    return 1; // Completely different if dimensions don't match
  }

  const data1 = frame1.data;
  const data2 = frame2.data;
  let diff = 0;
  let totalPixels = 0;

  for (let i = 0; i < data1.length; i += 4) {
    // Skip fully transparent pixels
    if (data1[i + 3] === 0 && data2[i + 3] === 0) continue;

    totalPixels++;
    const rDiff = Math.abs(data1[i] - data2[i]);
    const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
    const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
    const aDiff = Math.abs(data1[i + 3] - data2[i + 3]);

    diff += (rDiff + gDiff + bDiff + aDiff) / 4;
  }

  return totalPixels > 0 ? diff / totalPixels / 255 : 0; // Normalize to 0-1
}

/**
 * Slice a sprite sheet into individual frames
 */
export function sliceSpriteSheet(
  imageData: ImageData,
  cols: number,
  rows: number,
  frameWidth: number,
  frameHeight: number
): ImageData[] {
  const frames: ImageData[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const sourceX = col * frameWidth;
      const sourceY = row * frameHeight;

      // Create new ImageData for this frame
      const frameData = new ImageData(frameWidth, frameHeight);

      // Copy pixels from the sprite sheet
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          const sourceIndex = ((sourceY + y) * imageData.width + (sourceX + x)) * 4;
          const targetIndex = (y * frameWidth + x) * 4;

          frameData.data[targetIndex] = imageData.data[sourceIndex];     // R
          frameData.data[targetIndex + 1] = imageData.data[sourceIndex + 1]; // G
          frameData.data[targetIndex + 2] = imageData.data[sourceIndex + 2]; // B
          frameData.data[targetIndex + 3] = imageData.data[sourceIndex + 3]; // A
        }
      }

      frames.push(frameData);
    }
  }

  return frames;
}

/**
 * Group consecutive similar frames together
 */
export function groupSimilarFrames(frames: ImageData[], threshold: number = 0.1): FrameGroup[] {
  if (frames.length === 0) return [];

  const groups: FrameGroup[] = [];
  let currentGroup: FrameGroup = { start: 0, end: 0 };

  for (let i = 1; i < frames.length; i++) {
    const similarity = 1 - compareFrames(frames[i - 1], frames[i]);

    if (similarity < threshold) {
      // Frames are different, start new group
      currentGroup.end = i - 1;
      groups.push(currentGroup);
      currentGroup = { start: i, end: i };
    } else {
      // Frames are similar, extend current group
      currentGroup.end = i;
    }
  }

  // Add the last group
  groups.push(currentGroup);

  return groups;
}

/**
 * Analyze a sprite sheet and suggest animation groups
 */
export async function analyzeSpriteSheet(
  imageUrl: string,
  cols: number,
  rows: number,
  frameWidth: number,
  frameHeight: number,
  similarityThreshold: number = 0.1
): Promise<SpriteAnalysis> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const frames = sliceSpriteSheet(imageData, cols, rows, frameWidth, frameHeight);
        const groups = groupSimilarFrames(frames, similarityThreshold);

        resolve({
          frames,
          groups,
          cols,
          rows,
          frameWidth,
          frameHeight,
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}
