#!/usr/bin/env python3
"""Regenerate and check the series accent family and inks in src/brand/brand.css.

The family is nine hues at one OKLCH lightness and one chroma, taken from the
first course's green. Holding lightness and chroma is what makes sibling
courses read as a set, and it is also what guarantees their contrast: this
script prints the ratio of every hue against the page ground and under white
ink, so a hue cannot enter the family without its numbers being seen.

The two greys the pages set text in are hand-picked rather than computed, so
they are measured against the ground instead. That half is not decoration: the
series index carried a third grey once and it was below AA, with nothing in any
repository to say so.

    python3 tools/brand_palette.py            # print the family and its ratios
    python3 tools/brand_palette.py --check    # fail if brand.css has drifted

Stdlib only, like the other data tools here.
"""

import argparse
import math
import pathlib
import re
import sys

# The page ground and the ink a filled accent carries. The family's ratios are
# computed against these literals, because the family can be printed without
# reading any CSS; the ink check under --check reads --bg back out of brand.css
# instead, so the greys are measured against the ground the pages really set.
GROUND = "#fdfdfb"
ON_ACCENT = "#ffffff"

# The seed: Module 1's green, which every other hue in the family is this
# colour with the hue turned and nothing else changed.
SEED = "#0b6e4f"

# Names in the order they are written into brand.css, and the hue offset each
# one sits at from the seed. Thirty-six degrees apart, except that the stop at
# 288 is skipped because it comes out an olive that reads as a mistake rather
# than as a choice: nine hues over ten stops, reaching 324 degrees round the
# circle, and no two close enough to be confused in a link. Regenerating an
# even nine at 40 degrees, which this comment used to describe, gives a
# different set.
FAMILY = [
    ("green", 0),
    ("teal", 36),
    ("blue", 72),
    ("indigo", 108),
    ("violet", 144),
    ("plum", 180),
    ("crimson", 216),
    ("oxide", 252),
    ("moss", 324),
]


# The inks the pages set text in, which unlike the family are hand-picked and
# so are checked rather than constructed. The series index carried a third grey
# here once, #767a77, for its card meta lines: 4.28:1, below AA at the 0.78rem
# those are set in, and nothing in either repository would have said so.
TEXT_INKS = ["ink", "muted"]


def to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def to_srgb(c: float) -> float:
    c = max(0.0, min(1.0, c))
    return c * 12.92 if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def luminance(hex_colour: str) -> float:
    h = hex_colour.lstrip("#")
    r, g, b = (to_linear(int(h[i : i + 2], 16) / 255) for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def linear_to_oklab(r: float, g: float, b: float) -> tuple[float, float, float]:
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = l ** (1 / 3), m ** (1 / 3), s ** (1 / 3)
    return (
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    )


def oklab_to_linear(L: float, a: float, b: float) -> tuple[float, float, float]:
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_**3, m_**3, s_**3
    return (
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    )


def hex_to_oklch(hex_colour: str) -> tuple[float, float, float]:
    h = hex_colour.lstrip("#")
    r, g, b = (to_linear(int(h[i : i + 2], 16) / 255) for i in (0, 2, 4))
    L, a, bb = linear_to_oklab(r, g, b)
    return L, math.hypot(a, bb), math.degrees(math.atan2(bb, a)) % 360


def oklch_to_hex(L: float, C: float, H: float) -> tuple[str, bool]:
    a = C * math.cos(math.radians(H))
    b = C * math.sin(math.radians(H))
    rgb = oklab_to_linear(L, a, b)
    outside = any(v < -0.0005 or v > 1.0005 for v in rgb)
    return "#%02x%02x%02x" % tuple(round(to_srgb(v) * 255) for v in rgb), outside


def build() -> list[tuple[str, str, float, float, float]]:
    """The family, as (name, hex, chroma used, contrast on ground, under white ink).

    A hue whose full chroma falls outside sRGB has its chroma lowered until it
    fits, rather than being clipped: clipping moves lightness too, and one hue
    a shade darker than the other eight is visible in a way the numbers here
    would not catch."""
    L, C, H0 = hex_to_oklch(SEED)
    out = []
    for name, offset in FAMILY:
        H = (H0 + offset) % 360
        chroma = C
        while True:
            hex_colour, outside = oklch_to_hex(L, chroma, H)
            if not outside or chroma < 0.02:
                break
            chroma -= 0.0015
        out.append(
            (name, hex_colour, chroma, contrast(hex_colour, GROUND), contrast(ON_ACCENT, hex_colour))
        )
    return out


def read_css() -> dict[str, str]:
    """Every `--token: #hex;` in brand.css, keyed without the dashes.

    Not just the hues: the ground and the inks live in the brand layer too, so
    one read covers both halves of the check."""
    css = pathlib.Path(__file__).resolve().parent.parent / "src" / "brand" / "brand.css"
    text = css.read_text()
    return {m.group(1): m.group(2).lower() for m in re.finditer(r"--([a-z-]+):\s*(#[0-9a-fA-F]{6});", text)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="compare against brand.css and fail on any difference")
    args = parser.parse_args()

    family = build()
    L, C, _ = hex_to_oklch(SEED)
    print(f"Seed {SEED} in OKLCH: L={L:.4f} C={C:.4f}")
    print(f"Ground {GROUND}, accent ink {ON_ACCENT}. AA wants 4.5:1 for text.")
    print()
    print(f"{'token':16} {'hex':9} {'chroma':>7} {'on ground':>10} {'ink on it':>10}")
    for name, hex_colour, chroma, on_ground, under_ink in family:
        print(f"--hue-{name:10} {hex_colour:9} {chroma:7.4f} {on_ground:10.2f} {under_ink:10.2f}")

    worst = min(min(f[3], f[4]) for f in family)
    print()
    print(f"Worst ratio anywhere in the family: {worst:.2f}:1")
    if worst < 4.5:
        print("FAIL: a hue in the family is below AA.", file=sys.stderr)
        return 1

    if not args.check:
        return 0

    in_css = read_css()
    problems = []
    for name, hex_colour, _, _, _ in family:
        token = f"hue-{name}"
        if token not in in_css:
            problems.append(f"--{token} is missing from brand.css")
        elif in_css[token] != hex_colour:
            problems.append(f"--{token} is {in_css[token]} in brand.css, computes to {hex_colour}")
    for name in in_css:
        if name.startswith("hue-") and name[4:] not in {f[0] for f in family}:
            problems.append(f"--{name} is in brand.css but not in this script's family")

    ground = in_css.get("bg", GROUND)
    print()
    print(f"Text inks on the ground ({ground}):")
    for token in TEXT_INKS:
        if token not in in_css:
            problems.append(f"--{token} is missing from brand.css")
            continue
        ratio = contrast(in_css[token], ground)
        print(f"--{token:10} {in_css[token]:9} {ratio:10.2f}")
        if ratio < 4.5:
            problems.append(f"--{token} is {in_css[token]}, {ratio:.2f}:1 on the ground, below AA")

    if problems:
        print()
        for p in problems:
            print(f"FAIL: {p}", file=sys.stderr)
        return 1
    print(f"brand.css matches: all {len(family)} hues, and both inks clear AA.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
