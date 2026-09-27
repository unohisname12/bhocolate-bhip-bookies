#!/usr/bin/env python3
"""
Higher-quality character animations via PixelLab `/animate-with-skeleton`.

This endpoint accepts a reference image (our v3 sprite) and a per-frame
skeleton keypoint pose. It outputs native-resolution frames (up to 256×256),
so we can stay at the game's native 128×128 grid without any nearest-upscale.

Defines a base chibi skeleton for our characters and a few parametric
action poses (happy bounce, sleep breathe, love, dizzy wobble, sad, sparkle,
hurt). Each action produces N frames of keypoints; the endpoint does the
rest.

Run:
  python3 scripts/generate_skeleton_anims.py happy_test
  python3 scripts/generate_skeleton_anims.py all
"""
import base64
import io
import json
import math
import os
import sys
import urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
NEW_ROOT = ROOT / "public/assets/generated/new/animations_v2"
ANIM_SKEL_URL = "https://api.pixellab.ai/v1/animate-with-skeleton"

# ---------- API key ----------

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


def post_json(url, payload, timeout=480):
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


# ---------- Base chibi skeleton at 128×128 ----------
#
# Character fits in a ~60-pixel box centered vertically around y=60-110,
# x=44-84. These coordinates are the NEUTRAL POSE; actions transform them.

def pt(x, y, label, z=0):
    return {"x": x, "y": y, "label": label, "z_index": z}


def base_pose_128():
    return [
        pt(64, 46, "NOSE"),
        pt(58, 40, "LEFT EYE"), pt(70, 40, "RIGHT EYE"),
        pt(48, 34, "LEFT EAR"), pt(80, 34, "RIGHT EAR"),
        pt(64, 60, "NECK"),
        pt(54, 64, "LEFT SHOULDER"), pt(74, 64, "RIGHT SHOULDER"),
        pt(46, 74, "LEFT ELBOW"),    pt(82, 74, "RIGHT ELBOW"),
        pt(42, 84, "LEFT ARM"),      pt(86, 84, "RIGHT ARM"),
        pt(58, 88, "LEFT HIP"),      pt(70, 88, "RIGHT HIP"),
        pt(56, 100, "LEFT KNEE"),    pt(72, 100, "RIGHT KNEE"),
        pt(54, 112, "LEFT LEG"),     pt(74, 112, "RIGHT LEG"),
    ]


def lookup(pose, label):
    for p in pose:
        if p["label"] == label: return p
    return None


def transform(pose, label, dx=0, dy=0):
    out = [dict(p) for p in pose]
    for p in out:
        if p["label"] == label:
            p["x"] += dx; p["y"] += dy
    return out


def shift_all(pose, dx=0, dy=0):
    return [{**p, "x": p["x"] + dx, "y": p["y"] + dy} for p in pose]


# ---------- Action frame builders ----------

def action_happy(n=3):
    """Bouncy joy: neutral, slight raise, mid-jump with arms out."""
    frames = []
    # 0 — neutral
    frames.append(base_pose_128())
    # 1 — arms slightly raised, body up 2px
    f1 = shift_all(base_pose_128(), 0, -2)
    for lab, dx, dy in [("LEFT ELBOW", -2, -4), ("RIGHT ELBOW", 2, -4),
                        ("LEFT ARM", -3, -8), ("RIGHT ARM", 3, -8)]:
        f1 = transform(f1, lab, dx, dy)
    frames.append(f1)
    # 2 — peak bounce, arms wider and higher
    f2 = shift_all(base_pose_128(), 0, -4)
    for lab, dx, dy in [("LEFT SHOULDER", -1, -2), ("RIGHT SHOULDER", 1, -2),
                        ("LEFT ELBOW", -4, -8), ("RIGHT ELBOW", 4, -8),
                        ("LEFT ARM", -6, -14), ("RIGHT ARM", 6, -14)]:
        f2 = transform(f2, lab, dx, dy)
    frames.append(f2)
    return frames[:n]


