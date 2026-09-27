#!/usr/bin/env python3
"""
Quality-gated skeleton animation generator.

For each (character, action):
  - Try up to MAX_ATTEMPTS different parameter combos
  - Score each attempt (0.0-1.0) via pixel-level checks
  - Keep the best-scoring attempt; deliver if >= TARGET_SCORE
  - Save all attempts for audit

Outputs:
  public/assets/generated/new/animations_final/{char}/{action}-south-sheet.png
  public/assets/generated/new/animations_final/_audit/{char}_{action}_a{n}.png
  public/assets/generated/new/animations_final/_scores.json
"""
import base64
import io
import json
import math
import sys
import urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_ROOT = ROOT / "public/assets/generated/new/animations_final"
AUDIT_ROOT = OUT_ROOT / "_audit"
SCORES_FILE = OUT_ROOT / "_scores.json"
ANIM_SKEL_URL = "https://api.pixellab.ai/v1/animate-with-skeleton"

MAX_ATTEMPTS = 5
TARGET_SCORE = 0.95
N_FRAMES = 3  # endpoint is hard-coded to 3 keypoint frames


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


def post_json(url, payload, timeout=360):
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()[:400]}")


def png_to_b64(img: Image.Image) -> str:
    buf = io.BytesIO(); img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def b64_to_img(b64: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGBA")


def stitch(frames):
    w = frames[0].width; h = frames[0].height
    s = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames): s.paste(f, (i * w, 0), f)
    return s


# ---------- Skeleton poses ----------

def pt(x, y, label, z=0):
    return {"x": float(x), "y": float(y), "label": label, "z_index": z}

# Character-specific skeletons — measured from actual v3 reference bounding boxes.
# Koala: bbox y=31-88 (57px tall, chibi)
# Subtrak: bbox y=20-103 (83px tall, more humanoid)

def base_pose_koala():
    """Chibi koala — big head, tiny body. y range ~31-88."""
    return [
        pt(62, 42, "NOSE"),
        pt(58, 38, "LEFT EYE"), pt(66, 38, "RIGHT EYE"),
        pt(45, 33, "LEFT EAR"), pt(79, 33, "RIGHT EAR"),
        pt(62, 54, "NECK"),
        pt(54, 58, "LEFT SHOULDER"), pt(70, 58, "RIGHT SHOULDER"),
        pt(50, 66, "LEFT ELBOW"),    pt(74, 66, "RIGHT ELBOW"),
        pt(48, 74, "LEFT ARM"),      pt(76, 74, "RIGHT ARM"),
        pt(58, 72, "LEFT HIP"),      pt(66, 72, "RIGHT HIP"),
        pt(56, 80, "LEFT KNEE"),     pt(68, 80, "RIGHT KNEE"),
        pt(54, 87, "LEFT LEG"),      pt(70, 87, "RIGHT LEG"),
    ]

def base_pose_subtrak():
    """Taller humanoid Subtrak. y range ~20-103."""
    return [
        pt(63, 34, "NOSE"),
        pt(57, 30, "LEFT EYE"), pt(69, 30, "RIGHT EYE"),
        pt(45, 22, "LEFT EAR"), pt(81, 22, "RIGHT EAR"),
        pt(63, 50, "NECK"),
        pt(53, 56, "LEFT SHOULDER"), pt(73, 56, "RIGHT SHOULDER"),
        pt(47, 68, "LEFT ELBOW"),    pt(79, 68, "RIGHT ELBOW"),
        pt(45, 78, "LEFT ARM"),      pt(81, 78, "RIGHT ARM"),
        pt(57, 78, "LEFT HIP"),      pt(69, 78, "RIGHT HIP"),
        pt(55, 90, "LEFT KNEE"),     pt(71, 90, "RIGHT KNEE"),
        pt(54, 102, "LEFT LEG"),     pt(72, 102, "RIGHT LEG"),
    ]

CHARACTER_POSES = {
    "blue-koala": base_pose_koala,
    "subtrak":    base_pose_subtrak,
}

def base_pose():
    # Default for back-compat — use subtrak's since it worked generically
    return base_pose_subtrak()

