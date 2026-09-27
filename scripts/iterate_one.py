#!/usr/bin/env python3
"""Run iteration for a single (character, action) with fresh attempts."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from iterate_skeleton_anims import run_one, ROOT


def main():
    if len(sys.argv) < 3:
        print("usage: iterate_one.py <character> <action>")
        sys.exit(1)
    ch, action = sys.argv[1], sys.argv[2]
    ref_paths = {
        "blue-koala": ROOT / "public/assets/pets/blue-koala/directions/v3/south.png",
        "subtrak":    ROOT / "public/assets/pets/subtrak/directions/v3/south.png",
    }
    print(f"[{ch}/{action}] single-job iteration")
    r = run_one(ch, ref_paths[ch], action)
    print(f"→ attempt {r['best_attempt']}, score {r['best_score']:.3f}"
          + (" ✅" if r["target_met"] else " ⚠️"))


if __name__ == "__main__":
    main()
