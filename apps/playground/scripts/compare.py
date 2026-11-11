# /// script
# dependencies = ["numpy", "pillow"]
# ///
"""Compares a capture from capture.mjs with its reference, frame by frame.

    uv run scripts/compare.py family-keypad [--steps 3] [--frames 0:20]

For each frame it prints the ink box of the reference and of ours, and the
top and bottom of every glyph column, so travel, masks and timing can be read
off directly. It also writes montage.png per step: reference, ours, and the
difference (red is only in the reference, green only in ours).
"""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent


def load(path, size):
    im = Image.open(path).convert("RGB")
    if im.size != size:
        im = im.crop((0, 0, *size))
    return np.asarray(im).astype(float) / 255


def ink(rgb, light):
    """How much ink each pixel has, so coloured text counts as fully as grey."""
    return 1 - rgb.min(axis=2) if light else rgb.max(axis=2)


def runs(mask):
    out, start = [], None
    for i, c in enumerate(mask):
        if c and start is None:
            start = i
        if not c and start is not None:
            out.append((start, i - 1))
            start = None
    if start is not None:
        out.append((start, len(mask) - 1))
    return out


def glyphs(ink, gap=6):
    """Column runs of ink, merging runs closer than `gap`, with their tops and bottoms."""
    cols = runs((ink > 0.5).any(axis=0))
    merged = []
    for a, b in cols:
        if merged and a - merged[-1][1] <= gap:
            merged[-1] = (merged[-1][0], b)
        else:
            merged.append((a, b))
    out = []
    for a, b in merged:
        rows = np.nonzero((ink[:, a : b + 1] > 0.5).any(axis=1))[0]
        out.append((a, b, rows[0], rows[-1], ink[:, a : b + 1].sum()))
    return out


def fmt(g):
    return " ".join(f"[{a}-{b} y{t}-{u}]" for a, b, t, u, _ in g)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("id")
    parser.add_argument("--steps")
    parser.add_argument("--frames", default="0:")
    parser.add_argument("--pad", type=int, default=30)
    args = parser.parse_args()

    out = root / ".parity" / args.id
    manifest = json.loads((out / "manifest.json").read_text())
    crop = manifest["crop"]
    size = (crop["w"], crop["h"])
    wanted = {int(s) for s in args.steps.split(",")} if args.steps else None
    lo, _, hi = args.frames.partition(":")

    for step in manifest["steps"]:
        if wanted and step["index"] not in wanted:
            continue
        d = out / str(step["index"])
        n = step["frames"] + 1
        ref = [load(d / "ref" / f"{k}.png", size) for k in range(n)]
        ours = [load(d / "ours" / f"{k}.png", size) for k in range(n)]
        light = ref[0].mean() > 0.5
        ref = [ink(f, light) for f in ref]
        ours = [ink(f, light) for f in ours]

        union = np.max([o > 0.5 for o in ours], axis=0)
        ys, xs = np.nonzero(union)
        y0, y1 = max(ys.min() - args.pad, 0), min(ys.max() + args.pad, size[1] - 1)
        x0, x1 = max(xs.min() - args.pad, 0), min(xs.max() + args.pad, size[0] - 1)
        print(f"\nstep {step['index']} → {step['step']} at {step['at']}s, frame {step['first']}, rows {y0}-{y1}")

        tiles = []
        for k in range(int(lo or 0), int(hi) if hi else n):
            r = ref[k][y0 : y1 + 1, x0 : x1 + 1]
            o = ours[k][y0 : y1 + 1, x0 : x1 + 1]
            diff = np.abs(r - o).mean()
            ms = round(((step["first"] + k - 1) / 60 - step["at"]) * 1000) if k else "before"
            print(f"{k:>3} {ms!s:>6}ms diff {diff:.4f}  ref {fmt(glyphs(r))}")
            print(f"{'':>17}ours {fmt(glyphs(o))}")
            tile = np.zeros((*r.shape, 3))
            tile[..., 0] = r
            tile[..., 1] = o
            tile[..., 2] = np.minimum(r, o)
            tiles.append(tile)

        if tiles:
            h, w = tiles[0].shape[:2]
            cols = 4
            sheet = np.zeros(((h + 4) * -(-len(tiles) // cols), (w + 4) * cols, 3))
            for i, t in enumerate(tiles):
                y, x = (i // cols) * (h + 4), (i % cols) * (w + 4)
                sheet[y : y + h, x : x + w] = t
            Image.fromarray((sheet * 255).astype(np.uint8)).save(d / "montage.png")


main()