def apply_deltas(pose, deltas):
    out = [dict(p) for p in pose]
    for p in out:
        d = deltas.get(p["label"])
        if d: p["x"] += d[0]; p["y"] += d[1]
    return out

def shift(pose, dx, dy):
    return [{**p, "x": p["x"] + dx, "y": p["y"] + dy} for p in pose]


# Pose profiles per action — scaled by `aggressiveness` (0.5..1.5).
# `base` is a character-specific base pose function.
def happy_frames(base, a=1.0):
    return [
        base(),
        shift(apply_deltas(base(), {
            "LEFT ELBOW": (-2*a, -4*a), "RIGHT ELBOW": (2*a, -4*a),
            "LEFT ARM": (-3*a, -6*a),   "RIGHT ARM": (3*a, -6*a),
        }), 0, -2*a),
        shift(apply_deltas(base(), {
            "LEFT SHOULDER": (-1*a, -2*a), "RIGHT SHOULDER": (1*a, -2*a),
            "LEFT ELBOW": (-3*a, -6*a),    "RIGHT ELBOW": (3*a, -6*a),
            "LEFT ARM": (-5*a, -10*a),     "RIGHT ARM": (5*a, -10*a),
        }), 0, -3*a),
    ]

def sparkle_frames(base, a=1.0):
    return [
        apply_deltas(base(), {
            "LEFT ELBOW": (-2*a, -2*a), "RIGHT ELBOW": (2*a, -2*a),
            "LEFT ARM": (-3*a, -3*a),   "RIGHT ARM": (3*a, -3*a),
        }),
        shift(apply_deltas(base(), {
            "LEFT SHOULDER": (-1*a, -1*a), "RIGHT SHOULDER": (1*a, -1*a),
            "LEFT ELBOW": (-3*a, -5*a),    "RIGHT ELBOW": (3*a, -5*a),
            "LEFT ARM": (-5*a, -10*a),     "RIGHT ARM": (5*a, -10*a),
        }), 0, -1),
        shift(apply_deltas(base(), {
            "LEFT SHOULDER": (-2*a, -2*a), "RIGHT SHOULDER": (2*a, -2*a),
            "LEFT ELBOW": (-4*a, -6*a),    "RIGHT ELBOW": (4*a, -6*a),
            "LEFT ARM": (-6*a, -12*a),     "RIGHT ARM": (6*a, -12*a),
        }), 0, -2),
    ]

def love_frames(base, a=1.0):
    return [
        base(),
        apply_deltas(base(), {
            "LEFT ARM": (5*a, -6*a),     "RIGHT ARM": (-5*a, -6*a),
            "LEFT ELBOW": (3*a, -3*a),   "RIGHT ELBOW": (-3*a, -3*a),
            "NOSE": (0, 1*a), "LEFT EYE": (0, 1*a), "RIGHT EYE": (0, 1*a),
        }),
        apply_deltas(base(), {
            "LEFT ARM": (8*a, -8*a),     "RIGHT ARM": (-8*a, -8*a),
            "LEFT ELBOW": (5*a, -5*a),   "RIGHT ELBOW": (-5*a, -5*a),
        }),
    ]

POSE_BUILDERS = {
    "happy": happy_frames,
    "sparkle": sparkle_frames,
    "love": love_frames,
}


# ---------- Generation ----------

def call_skeleton(ref_img, keypoints, guidance=4.0, init_strength=300, include_init=False):
    if ref_img.size != (128, 128):
        ref = ref_img.resize((128, 128), Image.Resampling.NEAREST)
    else:
        ref = ref_img
    b64 = png_to_b64(ref)
    payload = {
        "image_size": {"width": 128, "height": 128},
        "reference_image": {"type": "base64", "base64": b64},
        "skeleton_keypoints": keypoints,
        "guidance_scale": guidance,
        "view": "low top-down",
        "direction": "south",
    }
    if include_init:
        payload["init_images"] = [{"type": "base64", "base64": b64}] * N_FRAMES
        payload["init_image_strength"] = init_strength
    r = post_json(ANIM_SKEL_URL, payload)
    return [b64_to_img(img["base64"]) for img in r["images"]]


# ---------- Scoring ----------

