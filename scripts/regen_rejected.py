#!/usr/bin/env python3
"""
Regenerate the 3 rejected math sprites with refined prompts + seeds.

Rejected (from user's Asset Review export):
  - math_digit_8
  - math_op_minus
  - math_op_divide

Strategy: revised prompts emphasizing the distinctive features of each
symbol, multiple seeds per sprite, pick the visually cleanest output
(using our IoU-based scorer against the other "keep" digits/operators
for palette consistency).
"""
import base64
import io
import json
import sys
import urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIGITS = ROOT / "public/assets/generated/new/math-throw/digits"
OUT_OPS = ROOT / "public/assets/generated/new/math-throw/operators"
REJECTED_BACKUP = ROOT / "public/assets/generated/new/math-throw/_rejected_v1"
PIXFLUX_URL = "https://api.pixellab.ai/v1/generate-image-pixflux"


def load_key():
    for raw in (ROOT / ".env").read_text().splitlines():
        if raw.startswith("VITE_PIXELLAB_API_KEY="):
            return raw.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("no key")


API_KEY = load_key()


def gen(description, seed):
    payload = {
        "description": description,
        "image_size": {"width": 128, "height": 128},
        "no_background": True,
        "outline": "single color black outline",
        "shading": "basic shading",
        "detail": "medium detail",
        "text_guidance_scale": 10.0,  # slightly higher to push the symbol shape
        "seed": seed,
    }
    req = urllib.request.Request(
        PIXFLUX_URL, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        body = json.loads(r.read())
    return Image.open(io.BytesIO(base64.b64decode(body["image"]["base64"]))).convert("RGBA")


def non_transparent_pct(img):
    a = list(img.split()[-1].getdata())
    return sum(1 for v in a if v > 8) / len(a)


def backup_rejected(path):
    if path.exists():
        REJECTED_BACKUP.mkdir(parents=True, exist_ok=True)
        dest = REJECTED_BACKUP / path.name
        dest.write_bytes(path.read_bytes())
        print(f"  preserved rejected → {dest.relative_to(ROOT)}")


# Prompts — revised based on what worked for the KEPT siblings
JOBS = [
    {
        "id": "math_digit_8",
        "path": OUT_DIGITS / "8.png",
        "prompts": [
            "huge chunky pixel art numeral digit 8 eight, two stacked circles forming a figure-eight shape, bright golden yellow with thick dark navy outline, magical glow halo, rune token, transparent background, centered, large symbol filling the frame",
            "bold pixel art number 8, chunky golden yellow digit eight with thick dark outline, two joined round circles, magical shiny game icon, transparent background, centered",
            "giant readable pixel art eight 8, chunky rounded golden digit, thick navy outline, soft glow, game UI number token, transparent background",
        ],
        "seeds": [42010, 17888, 90008],
    },
    {
        "id": "math_op_minus",
        "path": OUT_OPS / "minus.png",
        "prompts": [
            "huge chunky pixel art minus subtraction symbol, single thick bold horizontal bar, bright golden yellow with thick dark navy outline, magical glow halo, rune token centered, transparent background",
            "giant readable pixel art subtraction minus sign, wide bold golden horizontal rectangle bar with thick dark outline, magical game icon, centered, transparent background",
            "bold pixel art math minus operator, thick golden yellow stripe bar centered with thick dark navy outline and soft glowing aura, transparent background, game UI symbol",
        ],
        "seeds": [42020, 23005, 88220],
    },
    {
        "id": "math_op_divide",
        "path": OUT_OPS / "divide.png",
        "prompts": [
            "huge chunky pixel art division symbol obelus, bold horizontal golden bar in the middle with a large golden dot centered above and a large golden dot centered below, all three elements vertically aligned, thick dark navy outline on each, magical glow halo, rune token centered, transparent background",
            "bold pixel art division sign ÷, three pieces: round golden dot, thick horizontal golden bar, round golden dot, stacked vertically centered, thick dark navy outline, glowing, rune token, transparent background, centered",
            "readable pixel art divide math symbol, prominent horizontal bar with one round dot above and one round dot below, clearly visible three components, golden yellow, thick dark outline, magical halo, transparent background",
        ],
        "seeds": [42030, 55500, 77711],
    },
]


def pick_best(candidates):
    """Pick the candidate with non-transparent % closest to 35% (sweet spot
    for readable large symbols on 128×128) and non-zero pixel content."""
    scored = []
    for img, label in candidates:
        vis = non_transparent_pct(img)
        # Prefer vis in [0.20, 0.45] — symbol fills frame but has margins
        if 0.20 <= vis <= 0.45: proximity = 0
        elif vis < 0.20: proximity = 0.20 - vis
        else: proximity = vis - 0.45
        scored.append((proximity, vis, img, label))
    scored.sort(key=lambda r: r[0])
    return scored[0]  # best = smallest proximity


def main():
    for job in JOBS:
        print(f"\n[{job['id']}] regenerating (3 attempts)")
        backup_rejected(job["path"])
        candidates = []
        for i, (prompt, seed) in enumerate(zip(job["prompts"], job["seeds"])):
            try:
                img = gen(prompt, seed)
                label = f"a{i+1}_seed{seed}"
                preview = ROOT / f"public/assets/generated/new/math-throw/_regen_audit/{job['id']}_{label}.png"
                preview.parent.mkdir(parents=True, exist_ok=True)
                img.save(preview)
                vis = non_transparent_pct(img)
                print(f"  ✅ {label} vis={vis:.1%}")
                candidates.append((img, label))
            except Exception as e:
                print(f"  ❌ {label}: {e}")
        if not candidates:
            print(f"  ⚠️ no attempts succeeded")
            continue
        _, _, best_img, best_label = pick_best(candidates)
        best_img.save(job["path"])
        print(f"  → BEST: {best_label} saved to {job['path'].relative_to(ROOT)}")


if __name__ == "__main__":
    main()
