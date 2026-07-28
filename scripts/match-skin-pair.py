#!/usr/bin/env python3
"""Uniforma luminosita', contrasto e colore di una coppia di skin (posa normale + click).

Le due immagini vengono riportate a un target comune = media delle loro statistiche
RGB per-canale (media+deviazione). Lo stretch di contrasto e' limitato per restare
in gamut (il match in spazio LAB sballa i pixel neon saturi nel roundtrip verso RGB).
Output: webp 512x512 con alpha preservato.

Uso:
    python scripts/match-skin-pair.py NORMALE.png CLICK.png \
        assets/image/skins/espo.webp assets/image/skins/espo-click.webp
"""
import sys
import numpy as np
from PIL import Image

CLAMP = (0.85, 1.20)  # limite allo stretch di contrasto per restare in gamut
SIZE = (512, 512)


def load(path):
    arr = np.array(Image.open(path).convert("RGBA"))
    return arr[:, :, :3].astype(np.float64), arr[:, :, 3], arr[:, :, 3] > 10


def stats(rgb, mask):
    px = rgb[mask]
    return px.mean(0), px.std(0)


def transfer(rgb, mu, sd, tmu, tsd):
    out = rgb.copy()
    for c in range(3):
        s = tsd[c] / sd[c] if sd[c] > 1e-6 else 1.0
        s = min(max(s, CLAMP[0]), CLAMP[1])
        out[:, :, c] = (rgb[:, :, c] - mu[c]) * s + tmu[c]
    return np.clip(out, 0, 255).astype(np.uint8)


def main():
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    in_a, in_b, out_a, out_b = sys.argv[1:5]
    rgbA, alA, mA = load(in_a)
    rgbB, alB, mB = load(in_b)
    muA, sdA = stats(rgbA, mA)
    muB, sdB = stats(rgbB, mB)
    tmu, tsd = (muA + muB) / 2.0, (sdA + sdB) / 2.0
    for rgb, mu, sd, al, out in ((rgbA, muA, sdA, alA, out_a), (rgbB, muB, sdB, alB, out_b)):
        rgbn = transfer(rgb, mu, sd, tmu, tsd)
        im = Image.fromarray(np.dstack([rgbn, al]).astype(np.uint8), "RGBA").resize(SIZE, Image.LANCZOS)
        im.save(out, "WEBP", quality=92, method=6)
        sv = np.array(Image.open(out).convert("RGBA"))
        px = sv[:, :, :3][sv[:, :, 3] > 10].astype(np.float64)
        print("%-28s R/G/B mean=%s std=%s" % (out, px.mean(0).round(1), px.std(0).round(1)))


if __name__ == "__main__":
    main()
