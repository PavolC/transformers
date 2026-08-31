#!/usr/bin/env python3
"""Check that every copy of the brand agrees with every other copy.

The masthead and footer use the fixed three-band series mark from
Monogram.tsx. The course mark is declared in brand.ts and copied into the
favicon and social card, where no component can generate it. The card draws
both marks, since it is a screenshot and reaches neither component. The
browser chrome colour is another literal in a meta tag. Those copies are the
ones that go stale.

The kit that carries the portable copy of these files now lives in the series
repository rather than here, so this script no longer compares the two. The
guard that replaces it is arithmetic rather than equality: brand_palette.py
--check measures this repo's palette against the OKLCH derivation, and the
series runs the same check on its own copy.

    python3 tools/check_brand.py

Exit status is 0 when everything agrees. Stdlib only.
"""

import pathlib
import re
import struct
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
BRAND = ROOT / "src" / "brand"

# There used to be a byte-equality check here between src/brand/ and the kit's
# copy of it, because the kit lived in this repository. The kit is now in the
# series repository (PavolC/moving-parts), so the two copies are no longer in
# one working tree and nothing here can compare them. What replaces it is that
# both sides check the same arithmetic independently: brand_palette.py --check
# measures this repo's brand.css against the OKLCH derivation, and the series
# runs its own copy of that script against the kit's brand.css and its index.
# A hue cannot drift on one side without one of the two going red.
SERIES_MARK = ["hue-green", "hue-blue", "hue-plum"]


def fail(problems: list[str], message: str) -> None:
    problems.append(message)


def has_flex_rule(text: str, selector: str) -> bool:
    """Whether selector's first rule lays its children out in one row."""
    rule = re.search(rf"{re.escape(selector)}\s*\{{([^}}]*)\}}", text, re.S)
    return bool(
        rule
        and re.search(r"display:\s*(?:inline-)?flex\s*;", rule.group(1))
        and not re.search(r"flex-direction:\s*column(?:-reverse)?\s*;", rule.group(1))
    )


def has_full_row_rule(text: str, selector: str) -> bool:
    """Whether selector reserves one complete line in its wrapping flexbox."""
    rule = re.search(rf"{re.escape(selector)}\s*\{{([^}}]*)\}}", text, re.S)
    return bool(rule and re.search(r"flex:\s*0\s+0\s+100%\s*;", rule.group(1)))


def resolve_accent(css: str) -> tuple[str, str]:
    """The hue token --accent points at, and its value."""
    token = re.search(r"--accent:\s*var\(--hue-([a-z]+)\);", css)
    if not token:
        raise SystemExit("could not find the --accent line in brand.css")
    name = token.group(1)
    value = re.search(rf"--hue-{name}:\s*(#[0-9a-fA-F]{{6}});", css)
    if not value:
        raise SystemExit(f"--accent points at --hue-{name}, which brand.css does not define")
    return name, value.group(1).lower()


