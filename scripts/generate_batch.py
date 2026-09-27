#!/usr/bin/env python3
"""
Master batch generator for the Asset Review pipeline.

Generates:
  A. 9 genuinely-missing UI icons (Pixflux 64×64)
  B. Math-throw digits 0–9 (Bitforge 128×128, style-anchored to digit 0)
  C. Math-throw operators +, −, ×, ÷, = (Bitforge 128×128)
  D. Math-throw themed tokens (Bitforge 128×128)
  E. Character animation sheets (animate-with-text, then upscale to 128)

Run in order — each phase can be invoked independently:
  python3 scripts/generate_batch.py icons
  python3 scripts/generate_batch.py digits
  python3 scripts/generate_batch.py operators
  python3 scripts/generate_batch.py tokens
  python3 scripts/generate_batch.py animations_test
  python3 scripts/generate_batch.py animations_full
  python3 scripts/generate_batch.py all         # runs A→D, skips anims unless specified

All outputs land under public/assets/generated/new/{phase}/ — isolated
from existing assets so the Asset Review panel can show them as candidates.
"""
import base64
import io
import json
import os
import sys
import time
import urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
NEW_ROOT = ROOT / "public/assets/generated/new"
PIXFLUX_URL = "https://api.pixellab.ai/v1/generate-image-pixflux"
BITFORGE_URL = "https://api.pixellab.ai/v1/generate-image-bitforge"
ANIMATE_TEXT_URL = "https://api.pixellab.ai/v1/animate-with-text"

# ---------- API key ----------

def load_api_key():
    env_path = ROOT / ".env"
    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        if k.strip() == "VITE_PIXELLAB_API_KEY":
            return v.strip().strip('"').strip("'")
    raise RuntimeError("VITE_PIXELLAB_API_KEY not found in .env")

API_KEY = load_api_key()


def post_json(url, payload, timeout=240):
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def png_to_b64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def b64_to_img(b64: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGBA")


def save(img: Image.Image, out: Path):
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)


def log(msg):
    print(f"[gen] {msg}", flush=True)


# ---------- Generators ----------

def gen_pixflux(description: str, w: int, h: int, no_bg=True, **extra) -> Image.Image:
    payload = {
        "description": description,
        "image_size": {"width": w, "height": h},
        "no_background": no_bg,
        "text_guidance_scale": 8.0,
        "outline": "single color black outline",
        "shading": "basic shading",
        "detail": "medium detail",
        **extra,
    }
    r = post_json(PIXFLUX_URL, payload)
    return b64_to_img(r["image"]["base64"])


def gen_bitforge(description: str, w: int, h: int,
                 style_image: Image.Image | None = None,
                 style_strength: float = 40.0,
                 no_bg=True, **extra) -> Image.Image:
    payload = {
        "description": description,
        "image_size": {"width": w, "height": h},
        "no_background": no_bg,
        "text_guidance_scale": 8.0,
        "outline": "single color black outline",
        "shading": "basic shading",
        "detail": "medium detail",
        **extra,
    }
    if style_image is not None:
        payload["style_image"] = {"type": "base64", "base64": png_to_b64(style_image)}
        payload["style_strength"] = style_strength
    r = post_json(BITFORGE_URL, payload)
    return b64_to_img(r["image"]["base64"])


def gen_animation(ref_image: Image.Image, action: str, description: str,
                  n_frames: int = 6, direction: str = "south",
                  view: str = "low top-down") -> list[Image.Image]:
    # animate-with-text requires reference_image to match image_size (64×64).
    ref64 = ref_image.resize((64, 64), Image.Resampling.NEAREST) if ref_image.size != (64, 64) else ref_image
    payload = {
        "image_size": {"width": 64, "height": 64},
        "description": description,
        "action": action,
        "reference_image": {"type": "base64", "base64": png_to_b64(ref64)},
        "n_frames": n_frames,
        "direction": direction,
        "view": view,
        "text_guidance_scale": 8.0,
        "image_guidance_scale": 1.8,
    }
    r = post_json(ANIMATE_TEXT_URL, payload, timeout=480)
    return [b64_to_img(img["base64"]) for img in r["images"]]


def nearest_upscale(img: Image.Image, factor: int) -> Image.Image:
    return img.resize((img.width * factor, img.height * factor), Image.Resampling.NEAREST)


