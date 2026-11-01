#!/usr/bin/env python3
"""把 _raw 下的原始渲染图转成 GameMonetize 要求的三种 JPG 规格。"""
import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("[x] 需要 Pillow：pip install pillow")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "dist" / "screenshots" / "_raw"
OUT = ROOT / "dist" / "gm-upload"

JOBS = [
    ("battle-1024x768.png",   "starcavenger-512x384.jpg", (512, 384)),
    ("powerup-1024x1024.png", "starcavenger-512x512.jpg", (512, 512)),
    ("pickup-1024x680.png",   "starcavenger-512x340.jpg", (512, 340)),
]


def main():
    if not RAW.exists():
        print("[x] 找不到原始图目录：%s" % RAW)
        print("    先跑：node _test/shots.js")
        sys.exit(1)

    OUT.mkdir(parents=True, exist_ok=True)
    made = 0
    for src, dst, size in JOBS:
        p = RAW / src
        if not p.exists():
            print("[!] 跳过（缺文件）：%s" % src)
            continue
        im = Image.open(p).convert("RGB")
        out = OUT / dst
        im.resize(size, Image.LANCZOS).save(
            out, "JPEG", quality=92, optimize=True, subsampling=0
        )
        print("[OK] %-30s %s  %.1f KB" % (dst, size, out.stat().st_size / 1024))
        made += 1

    print("[i] 输出目录：%s（%d 张）" % (OUT, made))


if __name__ == "__main__":
    main()