def non_transparent_mask(img):
    """Returns boolean mask where alpha > 8 (visible pixel)."""
    a = img.split()[-1]
    return [[a.getpixel((x, y)) > 8 for x in range(img.width)] for y in range(img.height)]


def non_transparent_pct(img):
    pixels = img.width * img.height
    vis = sum(sum(row) for row in non_transparent_mask(img))
    return vis / pixels


def bbox_of_mask(mask):
    ys = [y for y in range(len(mask)) if any(mask[y])]
    if not ys: return None
    xs = [x for x in range(len(mask[0])) if any(mask[y][x] for y in ys)]
    return (min(xs), min(ys), max(xs), max(ys))


def edge_crispness(img):
    """Fraction of pixels with alpha either ~0 or ~255 (no soft anti-aliasing)."""
    a = img.split()[-1]
    data = list(a.getdata())
    crisp = sum(1 for v in data if v < 16 or v > 240)
    return crisp / len(data)


def color_similarity(img_a, img_b):
    """Histogram intersection over RGB bins of non-transparent pixels."""
    def hist(img):
        h = [0] * 64
        for x in range(img.width):
            for y in range(img.height):
                r, g, b, a = img.getpixel((x, y))
                if a < 32: continue
                bin_idx = (r // 64) * 16 + (g // 64) * 4 + (b // 64)
                h[bin_idx] += 1
        total = sum(h) or 1
        return [v / total for v in h]
    ha = hist(img_a); hb = hist(img_b)
    return sum(min(a, b) for a, b in zip(ha, hb))


def frame_difference(a, b):
    """Fraction of pixels that differ (any channel) between two same-size images."""
    da = list(a.getdata()); db = list(b.getdata())
    diff = sum(1 for p, q in zip(da, db) if p != q)
    return diff / len(da)


def bbox_size(bbox):
    if not bbox: return (0, 0)
    return (bbox[2] - bbox[0], bbox[3] - bbox[1])


def center_of_mass(mask):
    total = 0; sx = 0; sy = 0
    for y, row in enumerate(mask):
        for x, v in enumerate(row):
            if v: sx += x; sy += y; total += 1
    if total == 0: return None
    return (sx / total, sy / total)


def silhouette_iou(mask_a, mask_b):
    """Intersection over union for two binary masks of the same size."""
    inter = 0; union = 0
    for ra, rb in zip(mask_a, mask_b):
        for va, vb in zip(ra, rb):
            if va or vb: union += 1
            if va and vb: inter += 1
    return inter / union if union > 0 else 0


def score_sheet(frames, ref_img):
    """Return (total_score, per-frame dict, reasons list).

    Stricter than the first pass: require each frame's bounding box and
    center-of-mass to be close to the reference, and the silhouette to
    overlap the reference's by at least 55% (IoU). This catches
    "floating-head" failures that pass simple visibility thresholds."""
    reasons = []
    per_frame = []
    ref_mask = non_transparent_mask(ref_img)
    ref_bbox = bbox_of_mask(ref_mask)
    ref_size = bbox_size(ref_bbox)
    ref_com = center_of_mass(ref_mask)

    for i, fr in enumerate(frames):
        vis_pct = non_transparent_pct(fr)
        crisp = edge_crispness(fr)
        mask = non_transparent_mask(fr)
        bbox = bbox_of_mask(mask)
        size = bbox_size(bbox)
        com = center_of_mass(mask)
        color_sim = color_similarity(fr, ref_img)
        iou = silhouette_iou(mask, ref_mask)

        # Size-match against reference: allow ±25% per-axis
        size_w_ratio = size[0] / ref_size[0] if ref_size[0] else 0
        size_h_ratio = size[1] / ref_size[1] if ref_size[1] else 0
        size_ok = 0.75 <= size_w_ratio <= 1.3 and 0.75 <= size_h_ratio <= 1.3
        # Center-of-mass must be within 18px (out of 128) of ref
        com_dx = abs(com[0] - ref_com[0]) if com and ref_com else 99
        com_dy = abs(com[1] - ref_com[1]) if com and ref_com else 99
        com_ok = com_dx <= 18 and com_dy <= 18

        frame_info = {
            "vis_pct": vis_pct, "crisp": crisp,
            "color_sim": color_sim, "iou": iou, "bbox": bbox,
            "size_w_ratio": size_w_ratio, "size_h_ratio": size_h_ratio,
            "size_ok": size_ok, "com_ok": com_ok,
            "com_dx": com_dx, "com_dy": com_dy,
        }
        per_frame.append(frame_info)
        if vis_pct < 0.08:
            reasons.append(f"frame {i}: character too small (vis={vis_pct:.2%})")
        if not size_ok:
            reasons.append(f"frame {i}: size mismatch w={size_w_ratio:.2f} h={size_h_ratio:.2f}")
        if not com_ok:
            reasons.append(f"frame {i}: center drifted dx={com_dx:.0f} dy={com_dy:.0f}")
        if iou < 0.55:
            reasons.append(f"frame {i}: silhouette weak (IoU={iou:.2%})")
        if crisp < 0.75:
            reasons.append(f"frame {i}: soft edges (crisp={crisp:.2%})")
        if color_sim < 0.45:
            reasons.append(f"frame {i}: color drift (sim={color_sim:.2%})")

    # sequence diffs
    diffs = [frame_difference(frames[i], frames[i+1]) for i in range(len(frames)-1)]
    mean_diff = (sum(diffs) / len(diffs)) if diffs else 0
    if mean_diff < 0.02:
        reasons.append(f"frames too similar (mean diff={mean_diff:.2%})")
    if mean_diff > 0.45:
        reasons.append(f"frames too different (mean diff={mean_diff:.2%})")

    # component scores
    vis_score = min(1.0, sum(f["vis_pct"] for f in per_frame) / len(per_frame) / 0.15)
    crisp_score = sum(f["crisp"] for f in per_frame) / len(per_frame)
    color_score = min(1.0, sum(f["color_sim"] for f in per_frame) / len(per_frame) / 0.8)
    iou_score = sum(f["iou"] for f in per_frame) / len(per_frame) / 0.75
    iou_score = min(1.0, iou_score)
    size_score = sum(1 for f in per_frame if f["size_ok"]) / len(per_frame)
    com_score = sum(1 for f in per_frame if f["com_ok"]) / len(per_frame)
    if mean_diff < 0.02: motion_score = mean_diff / 0.02
    elif mean_diff > 0.45: motion_score = max(0, 1 - (mean_diff - 0.45) / 0.3)
    else: motion_score = 1.0 - max(0, 0.04 - mean_diff) * 10
    motion_score = max(0.0, min(1.0, motion_score))

    # Weights — silhouette IoU + size/com most important now (catches
    # fragmented/missing-body failures)
    total = (
        iou_score * 0.35 +
        size_score * 0.15 +
        com_score * 0.10 +
        crisp_score * 0.15 +
        color_score * 0.15 +
        vis_score * 0.05 +
        motion_score * 0.05
    )
    return {
        "total": total,
        "vis_score": vis_score, "crisp_score": crisp_score,
        "color_score": color_score, "iou_score": iou_score,
        "size_score": size_score, "com_score": com_score,
        "motion_score": motion_score, "mean_diff": mean_diff,
        "per_frame": per_frame, "reasons": reasons,
    }


# ---------- Iteration strategies per attempt ----------

def strategy_for_attempt(attempt_idx):
    """Return dict of kwargs for call_skeleton + aggressiveness for pose builder.

    Note: `init_images` on /animate-with-skeleton currently returns 422; the
    endpoint rejects our payload shape despite the schema, so we don't use it.
    We vary guidance_scale and pose aggressiveness instead."""
    presets = [
        # attempt 1 — default, moderate pose
        {"guidance": 4.0, "include_init": False, "init_strength": 300, "aggressiveness": 1.0},
        # attempt 2 — subtler pose (less chance character breaks frame)
        {"guidance": 4.0, "include_init": False, "init_strength": 300, "aggressiveness": 0.6},
        # attempt 3 — more guidance, subtle pose
        {"guidance": 7.0, "include_init": False, "init_strength": 300, "aggressiveness": 0.7},
        # attempt 4 — low guidance (more freedom to match skeleton), subtle pose
        {"guidance": 2.5, "include_init": False, "init_strength": 300, "aggressiveness": 0.8},
        # attempt 5 — very subtle, almost-neutral pose
        {"guidance": 4.0, "include_init": False, "init_strength": 300, "aggressiveness": 0.4},
    ]
    return presets[min(attempt_idx, len(presets) - 1)]


# ---------- Orchestrator ----------

def run_one(char_key, ref_path, action):
    ref_img = Image.open(ref_path).convert("RGBA")
    if ref_img.size != (128, 128):
        ref_img = ref_img.resize((128, 128), Image.Resampling.NEAREST)
    char_base = CHARACTER_POSES.get(char_key, base_pose)
    results = []
    best = None
    for attempt in range(MAX_ATTEMPTS):
        strat = strategy_for_attempt(attempt)
        pose_builder = POSE_BUILDERS[action]
        keypoints = pose_builder(char_base, a=strat["aggressiveness"])
        try:
            frames = call_skeleton(
                ref_img, keypoints,
                guidance=strat["guidance"],
                init_strength=strat["init_strength"],
                include_init=strat["include_init"],
            )
        except Exception as e:
            print(f"    attempt {attempt+1}: API error {e}")
            continue
        sheet = stitch(frames)
        audit_out = AUDIT_ROOT / f"{char_key}_{action}_a{attempt+1}.png"
        audit_out.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(audit_out)
        sc = score_sheet(frames, ref_img)
        print(f"    attempt {attempt+1}: score={sc['total']:.3f} "
              f"[iou={sc['iou_score']:.2f} size={sc['size_score']:.2f} "
              f"com={sc['com_score']:.2f} crisp={sc['crisp_score']:.2f} "
              f"color={sc['color_score']:.2f} motion={sc['motion_score']:.2f}]"
              + (f" — {sc['reasons'][0]}" if sc["reasons"] else ""))
        results.append({"attempt": attempt+1, "strategy": strat,
                        "score": sc, "audit_path": str(audit_out.relative_to(ROOT))})
        if best is None or sc["total"] > best["score"]["total"]:
            best = results[-1]
            best["frames_sheet_path"] = str(audit_out.relative_to(ROOT))
        if sc["total"] >= TARGET_SCORE:
            print(f"    ✅ reached target {TARGET_SCORE} at attempt {attempt+1}")
            break
    # deliver best
    final_out = OUT_ROOT / char_key / f"{action}-south-sheet.png"
    final_out.parent.mkdir(parents=True, exist_ok=True)
    Image.open(ROOT / best["frames_sheet_path"]).save(final_out)
    return {
        "character": char_key, "action": action,
        "attempts": len(results),
        "best_attempt": best["attempt"],
        "best_score": best["score"]["total"],
        "target_met": best["score"]["total"] >= TARGET_SCORE,
        "final_path": str(final_out.relative_to(ROOT)),
        "history": results,
    }


def main():
    koala_ref = ROOT / "public/assets/pets/blue-koala/directions/v3/south.png"
    subtrak_ref = ROOT / "public/assets/pets/subtrak/directions/v3/south.png"
    jobs = [
        ("blue-koala", koala_ref, "happy"),
        ("blue-koala", koala_ref, "sparkle"),
        ("blue-koala", koala_ref, "love"),
        ("subtrak",    subtrak_ref, "happy"),
        ("subtrak",    subtrak_ref, "sparkle"),
        ("subtrak",    subtrak_ref, "love"),
    ]
    all_results = []
    for ch, ref, action in jobs:
        print(f"\n[{ch}/{action}] iterating up to {MAX_ATTEMPTS} attempts, target={TARGET_SCORE}")
        r = run_one(ch, ref, action)
        all_results.append(r)
        print(f"  → final: attempt {r['best_attempt']}, score {r['best_score']:.3f}"
              + (" ✅" if r["target_met"] else " ⚠️ below target"))
    SCORES_FILE.parent.mkdir(parents=True, exist_ok=True)
    SCORES_FILE.write_text(json.dumps(all_results, indent=2, default=str))
    print(f"\n📝 scores → {SCORES_FILE.relative_to(ROOT)}")
    ok = sum(1 for r in all_results if r["target_met"])
    print(f"✅ {ok}/{len(all_results)} met ≥{TARGET_SCORE}")


if __name__ == "__main__":
    main()