def stitch_row(frames: list[Image.Image]) -> Image.Image:
    if not frames: raise ValueError("no frames")
    w = frames[0].width
    h = frames[0].height
    sheet = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.paste(f, (i * w, 0), f)
    return sheet


# ---------- Phases ----------

MANIFEST: list[dict] = []  # accumulates records for downstream asset-list generation


def phase_icons():
    log("PHASE A — missing UI icons (Pixflux 128×128)")
    out_dir = NEW_ROOT / "icons"
    items = [
        ("battle_icon", "pixel art golden crossed swords forming X, glowing steel blades with hilts, battle icon, transparent background, game UI"),
        ("icon_happiness", "pixel art bright pink glossy heart with happy smiley face on it, cheerful cute happiness icon, transparent background, game UI"),
        ("icon_math_generic", "pixel art golden plus sign overlapping equals sign, math badge icon, transparent background, game UI"),
        ("item_ball", "pixel art red rubber bouncy ball with white stripe, playful pet toy, transparent background, game item"),
        ("math_icon", "pixel art calculator with glowing plus symbol, math tool badge, transparent background, game UI icon"),
        ("momentum_icon", "pixel art golden forward-pointing arrow with bold motion streaks, speed and momentum icon, transparent background, game UI"),
        ("nav_icon", "pixel art golden compass with red N north needle, navigation icon, transparent background, game UI"),
        ("pet_care_icon", "pixel art golden paw print with small pink heart inside the main pad, pet care icon, transparent background, game UI"),
        ("trace_icon", "pixel art magical pencil drawing a glowing curve rune line, trace icon, transparent background, game UI"),
    ]
    for name, prompt in items:
        out = out_dir / f"{name}.png"
        entry = {"id": name, "path": f"/assets/generated/new/icons/{name}.png",
                 "group": "Missing UI Icons", "category": "icon",
                 "width": 128, "height": 128, "prompt": prompt}
        if out.exists():
            log(f"  skip {name} (exists)")
            MANIFEST.append(entry)
            continue
        try:
            img = gen_pixflux(prompt, 128, 128)
            save(img, out)
            MANIFEST.append(entry)
            log(f"  ✅ {name}")
        except Exception as e:
            log(f"  ❌ {name}: {e}")


def phase_digits():
    log("PHASE B — math-throw digits 0-9 (Pixflux 128×128)")
    out_dir = NEW_ROOT / "math-throw/digits"
    # Each digit gets a very specific prompt so Pixflux produces a clean,
    # readable numeral. Stable seed keeps the set visually coherent.
    digit_prompts = {
        "0": "huge chunky pixel art numeral 0, bright golden yellow with thick dark navy outline, magical glow halo, rune token style, transparent background, centered",
        "1": "huge chunky pixel art numeral 1, bright golden yellow with thick dark navy outline, magical glow halo, rune token style, transparent background, centered",
        "2": "huge chunky pixel art numeral 2, bright golden yellow with thick dark navy outline, magical glow halo, rune token style, transparent background, centered",
        "3": "huge chunky pixel art numeral 3, bright golden yellow with thick dark navy outline, magical glow halo, rune token style, transparent background, centered",
        "4": "huge chunky pixel art numeral 4, bright golden yellow with thick dark navy outline, magical glow halo, rune token style, transparent background, centered",
        "5": "huge chunky pixel art numeral 5, bright golden yellow with thick dark navy outline, magical glow halo, rune token style, transparent background, centered",
        "6": "huge chunky pixel art numeral 6, bright golden yellow with thick dark navy outline, magical glow halo, rune token style, transparent background, centered",
        "7": "huge chunky pixel art numeral 7, bright golden yellow with thick dark navy outline, magical glow halo, rune token style, transparent background, centered",
        "8": "huge chunky pixel art numeral 8, bright golden yellow with thick dark navy outline, magical glow halo, rune token style, transparent background, centered",
        "9": "huge chunky pixel art numeral 9, bright golden yellow with thick dark navy outline, magical glow halo, rune token style, transparent background, centered",
    }
    for d_str, prompt in digit_prompts.items():
        out = out_dir / f"{d_str}.png"
        entry = {"id": f"math_digit_{d_str}", "path": f"/assets/generated/new/math-throw/digits/{d_str}.png",
                 "group": "Math Throw — Digits", "category": "math",
                 "width": 128, "height": 128, "state": "digit", "prompt": prompt}
        if out.exists(): log(f"  skip {d_str} (exists)"); MANIFEST.append(entry); continue
        try:
            img = gen_pixflux(prompt, 128, 128, seed=10000 + int(d_str))
            save(img, out)
            MANIFEST.append(entry)
            log(f"  ✅ digit {d_str}")
        except Exception as e:
            log(f"  ❌ digit {d_str}: {e}")


