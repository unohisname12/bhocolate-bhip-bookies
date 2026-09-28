#!/usr/bin/env python3
"""Generate 12-16 frame battle animations for every pet form with PixelLab PixMiniMax, starting from the pet's own
idle frame so each animation is unmistakably the same pet.

Usage: PIXELLAB_API_KEY=... python3 scripts/generate-battle-anims.py [form ...]
A form is a combat key like `ember_fox`, `ember_fox__juvenile` or `slime_baby__adult`. With no forms, every form is
queued. Raw frames land in art-source/battle-v2/<form>/<move>.png (one horizontal strip of 128px frames); finished
strips are skipped, so a re-run never pays twice. scripts/pack-battle-anims.py turns them into game sheets.
"""
import base64, io, json, os, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

OUT = 'art-source/battle-v2'
STAGES = ['baby', 'juvenile', 'adult']
# species: (element used in its big move, what its body attacks with)
SPECIES = {
    'koala_sprite': ('a rushing wave of glowing tide water', 'a bouncy belly bump'),
    'ember_fox': ('a roaring burst of fire', 'a quick claw swipe'),
    'moss_turtle': ('a storm of leaves and green crystal shards', 'a sturdy shell bash'),
    'luna_owl': ('a beam of silver moonlight and stars', 'a flurry of wing buffets'),
    'clover_rabbit': ('a whirl of clover leaves on the wind', 'a spinning double kick'),
    'ripple_otter': ('a spiralling jet of river water', 'a tail slap'),
    'nova_axolotl': ('a burst of sparkling cosmic starlight', 'a quick headbutt'),
    'bramble_hedgehog': ('a volley of thorny bramble spikes', 'a rolling spiky tackle'),
    'zephyr_dragon': ('a spiralling gust of wind', 'a wing swipe'),
    'subtrak': ('a glowing crescent-moon blade wave', 'a swift paw slash'),
    'slime_baby': ('a splash of glowing emerald crystal jelly', 'a squishy body slam'),
    'mech_bot': ('a crackling blue electric pulse blast', 'a spring-loaded punch'),
}
MOVES = {
    # move: (frames, description) — the opponent is always to the right.
    'attack': (12, 'lunges forward to the right and hits with {melee}, then hops back into a ready battle stance'),
    'special': (16, 'crouches and charges up, then unleashes {element} toward the right, a big bright flashy attack, then settles back into a ready stance'),
    'defend': (12, 'braces its feet and raises a glowing round protective bubble shield in front of itself, holding it steady'),
    'hurt': (8, 'is hit from the right, flinches and recoils backward squinting, then shakes it off and recovers'),
    'heal': (12, 'happily munches a small healing snack and glows with soft green sparkles, looking refreshed'),
    'focus': (12, 'closes its eyes and concentrates while swirling glowing energy particles gather around its body, powering up'),
    'victory': (12, 'celebrates a victory with a happy jump, a cheer and little sparkles'),
    'ko': (8, 'gets tired and wobbles, then flops down to sit with dizzy little stars circling its head'),
}


def key():
    k = os.environ.get('PIXELLAB_API_KEY')
    if k:
        return k
    import re
    return re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', open(os.path.expanduser('~/Documents/pixellab')).read()).group(0)


def call(method, path, body=None):
    for attempt in range(400):
        req = urllib.request.Request('https://api.pixellab.ai/v2' + path, method=method,
                                     data=json.dumps(body).encode() if body is not None else None,
                                     headers={'Authorization': f'Bearer {key()}', 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:  # the plan caps concurrent jobs; wait for a slot instead of failing the move
                time.sleep(20)
                continue
            if e.code not in (500, 502, 503):
                raise RuntimeError(f'{e.code} {e.read()[:300]}')
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            pass
        time.sleep(min(60, 5 * 2 ** min(attempt, 4)))
    raise RuntimeError('PixelLab kept refusing the request')


def idle_frame(form):
    species, _, stage = form.partition('__')
    stage = stage or 'baby'
    if species == 'koala_sprite' and stage == 'baby':
        sheet = Image.open('public/assets/woodland-v1/pip-idle.png').convert('RGBA')
    else:
        sheet = Image.open(f'public/assets/companions-v2/{species}-{stage}.png').convert('RGBA')
    return sheet.crop((0, 0, 128, 128))


def make(job):
    form, move = job
    path = f'{OUT}/{form}/{move}.png'
    if os.path.exists(path):
        return form, move, 'exists'
    species = form.split('__')[0]
    element, melee = SPECIES[species]
    frames, text = MOVES[move]
    buf = io.BytesIO(); idle_frame(form).save(buf, 'PNG')
    r = call('POST', '/animate-pixminimax', {'first_frame': {'type': 'base64', 'base64': base64.b64encode(buf.getvalue()).decode()},
                                            'description': text.format(element=element, melee=melee), 'frame_count': frames, 'no_background': True})
    for _ in range(300):
        j = call('GET', f"/background-jobs/{r['background_job_id']}")
        if j.get('status') in ('completed', 'failed', 'error'):
            break
        time.sleep(4)
    if j.get('status') != 'completed':
        return form, move, j.get('status')
    imgs = [Image.open(io.BytesIO(base64.b64decode((x.get('base64') if isinstance(x, dict) else x).split(',', 1)[-1]))).convert('RGBA')
            for x in j['last_response']['images']]
    strip = Image.new('RGBA', (128 * len(imgs), 128))
    for i, im in enumerate(imgs):
        strip.paste(im.resize((128, 128), Image.NEAREST) if im.size != (128, 128) else im, (i * 128, 0))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    strip.save(path)
    return form, move, j.get('usage', {}).get('generations')


def all_forms():
    return [s if st == 'baby' else f'{s}__{st}' for s in SPECIES for st in STAGES]


if __name__ == '__main__':
    forms = sys.argv[1:] or all_forms()
    jobs = [(f, m) for f in forms for m in MOVES]
    with ThreadPoolExecutor(7) as ex:
        for result in ex.map(make, jobs):
            print(*result, flush=True)