def main() -> int:
    problems: list[str] = []

    css = (BRAND / "brand.css").read_text()
    ts = (BRAND / "brand.ts").read_text()
    html = (ROOT / "index.html").read_text()
    monogram = (BRAND / "Monogram.tsx").read_text()

    hue_name, accent = resolve_accent(css)

    # The glyph, as brand.ts declares it.
    # (?<![A-Za-z]) so the "id:" fields above the glyph do not match "d:".
    glyph_d = re.search(r'(?<![A-Za-z])d:\s*"([^"]+)"', ts)
    stroke_width = re.search(r"strokeWidth:\s*([0-9.]+)", ts)
    view_box = re.search(r'viewBox:\s*"([^"]+)"', ts)
    if not (glyph_d and stroke_width and view_box):
        raise SystemExit("could not read the glyph out of brand.ts")

    # The mark beside the series name is the series' three bands, not the
    # course glyph. Check both its palette order and its 32-unit geometry.
    series_fills = re.findall(r'fill="var\(--(hue-[a-z]+)\)"', monogram)
    if series_fills != SERIES_MARK:
        fail(problems, f"Monogram.tsx bands {', '.join(series_fills) or '(none)'}, "
                       f"but the series mark is {', '.join(SERIES_MARK)}")
    series_bands = re.findall(
        r'<rect width="(\d+)" height="32" x="(\d+)" fill="var\(--hue-[a-z]+\)"',
        monogram,
    )
    if series_bands != [("11", "0"), ("11", "11"), ("10", "22")]:
        fail(problems, f"Monogram.tsx has band geometry {series_bands}, expected "
                       "[(11, 0), (11, 11), (10, 22)]")
    if not re.search(r'<rect width="32" height="32" rx="7"', monogram):
        fail(problems, "Monogram.tsx has no 32-unit rounded clipping tile")
    masthead_source = (BRAND / "Masthead.tsx").read_text()
    footer_source = (BRAND / "SeriesFooter.tsx").read_text()
    if not re.search(r'<Monogram\s*/>\s*<span className="brand-wordmark">', masthead_source):
        fail(problems, "Masthead.tsx does not keep the series mark beside its wordmark")
    if not has_flex_rule(css, ".brand-mark"):
        fail(problems, "the masthead's mark-and-name lockup is not a flex row")
    footer_lockup = re.search(r'<span className="series-lockup">(.*?)</span>', footer_source, re.S)
    if not footer_lockup or "<Monogram />" not in footer_lockup.group(1) or "SERIES.name" not in footer_lockup.group(1):
        fail(problems, "SeriesFooter.tsx does not keep the series mark beside its name")
    if not has_flex_rule(css, ".series-lockup"):
        fail(problems, "the footer's mark-and-name lockup is not a flex row")
    if not has_full_row_rule(css, ".series-lockup"):
        fail(problems, "the footer's description does not start below its mark-and-name lockup")

    # The favicon, as index.html declares it.
    icon = re.search(r'rel="icon"\s*\n?\s*href="data:image/svg\+xml,([^"]+)"', html)
    if not icon:
        fail(problems, "index.html has no inline data-URI favicon")
    else:
        svg = urllib.parse.unquote(icon.group(1))
        favicon_d = re.search(r"d='([^']+)'", svg)
        favicon_fill = re.search(r"fill='(#[0-9a-fA-F]{3,6})'", svg)
        favicon_stroke = re.search(r"stroke='(#[0-9a-fA-F]{3,6})'", svg)
        favicon_width = re.search(r"stroke-width='([0-9.]+)'", svg)
        favicon_view = re.search(r"viewBox='([^']+)'", svg)

        if not favicon_d or favicon_d.group(1) != glyph_d.group(1):
            got = favicon_d.group(1) if favicon_d else "(none)"
            fail(problems, f"the favicon path is\n    {got}\n  but brand.ts draws\n    {glyph_d.group(1)}")
        if not favicon_view or favicon_view.group(1) != view_box.group(1):
            got = favicon_view.group(1) if favicon_view else "(none)"
            fail(problems, f"the favicon viewBox is '{got}', brand.ts says '{view_box.group(1)}'")
        if not favicon_width or float(favicon_width.group(1)) != float(stroke_width.group(1)):
            got = favicon_width.group(1) if favicon_width else "(none)"
            fail(problems, f"the favicon stroke-width is {got}, brand.ts says {stroke_width.group(1)}")
        if not favicon_fill or favicon_fill.group(1).lower() != accent:
            got = favicon_fill.group(1) if favicon_fill else "(none)"
            fail(problems, f"the favicon tile is {got}, but --accent resolves to {accent} (--hue-{hue_name})")
        # The glyph is drawn in the ink used on a filled accent, which
        # src/styles.css calls --on-accent.
        on_accent = re.search(r"--on-accent:\s*(#[0-9a-fA-F]{3,6});", (ROOT / "src" / "styles.css").read_text())
        want_ink = on_accent.group(1).lower() if on_accent else "#fff"
        if not favicon_stroke or favicon_stroke.group(1).lower().rstrip("f") != want_ink.lower().rstrip("f"):
            got = favicon_stroke.group(1) if favicon_stroke else "(none)"
            fail(problems, f"the favicon glyph is stroked {got}, but --on-accent is {want_ink}")

    # The title, which a rename reaches in brand.ts and leaves behind in the two
    # places the HTML has to spell it out before any JavaScript runs.
    title = re.search(r"COURSE_TITLE\s*=\s*`([^`]+)`", ts)
    if not title:
        fail(problems, "could not find COURSE_TITLE in brand.ts")
    else:
        wanted = (
            title.group(1)
            .replace("${COURSE.subject}", re.search(r'subject:\s*"([^"]+)"', ts).group(1))
            .replace("${SERIES.name}", re.search(r'name:\s*"([^"]+)"', ts).group(1))
        )
        for label, pattern in [
            ("<title>", r"<title>([^<]+)</title>"),
            ('og:title', r'property="og:title"\s+content="([^"]+)"'),
        ]:
            got = re.search(pattern, html)
            if not got:
                fail(problems, f"index.html has no {label}")
            elif got.group(1) != wanted:
                fail(problems, f"index.html's {label} is {got.group(1)!r}, but COURSE_TITLE is {wanted!r}")

        # The pre-mount skeleton spells the wordmark out too, because it has to
        # paint before the masthead component exists.
        # Matched on content rather than layout: a formatter that reflows this
        # file (8aae5fc collapsed the three-line <p> onto one) must not turn a
        # brand check red, because this script gates the deploy.
        series = re.search(r'name:\s*"([^"]+)"', ts).group(1)
        if not re.search(rf">\s*{re.escape(series)}\s*</p>", html):
            fail(problems, f"index.html's loading skeleton does not carry the wordmark {series!r}")

    theme = re.search(r'name="theme-color"\s+content="(#[0-9a-fA-F]{6})"', html)
    if not theme:
        fail(problems, "index.html has no theme-color meta tag")
    elif theme.group(1).lower() != accent:
        fail(problems, f"theme-color is {theme.group(1)}, but --accent resolves to {accent}")

    # The social card. A share is unfurled by a crawler with no page to
    # resolve a relative path against, so every URL in this block has to be
    # absolute, which makes the deployed origin a literal in index.html the
    # same way the favicon and the theme colour are. Four places spell it and
    # they go stale independently, so the check is that they agree with each
    # other rather than with a copy of the URL kept here.
    social = {
        "og:url": re.search(r'property="og:url"\s+content="([^"]+)"', html),
        "og:image": re.search(r'property="og:image"\s*\n?\s*content="([^"]+)"', html),
        "twitter:image": re.search(r'name="twitter:image"\s*\n?\s*content="([^"]+)"', html),
        "canonical": re.search(r'rel="canonical"\s+href="([^"]+)"', html),
    }
    missing = [k for k, v in social.items() if not v]
    if missing:
        fail(problems, f"index.html is missing {', '.join(missing)}")
    else:
        got = {k: v.group(1) for k, v in social.items()}
        for key in ("og:url", "og:image", "twitter:image", "canonical"):
            if not got[key].startswith("https://"):
                fail(problems, f"{key} is {got[key]!r}, which a crawler cannot resolve: it must be absolute")
        origins = {k: "/".join(v.split("/")[:4]) for k, v in got.items()}
        if len(set(origins.values())) != 1:
            spelled = ", ".join(f"{k} -> {v}" for k, v in sorted(origins.items()))
            fail(problems, f"the social tags point at more than one origin: {spelled}")
        if got["og:url"] != got["canonical"]:
            fail(problems, f"og:url is {got['og:url']!r} but canonical is {got['canonical']!r}")
        if got["og:image"] != got["twitter:image"]:
            fail(problems, f"og:image is {got['og:image']!r} but twitter:image is {got['twitter:image']!r}")

        # The image itself has to exist in public/ under the name the tag
        # promises, and be the size the tags declare. A crawler that fetches a
        # 404 renders the share as bare text, which is the bug this whole
        # block exists to prevent, and it is invisible from the page.
        card = ROOT / "public" / got["og:image"].rsplit("/", 1)[-1]
        if not card.exists():
            fail(problems, f"og:image names {card.name}, which is not in public/")
        else:
            data = card.read_bytes()
            if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
                fail(problems, f"public/{card.name} is not a PNG")
            else:
                width, height = struct.unpack(">II", data[16:24])
                declared = (
                    re.search(r'property="og:image:width"\s+content="(\d+)"', html),
                    re.search(r'property="og:image:height"\s+content="(\d+)"', html),
                )
                if not all(declared):
                    fail(problems, "index.html declares og:image but not its width and height")
                elif (width, height) != (int(declared[0].group(1)), int(declared[1].group(1))):
                    fail(problems, f"public/{card.name} is {width}x{height}, but the tags declare "
                                   f"{declared[0].group(1)}x{declared[1].group(1)}")
                if (width, height) != (1200, 630):
                    fail(problems, f"public/{card.name} is {width}x{height}; the summary_large_image "
                                   f"slot wants 1200x630")

        # What a reader gets when the image does not arrive: a screen reader, a
        # client that blocks images, a crawler that only reads the tags. The
        # tag is here today and nothing kept it here, which is the same silent
        # failure as the four URLs above.
        if not re.search(r'property="og:image:alt"\s*\n?\s*content="[^"]+"', html):
            fail(problems, "og:image has no og:image:alt")

        twitter_title = re.search(r'name="twitter:title"\s+content="([^"]+)"', html)
        if title and twitter_title and twitter_title.group(1) != wanted:
            fail(problems, f"index.html's twitter:title is {twitter_title.group(1)!r}, "
                           f"but COURSE_TITLE is {wanted!r}")

    # The card is drawn by tools/og_card.html rather than by a component, so it
    # is one more copy of the accent that a rebrand would leave behind.
    card_src = ROOT / "tools" / "og_card.html"
    if not card_src.exists():
        fail(problems, "tools/og_card.html is missing, so the social card cannot be regenerated")
    else:
        src = card_src.read_text()
        if accent not in src.lower():
            fail(problems, f"tools/og_card.html never uses {accent}, but --accent resolves to it")
        series_lockup = re.search(r'<div class="brandrow">(.*?)</div>', src, re.S)
        if not series_lockup or "series-tile" not in series_lockup.group(1) or "wordmark" not in series_lockup.group(1):
            fail(problems, "the social card does not keep the series mark beside its name")
        if not has_flex_rule(src, ".brandrow"):
            fail(problems, "the social card's series lockup is not a flex row")
        course_lockup = re.search(r'<div class="course-lockup">(.*?)</div>', src, re.S)
        if not course_lockup or "course-tile" not in course_lockup.group(1) or "<h1>" not in course_lockup.group(1):
            fail(problems, "the social card does not keep the course glyph beside its name")
        if not has_flex_rule(src, ".course-lockup"):
            fail(problems, "the social card's course lockup is not a flex row")
        # The course tile is the only <path> on the card (the series bands are
        # rects), so match any path rather than a hardcoded prefix: course
        # one's copy of this check was pinned to its own sigmoid's first curve
        # command, which a sibling course would trip over.
        card_d = re.search(r'd="(M[^"]*)"', src)
        if not card_d or card_d.group(1) != glyph_d.group(1):
            got_d = card_d.group(1) if card_d else "(none)"
            fail(problems, f"the social card's course-glyph path is\n    {got_d}\n  but brand.ts draws\n    {glyph_d.group(1)}")
        # And one more copy of the series mark, for the same reason: a
        # screenshot reaches no component, so the three bands are a literal
        # here. The card used to draw the course glyph beside the series name,
        # which named the series with the course's mark.
        want_bands = []
        for token in SERIES_MARK:
            hue = re.search(rf"--{token}:\s*(#[0-9a-fA-F]{{6}});", css)
            want_bands.append(hue.group(1).lower() if hue else f"(no --{token})")
        card_bands = [
            band.lower()
            for band in re.findall(r'<rect width="\d+" height="32" x="\d+" fill="(#[0-9a-fA-F]{6})"', src)
        ]
        if card_bands != want_bands:
            fail(problems, f"the social card's series mark is {', '.join(card_bands) or '(none)'}, "
                           f"but Monogram.tsx draws {', '.join(want_bands)}")

    if problems:
        print(f"{len(problems)} problem(s):\n", file=sys.stderr)
        for p in problems:
            print(f"  {p}", file=sys.stderr)
        return 1

    print(f"Brand agrees: accent --hue-{hue_name} ({accent}), series mark in the "
          "masthead, the footer and the social card, course glyph in the favicon "
          "and the card, and the title in 4 places.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