def phase_operators():
    log("PHASE C — math operators (Pixflux 128×128)")
    out_dir = NEW_ROOT / "math-throw/operators"
    ops = [
        ("plus",    "huge chunky pixel art plus symbol +, bright golden yellow thick bars with dark navy outline, magical glow, rune token, transparent background, centered"),
        ("minus",   "huge chunky pixel art minus symbol -, bright golden yellow thick horizontal bar with dark navy outline, magical glow, rune token, transparent background, centered"),
        ("times",   "huge chunky pixel art multiplication symbol x, bright golden yellow thick bars forming a cross, dark navy outline, magical glow, rune token, transparent background, centered"),
        ("divide",  "huge chunky pixel art division symbol, bright golden yellow horizontal bar with a round dot above and a round dot below, dark navy outline, magical glow, rune token, transparent background, centered"),
        ("equals",  "huge chunky pixel art equals symbol =, bright golden yellow two stacked horizontal bars with dark navy outline, magical glow, rune token, transparent background, centered"),
    ]
    for name, prompt in ops:
        out = out_dir / f"{name}.png"
        entry = {"id": f"math_op_{name}", "path": f"/assets/generated/new/math-throw/operators/{name}.png",
                 "group": "Math Throw — Operators", "category": "math",
                 "width": 128, "height": 128, "state": "operator", "prompt": prompt}
        if out.exists(): log(f"  skip {name} (exists)"); MANIFEST.append(entry); continue
        try:
            img = gen_pixflux(prompt, 128, 128, seed=20000 + hash(name) % 9000)
            save(img, out)
            MANIFEST.append(entry)
            log(f"  ✅ op {name}")
        except Exception as e:
            log(f"  ❌ op {name}: {e}")


def phase_tokens():
    log("PHASE D — themed throw tokens (Pixflux 128×128)")
    out_dir = NEW_ROOT / "math-throw/tokens"
    tokens = [
        ("token_basic",   "pixel art glowing golden magical orb, round bright yellow sphere with soft halo and runic border ring, transparent background, game throw item"),
        ("token_fire",    "pixel art flaming red magical orb, red-orange sphere wreathed in flickering fire with ember sparks, transparent background, game throw item"),
        ("token_ice",     "pixel art icy cyan magical orb, pale blue crystalline sphere surrounded by small frost crystals, transparent background, game throw item"),
        ("token_arcane",  "pixel art violet arcane magical orb, deep purple sphere with tiny stars swirling inside, transparent background, game throw item"),
        ("token_rainbow", "pixel art rainbow shimmering magical orb, iridescent multicolor sphere with sparkle trail, rare legendary appearance, transparent background, game throw item"),
    ]
    for name, prompt in tokens:
        out = out_dir / f"{name}.png"
        entry = {"id": f"math_{name}", "path": f"/assets/generated/new/math-throw/tokens/{name}.png",
                 "group": "Math Throw — Tokens", "category": "math",
                 "width": 128, "height": 128, "state": "token", "prompt": prompt}
        if out.exists(): log(f"  skip {name} (exists)"); MANIFEST.append(entry); continue
        try:
            img = gen_pixflux(prompt, 128, 128, seed=30000 + hash(name) % 9000)
            save(img, out)
            MANIFEST.append(entry)
            log(f"  ✅ {name}")
        except Exception as e:
            log(f"  ❌ {name}: {e}")


