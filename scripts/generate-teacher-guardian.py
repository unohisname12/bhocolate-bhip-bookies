#!/usr/bin/env python3
"""Generate the Chalkstone Griffin battle animation set with PixelLab (256x256 frames).

Usage:
  PIXELLAB_API_KEY=... python3 scripts/generate-teacher-guardian.py base <cutout.png> <out_dir>
  PIXELLAB_API_KEY=... python3 scripts/generate-teacher-guardian.py anim <out_dir> [name ...]

`base` converts a transparent cutout of the painted griffin into 256px pixel art.
`anim` animates <out_dir>/base.png into <out_dir>/<name>/frame_NN.png.
Raw frames are kept so a single bad animation can be regenerated without redoing the set.
"""
import base64, io, json, os, sys, time, urllib.request
from PIL import Image, ImageFilter

API = 'https://api.pixellab.ai/v2'
SIZE = 256
# 256*256*8 is the endpoint's full pixel budget, so every animation is 8 frames.
FRAMES = 8
ACTIONS = {
    'idle': 'standing proudly, slow breathing, wings shifting slightly, feathers ruffling, tail swaying',
    'attack': 'lunges forward and slashes with its front talons, glowing chalk-light streak, then returns to stance',
    'special': 'raises the floating spellbook high, glowing geometric runes spiral out and blast forward',
    'defend': 'wraps its great wings forward in front of its body like a shield, glowing ward shimmers, then opens',
    'hurt': 'recoils backward from a hit, flinching, feathers puffing, then recovers balance',
    'heal': 'spreads wings wide as warm golden light glows from the spellbook and sparkles rise around it',
    'math': 'reads the floating spellbook thoughtfully, pages turning, glowing numbers appear above its head',
    'victory': 'rears up on hind legs with wings fully spread in triumph, spellbook glowing bright',
    'defeat': 'slumps down tired, wings drooping to the ground, head lowered, spellbook dims and closes',
}


def call(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body else None,
                                 headers={'Authorization': f"Bearer {os.environ['PIXELLAB_API_KEY']}",
                                          'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise SystemExit(f'{path} -> {e.code}: {e.read().decode()[:500]}')


def b64(img):
    buf = io.BytesIO(); img.save(buf, 'PNG')
    return {'type': 'base64', 'base64': base64.b64encode(buf.getvalue()).decode(), 'format': 'png'}


def unb64(obj):
    data = obj['base64'].split(',', 1)[-1]
    return Image.open(io.BytesIO(base64.b64decode(data))).convert('RGBA')


def wait(job_id):
    while True:
        job = call(f'/background-jobs/{job_id}')
        if job['status'] == 'completed':
            return job['last_response']
        if job['status'] == 'failed':
            raise SystemExit(f"job {job_id} failed: {job.get('last_response')}")
        time.sleep(4)


def base(cutout, out_dir):
    src = Image.open(cutout).convert('RGBA')
    res = call('/image-to-pixelart', {
        'image': b64(src), 'image_size': {'width': src.width, 'height': src.height},
        'output_size': {'width': SIZE, 'height': SIZE}, 'fixer': True, 'init_image_strength': 800,
    })
    img = unb64(res['image'])
    # The converter returns an opaque image; restore transparency from the cutout's own alpha.
    mask = src.getchannel('A').resize((SIZE, SIZE), Image.NEAREST).point(lambda v: 255 if v > 127 else 0)
    img.putalpha(mask)
    os.makedirs(out_dir, exist_ok=True)
    img.save(f'{out_dir}/base_raw.png')
    # Faithful mode keeps painterly noise; a flat palette + dark 1px outline matches the student pet sprites.
    flat = img.convert('RGB').quantize(colors=64, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGBA')
    flat.putalpha(mask)
    outline = Image.new('RGBA', img.size, (22, 18, 34, 255))
    outline.putalpha(mask.filter(ImageFilter.MaxFilter(3)))
    img = Image.new('RGBA', img.size, (0, 0, 0, 0))
    img.alpha_composite(outline); img.alpha_composite(flat)
    img.save(f'{out_dir}/base.png')
    print('saved', f'{out_dir}/base.png', res.get('usage'))


def anim(out_dir, names):
    first = Image.open(f'{out_dir}/base.png').convert('RGBA')
    for name in names or ACTIONS:
        res = call('/animate-with-text-v3', {
            'first_frame': b64(first), 'action': ACTIONS[name], 'frame_count': FRAMES,
            'no_background': True, 'seed': 0,
        })
        frames = wait(res['background_job_id'])['images']
        os.makedirs(f'{out_dir}/{name}', exist_ok=True)
        for i, f in enumerate(frames):
            unb64(f).save(f'{out_dir}/{name}/frame_{i:02d}.png')
        print(name, len(frames), 'frames')


if __name__ == '__main__':
    cmd, *args = sys.argv[1:]
    base(*args) if cmd == 'base' else anim(args[0], args[1:])
