#!/usr/bin/env python3
"""
Generate directional sprites via PixelLab Bitforge /rotate endpoint.

Takes the existing front-view (south) sprite for each character, feeds it
to the API as `from_image`, and generates east/west/north views that match
the original art style exactly (image-to-image, not text-to-image).

Usage:
  python3 scripts/rotate_character.py

Env:
  VITE_PIXELLAB_API_KEY    — read from .env in repo root

Output:
  public/assets/pets/blue-koala/directions/v3/{direction}.png
  public/assets/pets/subtrak/directions/v3/{direction}.png
"""
import base64
import io
import json
import os
import sys
import urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
URL = "https://api.pixellab.ai/v1/rotate"
FRAME_W, FRAME_H = 128, 128
TARGET_DIRECTIONS = ["east", "west", "north"]  # south is the input


def load_api_key():
    env_path = ROOT / ".env"
    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        if k.strip() == "VITE_PIXELLAB_API_KEY":
            return v.strip().strip('"').strip("'")
    raise RuntimeError("VITE_PIXELLAB_API_KEY not found in .env")


def extract_first_frame(src_path: Path) -> Image.Image:
    img = Image.open(src_path).convert("RGBA")
    # Sprite sheets store frames in a horizontal row; frame 0 = (0,0,128,128)
    return img.crop((0, 0, FRAME_W, FRAME_H))


def png_to_b64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def rotate(api_key: str, from_img_b64: str, to_direction: str) -> Image.Image:
    payload = {
        "image_size": {"width": FRAME_W, "height": FRAME_H},
        "from_image": {"type": "base64", "base64": from_img_b64},
        "from_direction": "south",
        "to_direction": to_direction,
        "from_view": "low top-down",
        "to_view": "low top-down",
        "image_guidance_scale": 7.0,  # strong adherence to reference style
    }
    req = urllib.request.Request(
        URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        body = json.loads(resp.read())
    out_b64 = body["image"]["base64"]
    usd = body.get("usage", {}).get("usd", 0)
    print(f"    -> {to_direction} OK (${usd:.4f})")
    return Image.open(io.BytesIO(base64.b64decode(out_b64))).convert("RGBA")


def process(api_key: str, name: str, src_sheet: Path, out_dir: Path, src_south: Path | None = None):
    print(f"[{name}] extracting front frame from {src_sheet.name}")
    out_dir.mkdir(parents=True, exist_ok=True)
    front = extract_first_frame(src_sheet)
    # Save the south reference too, so v3 is a complete 4-direction set
    south_out = out_dir / "south.png"
    front.save(south_out)
    print(f"    -> south (copy of source frame) -> {south_out.name}")
    b64 = png_to_b64(front)
    for d in TARGET_DIRECTIONS:
        try:
            out_img = rotate(api_key, b64, d)
            out_img.save(out_dir / f"{d}.png")
        except Exception as e:
            print(f"    !! {d} FAILED: {e}", file=sys.stderr)


def main():
    api_key = load_api_key()
    pets_root = ROOT / "public/assets/pets"

    jobs = [
        (
            "blue-koala",
            pets_root / "blue-koala/mood/idle-sheet.png",
            pets_root / "blue-koala/directions/v3",
        ),
        (
            "subtrak",
            pets_root / "subtrak/idle/sheet.png",
            pets_root / "subtrak/directions/v3",
        ),
    ]
    for name, src, outdir in jobs:
        process(api_key, name, src, outdir)
    print("DONE")


if __name__ == "__main__":
    main()
