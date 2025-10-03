#!/usr/bin/env python3
"""Generate optimized preset circuit images.

Reads original PNG diagrams from assets-source/presets/originals/
Outputs cropped + thumbnails (webp) into static/presets/.

Run:  python3 scripts/process_presets_images.py
 or:  npm run generate:presets

Pipeline:
1. Center crop to 1200x675
2. Export DPR variants (1x, 2x, 3x) as <name>_160.webp, <name>_320.webp, <name>_480.webp

Adjust CROP_* or THUMB_* constants as needed.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

from PIL import Image

# Directories
REPO_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = REPO_ROOT / "assets-source" / "presets" / "originals"
OUT_DIR = REPO_ROOT / "static" / "presets"

# Output directory exists already (static/presets) but create just in case
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Target crop size and DPR thumbnails (base 160x90)
CROP_W, CROP_H = 1200, 675
THUMB_W, THUMB_H = 160, 90
QUALITY_BASE = 85
QUALITY_HIGH = 90

OUTPUT_VARIANTS = (
    (THUMB_W, THUMB_H, QUALITY_BASE),  # 1x
    (THUMB_W * 2, THUMB_H * 2, QUALITY_BASE),  # 2x
    (THUMB_W * 3, THUMB_H * 3, QUALITY_HIGH),  # 3x
)


def iter_pngs(directory: Path) -> Iterable[Path]:
    for p in sorted(directory.glob("*.png")):
        if p.is_file():
            yield p


def center_crop(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    w, h = img.size
    if target_w > w or target_h > h:
        raise ValueError(f"Cannot crop to {target_w}x{target_h} from {w}x{h}")
    left = (w - target_w) // 2
    top = (h - target_h) // 2
    return img.crop((left, top, left + target_w, top + target_h))


def process_one(path: Path) -> None:
    try:
        with Image.open(path) as img:
            # Direct single center crop to final size
            final = center_crop(img, CROP_W, CROP_H)

            stem = path.stem

            for width, height, quality in OUTPUT_VARIANTS:
                variant = final.resize((width, height), Image.LANCZOS)
                out_path = OUT_DIR / f"{stem}_{width}.webp"
                variant.save(out_path, "webp", quality=quality)

            print(f"Processed {path.name}")
    except Exception as e:
        print(f"Error processing {path.name}: {e}")


def main() -> None:
    if not SRC_DIR.exists():
        print(
            f"Source directory '{SRC_DIR}' does not exist. Place originals there.")
        return

    pngs = list(iter_pngs(SRC_DIR))
    if not pngs:
        print(f"No PNG files found in {SRC_DIR}")
        return

    for p in pngs:
        process_one(p)

    print("Done. Optimized images in static/presets/")


if __name__ == "__main__":
    main()
