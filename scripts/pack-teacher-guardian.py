#!/usr/bin/env python3
"""Pack raw PixelLab frames from generate-teacher-guardian.py into 256px horizontal strips.

Usage: python3 scripts/pack-teacher-guardian.py <raw_dir>
"""
import sys
from PIL import Image

OUT = 'public/assets/teacher-guardians'
NAMES = ['idle', 'attack', 'special', 'defend', 'hurt', 'heal', 'math', 'victory', 'defeat']
# PixelLab returns the re-rendered first frame plus 8 generated ones; frame 0 duplicates the pose
# at the loop seam, so only frames 1-8 ship.
FRAMES = range(1, 9)

raw = sys.argv[1]
for name in NAMES:
    strip = Image.new('RGBA', (256 * len(FRAMES), 256), (0, 0, 0, 0))
    for col, i in enumerate(FRAMES):
        strip.alpha_composite(Image.open(f'{raw}/{name}/frame_{i:02d}.png').convert('RGBA'), (col * 256, 0))
    strip.save(f'{OUT}/chalkstone-griffin-{name}.png', optimize=True)
Image.open(f'{raw}/idle/frame_01.png').save(f'{OUT}/chalkstone-griffin-sprite.png', optimize=True)
print('packed', len(NAMES), 'strips')