def action_sleep(n=4):
    """Subtle breathing — head tilts down, slow chest rise/fall via shoulders."""
    b = base_pose_128()
    frames = []
    for i in range(n):
        t = (i / n) * 2 * math.pi
        breath = math.sin(t) * 1.5
        head_tilt = 2
        f = base_pose_128()
        f = transform(f, "NOSE", 0, 2 + head_tilt)
        f = transform(f, "LEFT EYE", 0, 2 + head_tilt)
        f = transform(f, "RIGHT EYE", 0, 2 + head_tilt)
        for lab in ["LEFT SHOULDER", "RIGHT SHOULDER", "NECK"]:
            f = transform(f, lab, 0, -breath)
        frames.append(f)
    return frames


def action_love(n=3):
    """Soft swoon — arms raised inward like holding chest, head tilt."""
    frames = []
    poses = [
        # 0 — neutral
        {},
        # 1 — arms inward, elbows bent
        {"LEFT ARM": (6, -8), "RIGHT ARM": (-6, -8),
         "LEFT ELBOW": (4, -4), "RIGHT ELBOW": (-4, -4),
         "NOSE": (0, 1), "LEFT EYE": (0, 1), "RIGHT EYE": (0, 1)},
        # 2 — arms at chest, softly closed
        {"LEFT ARM": (10, -10), "RIGHT ARM": (-10, -10),
         "LEFT ELBOW": (6, -6), "RIGHT ELBOW": (-6, -6)},
    ]
    for pose in poses:
        f = base_pose_128()
        for lab, (dx, dy) in pose.items():
            f = transform(f, lab, dx, dy)
        frames.append(f)
    return frames[:n]


def action_dizzy(n=4):
    """Head wobbles side to side, body sways."""
    b = base_pose_128()
    frames = []
    for i in range(n):
        t = (i / n) * 2 * math.pi
        sway = math.sin(t) * 6
        head_sway = math.sin(t) * 4
        f = base_pose_128()
        f = shift_all(f, sway, 0)
        # Head offset additional
        for lab in ["NOSE", "LEFT EYE", "RIGHT EYE", "LEFT EAR", "RIGHT EAR"]:
            f = transform(f, lab, head_sway, 0)
        frames.append(f)
    return frames


def action_sad(n=4):
    """Head bowed, shoulders slumped, arms limp, subtle sniffle."""
    b = base_pose_128()
    frames = []
    base_mod = {
        "NOSE": (0, 4), "LEFT EYE": (0, 4), "RIGHT EYE": (0, 4),
        "LEFT EAR": (-1, 2), "RIGHT EAR": (1, 2),
        "NECK": (0, 2),
        "LEFT SHOULDER": (0, 2), "RIGHT SHOULDER": (0, 2),
    }
    for i in range(n):
        t = (i / n) * 2 * math.pi
        sniff = math.sin(t) * 1.5
        f = base_pose_128()
        for lab, (dx, dy) in base_mod.items():
            f = transform(f, lab, dx, dy + sniff)
        frames.append(f)
    return frames


def action_sparkle(n=3):
    """Triumphant pose — arms raised wide, subtle breathing bob."""
    frames = []
    for i in range(n):
        bob = -((i % 2))
        f = shift_all(base_pose_128(), 0, bob)
        for lab, dx, dy in [
            ("LEFT SHOULDER", -1, -1), ("RIGHT SHOULDER", 1, -1),
            ("LEFT ELBOW", -4, -6),    ("RIGHT ELBOW", 4, -6),
            ("LEFT ARM", -6, -12),     ("RIGHT ARM", 6, -12),
        ]:
            f = transform(f, lab, dx, dy)
        frames.append(f)
    return frames


def action_hurt(n=3):
    """Recoil: brief knockback then recovery."""
    frames = []
    # 0 — neutral
    frames.append(base_pose_128())
    # 1 — hit: body leans back, head snaps
    f1 = shift_all(base_pose_128(), -3, 1)
    for lab in ["NOSE", "LEFT EYE", "RIGHT EYE", "NECK"]:
        f1 = transform(f1, lab, -2, -2)
    frames.append(f1)
    # 2 — recovering but still tilted
    f2 = shift_all(base_pose_128(), -1, 0)
    frames.append(f2)
    return frames[:n]