def animation_for(char_name: str, ref_path: Path, action: str, direction: str, n_frames: int = 6, desc_action: str | None = None):
    out_dir = NEW_ROOT / f"animations/{char_name}"
    out = out_dir / f"{action}-{direction}-sheet.png"
    if out.exists():
        log(f"    skip {char_name}/{direction}/{action} (exists)")
        try:
            existing = Image.open(out)
            MANIFEST.append({
                "id": f"{char_name}_{action}_{direction}",
                "path": f"/assets/generated/new/animations/{char_name}/{action}-{direction}-sheet.png",
                "group": f"{char_name} — v3 Animations",
                "category": "pet_direction", "direction": direction, "state": action,
                "width": existing.width, "height": existing.height,
                "prompt": f"{char_name} {action} {direction}, animate-with-text 64px → 2x nearest upscale",
            })
        except Exception:
            pass
        return
    ref = Image.open(ref_path).convert("RGBA")
    # The animate-with-text endpoint outputs fixed 64x64 frames.
    # We upscale 2x via nearest-neighbor for a sheet at 128x128 per frame.
    try:
        frames = gen_animation(ref, action=action, description=desc_action or action,
                               n_frames=n_frames, direction=direction)
        frames128 = [nearest_upscale(f, 2) for f in frames]
        sheet = stitch_row(frames128)
        save(sheet, out)
        MANIFEST.append({
            "id": f"{char_name}_{action}_{direction}",
            "path": f"/assets/generated/new/animations/{char_name}/{action}-{direction}-sheet.png",
            "group": f"{char_name} — v3 Animations",
            "category": "pet_direction", "direction": direction, "state": action,
            "width": sheet.width, "height": sheet.height,
            "prompt": f"{char_name} {action} {direction}, animate-with-text 64px → 2x nearest upscale",
        })
        log(f"    ✅ {char_name}/{action}/{direction} ({len(frames)} frames)")
    except Exception as e:
        log(f"    ❌ {char_name}/{action}/{direction}: {e}")


def phase_animations_test():
    log("PHASE E-test — one koala walk cycle (south, 6 frames)")
    koala_ref = ROOT / "public/assets/pets/blue-koala/directions/v3/south.png"
    animation_for("blue-koala", koala_ref, "walk", "south",
                  desc_action="chibi baby koala walking in place with small steps")


def phase_animations_full():
    """Generate animations only for actions that animate-with-text handles
    well (expressive static poses over a short cycle). Skip ones that
    consistently drift or produce subtle motion only."""
    log("PHASE F — curated character animation set (south only)")
    koala_ref = ROOT / "public/assets/pets/blue-koala/directions/v3/south.png"
    subtrak_ref = ROOT / "public/assets/pets/subtrak/directions/v3/south.png"
    # (action, description for the model, n_frames)
    # Endpoint currently returns ~4 frames regardless — request 4.
    actions = [
        ("happy",   "character cheerful bounce with arms raised high in joy",     4),
        ("sleep",   "character sleeping peacefully with closed eyes and Z bubble", 4),
        ("hurt",    "character recoiling from a hit, brief knockback",             4),
        ("love",    "character overjoyed with hearts appearing around head",        4),
        ("dizzy",   "character wobbling with spinning stars around head",           4),
        ("sad",     "character looking down with tears, drooping ears",            4),
        ("sparkle", "character shining with magical aura around body",             4),
    ]
    for action, desc, n in actions:
        animation_for("blue-koala", koala_ref,  action, "south", n_frames=n, desc_action=desc)
        animation_for("subtrak",    subtrak_ref, action, "south", n_frames=n, desc_action=desc)


# ---------- CLI ----------

def dump_manifest():
    if not MANIFEST:
        return
    out = NEW_ROOT / "_manifest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(MANIFEST, indent=2))
    log(f"📝 wrote {out.relative_to(ROOT)} ({len(MANIFEST)} entries)")


def main():
    phases = sys.argv[1:] or ["icons", "digits", "operators", "tokens"]
    handlers = {
        "icons": phase_icons,
        "digits": phase_digits,
        "operators": phase_operators,
        "tokens": phase_tokens,
        "animations_test": phase_animations_test,
        "animations_full": phase_animations_full,
        "all": lambda: (phase_icons(), phase_digits(), phase_operators(), phase_tokens()),
    }
    for p in phases:
        h = handlers.get(p)
        if not h:
            log(f"unknown phase '{p}' — options: {list(handlers)}")
            continue
        h()
    dump_manifest()
    log("DONE")


if __name__ == "__main__":
    main()
