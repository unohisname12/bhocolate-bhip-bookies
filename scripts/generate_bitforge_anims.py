#!/usr/bin/env python3
"""
Higher-quality character animations via repeated /generate-image-bitforge.

Rationale: /animate-with-text is capped at 64×64 and drifts character identity.
/animate-with-skeleton renders at 128×128 but soft-edges and loses motion.

This approach uses Bitforge per-frame with:
  - init_image    = v3 sprite (keeps character body)
  - style_image   = v3 sprite (keeps palette/outline)
  - description   = target pose for THIS frame
  - 128×128 native, no upscale

Each action defines 3-4 pose prompts. One API call per frame. Expensive-ish
but yields native 128×128 pixel art that stays on-model.

Run:
  python3 scripts/generate_bitforge_anims.py happy_test
  python3 scripts/generate_bitforge_anims.py all
"""
import base64
import io
import json
import sys
import urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_ROOT = ROOT / "public/assets/generated/new/animations_v3"
BITFORGE_URL = "https://api.pixellab.ai/v1/generate-image-bitforge"


def load_api_key():
    env_path = ROOT / ".env"
    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line: continue
        k, v = line.split("=", 1)
        if k.strip() == "VITE_PIXELLAB_API_KEY":
            return v.strip().strip('"').strip("'")
    raise RuntimeError("no API key")

API_KEY = load_api_key()


def post_json(url, payload, timeout=240):
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()[:500]}")


def png_to_b64(img: Image.Image) -> str:
    buf = io.BytesIO(); img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def b64_to_img(b64: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGBA")


def stitch(frames: list[Image.Image]) -> Image.Image:
    w = frames[0].width; h = frames[0].height
    sheet = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.paste(f, (i * w, 0), f)
    return sheet


def gen_frame(ref_image: Image.Image, description: str,
              init_strength: int = 600) -> Image.Image:
    """Generate one frame at 128×128 anchored to the reference sprite."""
    b64 = png_to_b64(ref_image)
    payload = {
        "description": description,
        "image_size": {"width": 128, "height": 128},
        "init_image": {"type": "base64", "base64": b64},
        "init_image_strength": init_strength,
        "style_image": {"type": "base64", "base64": b64},
        "style_strength": 70.0,
        "text_guidance_scale": 9.0,
        "no_background": True,
        "outline": "single color black outline",
        "shading": "basic shading",
    }
    r = post_json(BITFORGE_URL, payload, timeout=180)
    return b64_to_img(r["image"]["base64"])


# ---------- Pose prompt sets ----------
# Each action: list of descriptive pose prompts (one per frame).
# Keep character description consistent; vary only the pose.

KOALA_BASE = ("chibi baby koala, pastel blue fur, cream white belly, "
              "dark triangular nose, round dot eyes, big round fluffy ears, "
              "clean dark outline, pixel art")
SUBTRAK_BASE = ("chibi teal humanoid creature, pointy cat ears, fierce red eyes, "
                "red rectangular chest gem, clean dark outline, pixel art")


def poses_happy(base):
    return [
        f"{base}, standing facing camera, arms relaxed at sides",
        f"{base}, arms raised halfway up, small hop bounce, happy smile",
        f"{base}, both arms raised high overhead in celebration, big joyful smile, mid-air",
    ]


def poses_sleep(base):
    return [
        f"{base}, standing facing camera, eyes half closed, sleepy",
        f"{base}, eyes fully closed, head tilted down slightly, peaceful sleep pose, small Z above head",
        f"{base}, eyes fully closed, head tilted down, ZZZ bubble above head, peaceful sleeping",
    ]


def poses_love(base):
    return [
        f"{base}, standing facing camera, gentle smile",
        f"{base}, both paws clasped together in front of chest, soft loving smile",
        f"{base}, both paws held near face, heart-eyed loving expression, small red hearts around head",
    ]


def poses_dizzy(base):
    return [
        f"{base}, standing facing camera, slightly tilted, confused expression",
        f"{base}, head wobbling left, swirly eyes, small spinning stars around head",
        f"{base}, head wobbling right, swirly eyes, small spinning stars around head",
    ]


def poses_sad(base):
    return [
        f"{base}, standing facing camera, ears drooping slightly",
        f"{base}, head bowed down, ears fully drooping, small tear on cheek",
        f"{base}, head bowed very low, ears drooping, single teardrop falling",
    ]


def poses_sparkle(base):
    return [
        f"{base}, standing facing camera, arms slightly out to sides",
        f"{base}, arms raised wide in triumph, small glowing sparkles around body",
        f"{base}, arms raised high, many glowing sparkles and stars around body, triumphant",
    ]


def poses_hurt(base):
    return [
        f"{base}, standing facing camera neutral",
        f"{base}, body leaning back from impact, head snapped back, pained expression, small red stars around",
        f"{base}, recovering from hit, slightly crouched, wincing expression",
    ]


def poses_walk(base):
    return [
        f"{base}, standing facing camera, right paw slightly forward",
        f"{base}, mid-step facing camera, left paw forward, small bob",
        f"{base}, mid-step facing camera, right paw forward, small bob",
    ]


ACTION_PROMPTS = {
    "happy": poses_happy, "sleep": poses_sleep, "love": poses_love,
    "dizzy": poses_dizzy, "sad": poses_sad, "sparkle": poses_sparkle,
    "hurt": poses_hurt, "walk": poses_walk,
}


# ---------- Runners ----------

def run_one(character_key: str, base_desc: str, ref_path: Path, action: str):
    ref = Image.open(ref_path).convert("RGBA")
    if ref.size != (128, 128):
        ref = ref.resize((128, 128), Image.Resampling.NEAREST)
    prompts = ACTION_PROMPTS[action](base_desc)
    frames = []
    for i, p in enumerate(prompts):
        try:
            fr = gen_frame(ref, p, init_strength=600)
            frames.append(fr)
            print(f"    ✅ frame {i+1}/{len(prompts)}")
        except Exception as e:
            print(f"    ❌ frame {i+1}: {e}")
            return
    sheet = stitch(frames)
    out = OUT_ROOT / character_key / f"{action}-south-sheet.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"  ✅ {character_key}/{action} → {len(frames)} frames @ 128×128")


def main():
    koala_ref = ROOT / "public/assets/pets/blue-koala/directions/v3/south.png"
    subtrak_ref = ROOT / "public/assets/pets/subtrak/directions/v3/south.png"
    arg = sys.argv[1] if len(sys.argv) > 1 else "happy_test"

    if arg == "happy_test":
        print("TEST — koala happy via Bitforge init+style")
        run_one("blue-koala", KOALA_BASE, koala_ref, "happy")
    elif arg == "all":
        print("FULL — all actions × both chars via Bitforge init+style")
        for action in ACTION_PROMPTS:
            print(f"[{action}]")
            run_one("blue-koala", KOALA_BASE, koala_ref, action)
            run_one("subtrak", SUBTRAK_BASE, subtrak_ref, action)
    elif arg in ACTION_PROMPTS:
        print(f"ACTION — {arg} × both chars")
        run_one("blue-koala", KOALA_BASE, koala_ref, arg)
        run_one("subtrak", SUBTRAK_BASE, subtrak_ref, arg)
    else:
        print(f"unknown arg {arg!r}; options: happy_test, all, {list(ACTION_PROMPTS)}")
    print("DONE")


if __name__ == "__main__":
    main()
