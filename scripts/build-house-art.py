#!/usr/bin/env python3
"""Build the living-house room art from the PixelLab room paintings in art-source/house-v2.

Needs numpy, scipy and pillow. Usage: python3 scripts/build-house-art.py

Each room painting shares one layout (the hall was the style image for the rest), so the back wall
always sits at rows WALL_TOP..WALL_BOTTOM. The plain wallpaper is not perfectly periodic, so instead of
stretching a painting we split it: one seamless wallpaper+wainscot tile cut from the hall (recoloured per
wall choice) and each room's wall decorations lifted out as a sprite layer, re-spaced for every room size.
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'art-source/house-v2'
OUT = 'public/assets/house-v2'
ROOMS = ['hall', 'den', 'kitchen', 'bathroom', 'bedroom', 'landing', 'studio', 'garden']
WALL_TOP, WALL_BOTTOM, WALL_LEFT, WALL_RIGHT = 15, 208, 26, 422
WAINSCOT = 127  # first wainscot row inside the wall band
TIER_WIDTHS = [10 * 32, 12 * 32, 14 * 32]  # roomSize(tier).cols + 2 walkable edge tiles, 32px tiles
FLOORS = {'oak': 'tile_0', 'walnut': 'tile_5', 'birch': 'tile_9', 'tile': 'tile_15'}


def load(path):
    return np.asarray(Image.open(path).convert('RGBA')).astype(np.int32)


def save(arr, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(arr.clip(0, 255).astype(np.uint8)).save(path, optimize=True)


def wall_band(room):
    return load(f'{SRC}/rooms/{room}.png')[WALL_TOP:WALL_BOTTOM, WALL_LEFT:WALL_RIGHT]


def plain_map(w, r=3, thr=18):
    """A wallpaper pixel's neighbourhood reappears one or more pattern repeats away; a decoration's does not."""
    H, W = w.shape[:2]
    rgb = w[..., :3]
    best = np.full((H, W), 1e9)
    for base in (28, 57, 85, 113):
        for dx in range(base - 2, base + 3):
            for sgn in (1, -1):
                for dy in (-2, -1, 0, 1, 2):
                    sh = np.full_like(rgb, 10 ** 6)
                    xs = slice(max(0, -sgn * dx), min(W, W - sgn * dx)); xd = slice(max(0, sgn * dx), min(W, W + sgn * dx))
                    ys = slice(max(0, -dy), min(H, H - dy)); yd = slice(max(0, dy), min(H, H + dy))
                    sh[ys, xs] = rgb[yd, xd]
                    d = np.abs(rgb - sh).sum(axis=2).clip(0, 765)
                    best = np.minimum(best, ndimage.uniform_filter(d.astype(float), size=2 * r + 1, mode='nearest'))
    return best < thr, best


def zone_palette(z, share=.01):
    cols, counts = np.unique(z.reshape(-1, 4), axis=0, return_counts=True)
    return cols[counts >= share * counts.sum()][:, :3]


def near(z, pal, tol):
    return np.abs(z[..., None, :3] - pal[None, None]).sum(axis=-1).min(axis=-1) <= tol


def decor_mask(w):
    """Decorations = pixels far from the wall's own plain colours (greens above the wainscot, creams and
    browns below), grown into neighbouring pixels that also break the wallpaper repeat (leaves, towels)."""
    pa = zone_palette(w[:WAINSCOT]); pa = pa[(pa[:, 1] >= pa[:, 0]) & (pa[:, 1] >= pa[:, 2] - 10)]
    pb = zone_palette(w[WAINSCOT:]); pb = pb[(pb.sum(axis=1) > 480) | ((pb[:, 0] > pb[:, 2] + 20) & (pb[:, 0] < 140))]
    m = np.zeros(w.shape[:2], bool)
    m[:WAINSCOT] = ~near(w[:WAINSCOT], pa, 24); m[WAINSCOT:] = ~near(w[WAINSCOT:], pb, 24)
    m = ndimage.binary_opening(m, iterations=1)
    periodic, _ = plain_map(w)
    m |= ~periodic & ndimage.binary_dilation(m, iterations=6)
    m = ndimage.binary_opening(m, iterations=1)
    m = ndimage.binary_closing(m, iterations=2)
    m = ndimage.binary_fill_holes(m)
    exact = np.zeros(w.shape[:2], bool)
    exact[:WAINSCOT] = near(w[:WAINSCOT], pa, 6); exact[WAINSCOT:] = near(w[WAINSCOT:], pb, 6)
    for _ in range(6):  # peel the wallpaper fringe the growth step picked up
        edge = m & ~ndimage.binary_erosion(m)
        m &= ~(edge & exact)
    m = ndimage.binary_opening(m, iterations=1)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    return np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v >= 50])


def wall_tile():
    w = wall_band('hall')
    # Seamless 28px repeat found by searching plain columns whose left and right edges match exactly.
    paper = w[:WAINSCOT, 0:28]
    wains = w[WAINSCOT:, 3:31]
    return np.concatenate([paper, wains], axis=0)


def ramp_map(block, rows, ramp, test=lambda c: True):
    """Gradient-map pixels in `rows` by luminance onto `ramp` so shading and pattern survive a colour change."""
    out = block.copy()
    y0, y1 = rows
    region = out[y0:y1]
    lum = (0.3 * region[..., 0] + 0.59 * region[..., 1] + 0.11 * region[..., 2]) / 255
    sel = np.array([[test(c) for c in row] for row in region])
    vals = lum[sel]
    lo, hi = np.percentile(vals, 2), np.percentile(vals, 98)
    t = ((lum - lo) / max(1e-6, hi - lo)).clip(0, 1) * (len(ramp) - 1)
    i = np.minimum(t.astype(int), len(ramp) - 2)
    f = (t - i)[..., None]
    r = np.array(ramp)
    col = r[i] * (1 - f) + r[i + 1] * f
    region[..., :3] = np.where(sel[..., None], np.round(col), region[..., :3])
    return out


def hexes(*cs):
    return [tuple(int(c[k:k + 2], 16) for k in (1, 3, 5)) for c in cs]


def wall_variants(tile):
    greenish = lambda c: c[1] >= c[0] and c[1] >= c[2] - 10
    paper = (0, WAINSCOT)
    v = {'sage': tile}
    v['cream'] = ramp_map(tile, paper, hexes('#8c7458', '#bba684', '#dccdb0', '#ece0c8', '#f6eedc'), greenish)
    v['rose'] = ramp_map(tile, paper, hexes('#6e4652', '#946a73', '#c69b9b', '#dcb3ae', '#efd3cb'), greenish)
    blue = ramp_map(tile, paper, hexes('#3d5f78', '#6d93aa', '#99b9c6', '#bcd3dc', '#dbe9ee'), greenish)
    # Seaside stripes: pale bands behind the sprigs, confined to the 28px repeat so the tile stays seamless.
    bg = blue[:WAINSCOT, :, :3]
    base = np.median(bg.reshape(-1, 3), axis=0)
    for x in list(range(0, 5)) + list(range(14, 19)):
        col = blue[:WAINSCOT, x]
        near = np.abs(col[:, :3] - base).sum(axis=1) < 30
        col[near, :3] = hexes('#d4e6ec')[0]
    v['blue'] = blue
    night = ramp_map(tile, paper, hexes('#1e2540', '#2f3a5e', '#465483', '#5b6b9c', '#7384b3'), greenish)
    night = ramp_map(night, (WAINSCOT, tile.shape[0]), hexes('#7d7f96', '#a3a5bb', '#c3c4d6', '#d8d9e6', '#e8e8f1'),
                     lambda c: c[0] + c[1] + c[2] > 420)
    for (x, y) in ((6, 9), (21, 40), (11, 71), (24, 98), (4, 113), (16, 25)):
        night[y, x, :3] = hexes('#f6d98b')[0]
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            night[y + dy, x + dx, :3] = hexes('#b99a5a')[0]
    v['night'] = night
    return v


def decor_items(m):
    W = m.shape[1]
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=2))
    items = []
    for g in range(1, n + 1):
        sel = m & (lab == g)
        if sel.sum() < 30:
            continue
        # A garland touching a window would glue them together: cut the piece where a long run of columns
        # holds only a short strip of pixels, so the garland becomes its own droppable piece.
        counts = sel.sum(axis=0)
        thin = (counts > 0) & (counts <= 14)
        cuts, x = [], 0
        while x < len(thin):
            if thin[x]:
                e = x
                while e < len(thin) and thin[e]:
                    e += 1
                if e - x >= 30:
                    cuts.append((x, e))
                x = e
            else:
                x += 1
        bounds = sorted({0, W} | {c for run in cuts for c in run})
        for a, b in zip(bounds, bounds[1:]):
            part = sel.copy(); part[:, :a] = False; part[:, b:] = False
            if part.sum() >= 12:
                xs = np.nonzero(part)[1]
                items.append((xs.min(), xs.max() + 1, part))
    return items


def columns(items):
    """Pieces that share any x range (a shelf above a rack, a garland under a window) move as one column."""
    clusters = []
    for x0, x1, sel in sorted(items, key=lambda it: it[0]):
        if clusters and x0 < clusters[-1][1]:
            c = clusters[-1]; c[1] = max(c[1], x1); c[2] = c[2] | sel
        else:
            clusters.append([x0, x1, sel])
    return clusters


def fit_decor(w, m, width, margin=6):
    """Re-space the wall's decorations for a wall `width` wide: every piece stays whole and in order, only the
    plain wallpaper between them squeezes or widens. A narrow room first drops thin spanning pieces (garlands,
    string lights), then the smallest pieces."""
    H, W = m.shape
    items = decor_items(m)
    while items:
        clusters = columns(items)
        used = sum(c[1] - c[0] for c in clusters)
        free = width - used - 2 * margin
        if free >= 4 * (len(clusters) - 1):
            break
        thin = [it for it in items if it[2].sum() / ((it[1] - it[0]) * H) < .12 and it[1] - it[0] > 60]
        items.remove(min(thin, key=lambda it: it[2].sum() / (it[1] - it[0])) if thin else min(items, key=lambda it: it[2].sum()))
    out = np.zeros((H, width, 4), np.int32)
    if not items:
        return out
    gaps = [clusters[0][0]] + [b[0] - a[1] for a, b in zip(clusters, clusters[1:])] + [W - clusters[-1][1]]
    scale = free / max(1, sum(gaps))
    x = margin + round(gaps[0] * scale)
    for i, (x0, x1, sel) in enumerate(clusters):
        ys, xs = np.nonzero(sel)
        out[ys, xs - x0 + x] = w[ys, xs]
        x += (x1 - x0) + round(gaps[i + 1] * scale)
    return out


def window_lights(decor):
    """Column spans of bright window glass in a decor layer, so the painter can cast matching sun patches."""
    rgb, alpha = decor[..., :3], decor[..., 3] > 0
    bright = alpha & (rgb.sum(axis=2) > 640) & (rgb[..., 2] < rgb[..., 0])
    counts = bright.sum(axis=0)
    spans, x = [], 0
    while x < len(counts):  # glass is tall; a clock face or a pinned drawing is not
        if counts[x] >= 24:
            e = x
            while e < len(counts) and counts[e] >= 8:
                e += 1
            if spans and x - spans[-1][1] < 14:
                spans[-1][1] = int(e)
            else:
                spans.append([int(x), int(e)])
            x = e
        else:
            x += 1
    return [s for s in spans if s[1] - s[0] >= 26]


def frame_pieces():
    """9-slice frame from the hall painting. The painting's right edge is a pixel narrower, so the right side
    mirrors the left."""
    a = load(f'{SRC}/rooms/hall.png')
    left, top, bottom = a[40:41, 13:26], a[0:15, 200:201], a[379:407, 200:201]
    tl, bl = a[0:15, 13:26], a[379:407, 13:26]
    pieces = {'left': left, 'right': left[:, ::-1], 'top': top, 'bottom': bottom,
              'tl': tl, 'tr': tl[:, ::-1], 'bl': bl, 'br': bl[:, ::-1]}
    for piece in pieces.values():  # the painting's white canvas shows through the bevelled corners
        piece[piece[..., :3].sum(axis=2) > 700, 3] = 0
    return pieces


def main():
    os.makedirs(OUT, exist_ok=True)
    tile = wall_tile()
    for name, block in wall_variants(tile).items():
        save(block, f'{OUT}/wall-{name}.png')
    lights = {}
    for room in ROOMS:
        w = wall_band(room)
        m = decor_mask(w)
        lights[room] = []
        for tier, width in enumerate(TIER_WIDTHS):
            decor = fit_decor(w, m, width)
            save(decor, f'{OUT}/decor-{room}-{tier}.png')
            lights[room].append(window_lights(decor))
    for fid, src in FLOORS.items():
        save(load(f'{SRC}/floors/{src}.png'), f'{OUT}/floor-{fid}.png')
    pieces = frame_pieces()
    for k, v in pieces.items():
        save(v, f'{OUT}/frame-{k}.png')
    meta = {'wallHeight': WALL_BOTTOM - WALL_TOP, 'wainscot': WAINSCOT, 'wallTile': 28, 'floorTile': 64,
            'frame': {'side': 13, 'top': 15, 'bottom': 28}, 'widths': TIER_WIDTHS, 'lights': lights}
    with open('src/features/living-house/houseArtMeta.ts', 'w') as f:
        f.write('// Generated by scripts/build-house-art.py.\nexport default ' + json.dumps(meta) + ';\n')
    print('built', OUT, meta)


if __name__ == '__main__':
    main()
