#!/usr/bin/env python3
"""Retry minus sprite with anti-cross prompts.

The first regen pass had the model drawing plus signs and X's despite
asking for a horizontal bar. This version describes the shape as a
dash/hyphen/horizontal rectangle, never as a math operator, to dodge
the "math symbol → cross" bias.
"""
import base64, io, json, urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/assets/generated/new/math-throw/operators/minus.png"
AUDIT = ROOT / "public/assets/generated/new/math-throw/_regen_audit"
PIXFLUX_URL = "https://api.pixellab.ai/v1/generate-image-pixflux"


def load_key():
    for raw in (ROOT / ".env").read_text().splitlines():
        if raw.startswith("VITE_PIXELLAB_API_KEY="):
            return raw.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("no key")


API_KEY = load_key()


def gen(description, seed, negative=""):
    payload = {
        "description": description,
        "image_size": {"width": 128, "height": 128},
        "no_background": True,
        "outline": "single color black outline",
        "shading": "basic shading",
        "detail": "medium detail",
        "text_guidance_scale": 12.0,  # push harder
        "seed": seed,
    }
    if negative:
        payload["negative_description"] = negative
    req = urllib.request.Request(
        PIXFLUX_URL, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        body = json.loads(r.read())
    return Image.open(io.BytesIO(base64.b64decode(body["image"]["base64"]))).convert("RGBA")


ATTEMPTS = [
    # describe as a rectangular brick — zero "math" cue
    (
        "huge chunky pixel art horizontal golden brick, long wide bar laid flat, rectangle shape three times wider than tall, "
        "bright golden yellow with thick dark navy outline, magical glow halo, centered, transparent background, "
        "NO vertical bar, NO cross, NO plus sign, NO letter X, just a single horizontal stripe",
        "plus sign, cross, letter X, vertical bar, any vertical line, any intersecting shapes",
        31100,
    ),
    # describe as a hyphen/dash
    (
        "huge pixel art dash hyphen symbol, one flat horizontal golden rectangle bar, wide and short, "
        "centered horizontally, thick dark outline, magical glow, transparent background, "
        "absolutely no vertical line, no cross shape",
        "plus, cross, X shape, vertical line, intersection, star, asterisk",
        31101,
    ),
    # describe as a game UI piece/ingot
    (
        "golden pixel art treasure bar ingot lying horizontally, long flat wide rectangle shape three times wider than tall, "
        "bright yellow with thick black outline, soft magical glow, game UI token, centered, transparent background, "
        "no plus sign, no crossing bars",
        "plus sign, cross, vertical bar, standing upright, circular, round",
        31102,
    ),
    # generic horizontal line, very literal
    (
        "one horizontal thick golden line centered on transparent background, nothing else, "
        "pixel art style, thick dark navy outline on the line, bright yellow fill, magical glow, "
        "line is 80 pixels wide and 20 pixels tall",
        "cross, plus, X, vertical, any letter shape, any round shape",
        31103,
    ),
]


def non_transparent_pct(img):
    a = list(img.split()[-1].getdata())
    return sum(1 for v in a if v > 8) / len(a)


def wider_than_tall_ratio(img):
    """Return width/height ratio of the non-transparent bbox. A horizontal bar
    should have ratio >> 1. A plus/cross has ratio ≈ 1. A vertical has ratio < 1."""
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if not bbox:
        return 0
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    return w / max(h, 1)


def has_vertical_spine(img, tol=0.25):
    """Count what fraction of the vertical center column is opaque.
    A plus/cross has spine ≈ full bbox height (~1.0). A horizontal bar has
    spine ≈ bar thickness / bbox height (small)."""
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if not bbox:
        return 0
    cx = (bbox[0] + bbox[2]) // 2
    opaque_col = 0
    total = bbox[3] - bbox[1]
    for y in range(bbox[1], bbox[3]):
        if alpha.getpixel((cx, y)) > 8:
            opaque_col += 1
    return opaque_col / max(total, 1)


def main():
    AUDIT.mkdir(parents=True, exist_ok=True)
    print("[minus] retry with anti-cross prompts (4 attempts)")
    results = []
    for i, (prompt, negative, seed) in enumerate(ATTEMPTS):
        try:
            img = gen(prompt, seed, negative)
            vis = non_transparent_pct(img)
            ratio = wider_than_tall_ratio(img)
            spine = has_vertical_spine(img)
            label = f"retry{i+1}_seed{seed}"
            img.save(AUDIT / f"math_op_minus_{label}.png")
            is_horizontal = ratio > 2.0 and spine < 0.5
            tag = "✅ HORIZONTAL" if is_horizontal else "❌ cross-like"
            print(f"  {label} vis={vis:.1%} w/h={ratio:.2f} spine={spine:.2f} {tag}")
            results.append({
                "label": label, "img": img, "ratio": ratio, "spine": spine,
                "vis": vis, "is_horizontal": is_horizontal,
            })
        except Exception as e:
            print(f"  retry{i+1}: ERROR {e}")
    if not results:
        print("  ⚠️ all failed")
        return
    # pick: prefer is_horizontal=True with highest ratio; else highest ratio
    horiz = [r for r in results if r["is_horizontal"]]
    pool = horiz if horiz else results
    best = max(pool, key=lambda r: r["ratio"])
    best["img"].save(OUT)
    print(f"  → BEST: {best['label']} (ratio={best['ratio']:.2f}, spine={best['spine']:.2f}) → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
