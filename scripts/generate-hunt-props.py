#!/usr/bin/env python3
"""Generate Pet Hunt furniture and wall pieces with PixelLab at their native in-game size.

Usage: PIXELLAB_API_KEY=... python3 scripts/generate-hunt-props.py [name ...]
Raw PNGs land in art-source/pet-hunt-props/<theme>/<name>.png; re-run a single name to redo one piece.
Pieces marked "tile" repeat along a wall run instead of being stretched, so they must read as seamless segments.
"""
import base64, io, json, os, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

OUT = 'art-source/pet-hunt-props'
STYLE = 'cozy fantasy pixel art, top-down three-quarter view, crisp dark outline, rich shading'
# name: (theme, width, height, description, transparent)
PIECES = {
  'shelf':        ('workshop', 64, 80, 'tall wooden bookshelf packed with colorful books, brass trim, front view', True),
  'table':        ('workshop', 96, 64, 'round wooden reading table with an open book, a candle and scrolls, seen from above at an angle', True),
  'workbench':    ('workshop', 112, 64, 'long wooden workbench with gears, tools and a small vise, front view', True),
  'crate':        ('workshop', 48, 48, 'sturdy wooden storage crate with metal corners', True),
  'barrel':       ('workshop', 40, 48, 'small oak barrel with iron bands', True),
  'wall_h':       ('workshop', 64, 48, 'flat repeating texture strip of one continuous interior wall made of horizontal wooden planks above a grey stone footing, fills the whole image edge to edge, no frame, no posts, no gaps', True),
  'wall_v':       ('workshop', 32, 64, 'seamless segment of a wooden wall seen from above, narrow top edge with shadow, tileable top to bottom', True),
  'hedge_h':      ('garden', 64, 48, 'seamless segment of a neatly trimmed green hedge row with small flowers, tileable left to right', True),
  'hedge_v':      ('garden', 32, 64, 'seamless segment of a trimmed hedge seen from above, leafy top, tileable top to bottom', True),
  'stone_h':      ('garden', 64, 48, 'flat repeating texture strip of a mossy grey stone garden wall, stones fill the whole image edge to edge, no gaps, no building, straight wall face', True),
  'stone_v':      ('garden', 32, 64, 'flat repeating texture strip of the top of a mossy grey stone wall seen from directly above, stones fill the whole image edge to edge, no frame, no border', True),
  'bench':        ('garden', 64, 40, 'wooden park bench with iron legs, front view', True),
  'pond':         ('garden', 192, 128, 'small round garden pond with lily pads and reeds and a stone rim, seen from above', True),
  'flowerbed':    ('garden', 64, 40, 'raised wooden flower bed full of colorful flowers', True),
  'planter':      ('moonhouse', 96, 48, 'long wooden greenhouse planter box with glowing moonflowers and herbs', True),
  'potting':      ('moonhouse', 96, 56, 'potting bench with clay pots, seedlings and a watering can, front view', True),
  'fountain':     ('moonhouse', 128, 128, 'round stone fountain with softly glowing moonlit water, seen from above', True),
  'glass_h':      ('moonhouse', 64, 48, 'flat repeating texture strip of a greenhouse wall: tall glass panes in a dark iron frame above a low brick base, fills the whole image edge to edge, no roof, no door, not a building', True),
  'glass_v':      ('moonhouse', 32, 64, 'flat repeating texture strip of the top edge of a greenhouse wall seen from directly above: dark iron beam with glass glints, fills the whole image edge to edge, no door, no arch', True),
  'cover_workshop': ('workshop', 96, 64, 'big canvas drop cloth draped over a pile of stacked chairs and boxes, a good hiding spot', True),
  'cover_moon':     ('moonhouse', 96, 64, 'dense clump of tall glowing moonlit ferns and broad leaves, a good hiding spot', True),
  'locker':       ('shared', 40, 64, 'tall metal school locker with a small vent slot, slightly worn, front view', True),
  'vent':         ('shared', 48, 32, 'metal floor vent grate, seen from above', True),
  'cage':         ('shared', 64, 72, 'small iron cage with a padlock, empty, front view', True),
  'key':          ('shared', 32, 32, 'ornate golden key with a small red gem', True),
  'trap':         ('shared', 40, 32, 'small spring snare trap made of rope and wood, seen from above', True),
  'sensor':       ('shared', 32, 64, 'small magical sensor totem pole with a glowing blue crystal on top', True),
}

def call(body):
  # The plan rate-limits bursts: back off and retry on 429 or a dropped connection instead of failing the piece.
  for attempt in range(8):
    req = urllib.request.Request('https://api.pixellab.ai/v2/create-image-pixflux', data=json.dumps(body).encode(),
                                 headers={'Authorization': f"Bearer {os.environ['PIXELLAB_API_KEY']}", 'Content-Type': 'application/json'})
    try:
      with urllib.request.urlopen(req, timeout=240) as r:
        return json.load(r)
    except (urllib.error.HTTPError, urllib.error.URLError, ConnectionError) as e:
      if isinstance(e, urllib.error.HTTPError) and e.code not in (429, 500, 502, 503): raise
      time.sleep(min(60, 5 * 2 ** attempt))
  raise RuntimeError('PixelLab kept refusing the request')

def palette():
  img = Image.open('public/assets/pet-hunt-v3/landmarks.png').convert('RGBA')
  buf = io.BytesIO(); img.save(buf, 'PNG')
  return {'type': 'base64', 'base64': base64.b64encode(buf.getvalue()).decode()}

def make(name, pal):
  theme, w, h, desc, clear = PIECES[name]
  # PixelLab's minimum canvas is 32x32 in area terms; small pieces are generated at 2x and reduced cleanly.
  scale = 2 if w * h < 64 * 64 else 1
  body = {'description': f'{desc}, {STYLE}', 'image_size': {'width': w * scale, 'height': h * scale}, 'view': 'low top-down', 'direction': 'south',
          'outline': 'single color black outline', 'shading': 'detailed shading', 'detail': 'highly detailed', 'no_background': clear, 'color_image': pal}
  res = call(body)
  img = Image.open(io.BytesIO(base64.b64decode(res['image']['base64'].split(',', 1)[-1]))).convert('RGBA')
  if scale > 1: img = img.resize((w, h), Image.NEAREST)
  os.makedirs(f'{OUT}/{theme}', exist_ok=True)
  img.save(f'{OUT}/{theme}/{name}.png')
  return name

if __name__ == '__main__':
  # With no names given, only missing pieces are made, so a re-run never pays twice for finished art.
  names = sys.argv[1:] or [n for n in PIECES if not os.path.exists(f'{OUT}/{PIECES[n][0]}/{n}.png')]
  pal = palette()
  # Each piece saves as soon as it finishes; one failure never throws away the others' paid generations.
  with ThreadPoolExecutor(2) as pool:
    futures = {pool.submit(make, n, pal): n for n in names}
    for f in as_completed(futures):
      try: print('ok', f.result())
      except Exception as e: print('FAILED', futures[f], e)