def action_walk(n=4):
    """Walk cycle — alternating legs + counter-swinging arms."""
    b = base_pose_128()
    frames = []
    for i in range(n):
        t = (i / n) * 2 * math.pi
        # Legs swing opposite
        left_leg_dx = math.sin(t) * 3
        right_leg_dx = -math.sin(t) * 3
        # Arms counter-swing (opposite leg)
        left_arm_dx = -math.sin(t) * 4
        right_arm_dx = math.sin(t) * 4
        # Head bob
        body_dy = -abs(math.sin(t)) * 1.5
        f = shift_all(base_pose_128(), 0, body_dy)
        f = transform(f, "LEFT LEG", left_leg_dx, 0)
        f = transform(f, "LEFT KNEE", left_leg_dx * 0.5, 0)
        f = transform(f, "RIGHT LEG", right_leg_dx, 0)
        f = transform(f, "RIGHT KNEE", right_leg_dx * 0.5, 0)
        f = transform(f, "LEFT ARM", left_arm_dx, 0)
        f = transform(f, "LEFT ELBOW", left_arm_dx * 0.5, 0)
        f = transform(f, "RIGHT ARM", right_arm_dx, 0)
        f = transform(f, "RIGHT ELBOW", right_arm_dx * 0.5, 0)
        frames.append(f)
    return frames


ACTIONS = {
    "happy": action_happy,
    "sleep": action_sleep,
    "love":  action_love,
    "dizzy": action_dizzy,
    "sad":   action_sad,
    "sparkle": action_sparkle,
    "hurt":  action_hurt,
    "walk":  action_walk,
}


# ---------- Generation ----------

def animate(ref_image: Image.Image, frames_keypoints: list, size=128, guidance=5.0):
    # Ensure reference matches image_size
    if ref_image.size != (size, size):
        ref = ref_image.resize((size, size), Image.Resampling.NEAREST)
    else:
        ref = ref_image
    payload = {
        "image_size": {"width": size, "height": size},
        "reference_image": {"type": "base64", "base64": png_to_b64(ref)},
        "skeleton_keypoints": frames_keypoints,
        "guidance_scale": guidance,
        "view": "low top-down",
        "direction": "south",
    }
    r = post_json(ANIM_SKEL_URL, payload)
    return [b64_to_img(img["base64"]) for img in r["images"]]


def stitch(frames: list[Image.Image]) -> Image.Image:
    if not frames: raise ValueError("no frames")
    w = frames[0].width; h = frames[0].height
    sheet = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.paste(f, (i * w, 0), f)
    return sheet


N_FRAMES = 3  # /animate-with-skeleton is hard-coded to 3 poses per call

def run_one(character: str, ref_path: Path, action: str, out_root: Path = None):
    out_root = out_root or NEW_ROOT
    out = out_root / character / f"{action}-south-sheet.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    ref = Image.open(ref_path).convert("RGBA")
    fn = ACTIONS[action]
    keypoints = fn(n=N_FRAMES)
    try:
        frames = animate(ref, keypoints, size=128)
        sheet = stitch(frames)
        sheet.save(out)
        print(f"  ✅ {character}/{action} — {len(frames)} frames @ 128×128")
    except Exception as e:
        print(f"  ❌ {character}/{action}: {e}")


def main():
    koala_ref = ROOT / "public/assets/pets/blue-koala/directions/v3/south.png"
    subtrak_ref = ROOT / "public/assets/pets/subtrak/directions/v3/south.png"

    arg = sys.argv[1] if len(sys.argv) > 1 else "happy_test"
    if arg == "happy_test":
        print("TEST — koala happy at 128×128 via skeleton")
        run_one("blue-koala", koala_ref, "happy")
    elif arg == "all":
        print("FULL — all actions × both characters at 128×128")
        for action in ACTIONS:
            run_one("blue-koala", koala_ref, action)
            run_one("subtrak",    subtrak_ref, action)
    elif arg in ACTIONS:
        print(f"ACTION — {arg} × both characters at 128×128")
        run_one("blue-koala", koala_ref, arg)
        run_one("subtrak",    subtrak_ref, arg)
    else:
        print(f"unknown arg {arg!r}; options: happy_test, all, {list(ACTIONS)}")
    print("DONE")


if __name__ == "__main__":
    main()
