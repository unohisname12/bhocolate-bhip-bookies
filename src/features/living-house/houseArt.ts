import meta from './houseArtMeta';
import type {HomeRoomId} from '../home-base/catalog';

/** Room art built by scripts/build-house-art.py from the PixelLab room paintings. One art pixel is one world
 * unit, so the camera must only ever scale it by whole device pixels. */
export const WALL_HEIGHT = meta.wallHeight;
export const FRAME = meta.frame;
const ROOT = '/assets/house-v2';
const images = new Map<string, Promise<HTMLImageElement>>();

function image(name: string): Promise<HTMLImageElement> {
  let found = images.get(name);
  if (!found) {
    found = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { images.delete(name); reject(new Error(`Missing house art ${name}`)); };
      img.src = `${ROOT}/${name}.png`;
    });
    images.set(name, found);
  }
  return found;
}

export type RoomLook = {id: HomeRoomId; tier: number; wall: string; floor: string};
export type RoomArt = {wall: HTMLImageElement; decor: HTMLImageElement; floor: HTMLImageElement; frame: Record<FramePiece, HTMLImageElement>; lights: number[][]};
type FramePiece = 'left' | 'right' | 'top' | 'bottom' | 'tl' | 'tr' | 'bl' | 'br';
const PIECES: FramePiece[] = ['left', 'right', 'top', 'bottom', 'tl', 'tr', 'bl', 'br'];
const WALLS = ['sage', 'cream', 'rose', 'blue', 'night'];
const FLOORS = ['oak', 'walnut', 'birch', 'tile'];

export async function loadRoomArt(look: RoomLook): Promise<RoomArt> {
  const tier = Math.max(0, Math.min(2, look.tier));
  const [wall, decor, floor, ...frame] = await Promise.all([
    image(`wall-${WALLS.includes(look.wall) ? look.wall : 'sage'}`), image(`decor-${look.id}-${tier}`),
    image(`floor-${FLOORS.includes(look.floor) ? look.floor : 'oak'}`), ...PIECES.map(p => image(`frame-${p}`)),
  ]);
  return {wall, decor, floor, frame: Object.fromEntries(PIECES.map((p, i) => [p, frame[i]])) as RoomArt['frame'], lights: (meta.lights as Record<string, number[][][]>)[look.id]?.[tier] ?? []};
}

function repeat(c: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  for (let yy = 0; yy < h; yy += img.height) for (let xx = 0; xx < w; xx += img.width) {
    const cw = Math.min(img.width, w - xx), ch = Math.min(img.height, h - yy);
    c.drawImage(img, 0, 0, cw, ch, x + xx, y + yy, cw, ch);
  }
}

export function paintFloor(c: CanvasRenderingContext2D, art: RoomArt, x: number, y: number, w: number, h: number) {
  // Floor tiles are anchored to the world grid so neighbouring rooms and corridors share one continuous pattern.
  const t = art.floor.width, ox = ((x % t) + t) % t, oy = ((y % t) + t) % t;
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  repeat(c, art.floor, x - ox, y - oy, w + ox, h + oy);
  c.restore();
}

export function band(c: CanvasRenderingContext2D, color: string, steps: [number, number][], x: number, y: number, w: number, dir: 1 | -1) {
  // Stepped (not smooth) shading keeps light and shadow on the pixel grid like hand-painted art.
  let at = y;
  for (const [size, alpha] of steps) { c.fillStyle = color; c.globalAlpha = alpha; c.fillRect(x, dir > 0 ? at : at - size, w, size); at += dir * size; }
  c.globalAlpha = 1;
}

/** Paint one room whose walkable floor starts at (x, y) and is w × h world pixels. The back wall rises above it. */
export function paintRoom(c: CanvasRenderingContext2D, art: RoomArt, x: number, y: number, w: number, h: number, options: {night: boolean; owned: boolean}) {
  const wy = y - WALL_HEIGHT, {side, top, bottom} = FRAME;
  repeat(c, art.wall, x, wy, w, WALL_HEIGHT);
  if (options.owned) c.drawImage(art.decor, 0, 0, Math.min(w, art.decor.width), WALL_HEIGHT, x, wy, Math.min(w, art.decor.width), WALL_HEIGHT);
  paintFloor(c, art, x, y, w, h);
  if (options.owned && !options.night) {
    // Sun through each window: a warm stepped patch that leans away from the glass across the floor.
    c.fillStyle = '#ffe9a8';
    for (const [x0, x1] of art.lights) {
      for (let i = 0; i < 5; i++) {
        c.globalAlpha = .07 - i * .012;
        const grow = i * 10, top0 = y + 4, depth = Math.min(h - 8, 120 + i * 14);
        c.beginPath(); c.moveTo(x + x0 - grow / 2, top0); c.lineTo(x + x1 + grow / 2, top0); c.lineTo(x + x1 + 36 + grow, top0 + depth); c.lineTo(x + x0 + 22 - grow / 2, top0 + depth); c.closePath(); c.fill();
      }
    }
    c.globalAlpha = 1;
  }
  band(c, '#2a1510', [[3, .34], [4, .2], [6, .1]], x, y, w, 1);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  band(c, '#2a1510', [[2, .22], [3, .1]], x, y + h, w, -1);
  c.fillStyle = '#2a1510'; c.globalAlpha = .18; c.fillRect(x, y, 3, h); c.fillRect(x + w - 3, y, 3, h); c.globalAlpha = 1;
  c.restore();
  if (!options.owned) { c.fillStyle = '#120c0a'; c.globalAlpha = .62; c.fillRect(x, wy, w, WALL_HEIGHT + h); c.globalAlpha = 1; }
  if (options.night) { c.fillStyle = '#10163a'; c.globalAlpha = .38; c.fillRect(x, wy, w, WALL_HEIGHT + h); c.globalAlpha = 1; }
  // Frame: 9-slice cut from the same painting. Corridors are painted afterwards and carve the doorways.
  const f = art.frame, fh = WALL_HEIGHT + h;
  c.drawImage(f.top, x, wy - top, w, top); c.drawImage(f.bottom, x, y + h, w, bottom);
  c.drawImage(f.left, x - side, wy, side, fh); c.drawImage(f.right, x + w, wy, side, fh);
  c.drawImage(f.tl, x - side, wy - top); c.drawImage(f.tr, x + w, wy - top); c.drawImage(f.bl, x - side, y + h); c.drawImage(f.br, x + w, y + h);
}

export const loadStairs = (down: boolean) => image(down ? 'stairs-down' : 'stairs-up');

/** Wall pieces hang with their bottom edge just above the wainscot; their grid row is the floor's first row. */
export const WALL_HANG = 64 + WALL_HEIGHT - meta.wainscot + 4;

/** Show a furniture sprite at its native pixel size (or an exact half for oversized legacy art). */
export function fitSprite(img: HTMLImageElement, footprint: number) {
  const w = img.naturalWidth || footprint, h = img.naturalHeight || footprint;
  const scale = w <= footprint * 1.6 ? 1 : w / 2 <= footprint * 1.6 ? .5 : .25;
  img.style.width = `${Math.round(w * scale)}px`; img.style.height = `${Math.round(h * scale)}px`;
}
