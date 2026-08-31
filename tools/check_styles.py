"""Every class a component renders has a rule in the stylesheet.

This exists because of one bug, found by a reader rather than by a tool: the
front door's article was written `className="start"`, a name nothing in the
stylesheet selects, so the measure rules (`.module > p`) never matched and
every paragraph on the page ran the full column instead of 34rem. The page
still looked like a page, which is why nothing caught it. Course one's own
front door carries `className="module start-page"`, both halves load-bearing.

The same mistake had already happened twice in this repo: invented control-row
classes that no rule defined, and a figure marked `fig fig-box` instead of
joining a figure family's selector list. The pattern is always the same, a
class name invented in a component that the stylesheet has never heard of, and
it is mechanically detectable, which is what this script does.

    python3 tools/check_styles.py
    python3 tools/check_styles.py --list-unused   # rules nothing renders

Exit status is 0 when every rendered class has a rule. Stdlib only.
"""

import argparse
import pathlib
import re
import sys

# Stands in for a ${...} span while a template literal is read; see
# static_class_text.
MARKER = "\x00"

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
SHEETS = [SRC / "styles.css", SRC / "brand" / "brand.css"]

# Classes that are deliberately unstyled, with the reason beside each one.
# Keep this list short: it is an exemption from the rule, not a place to park
# an invented name. A class here carries no layout, so nothing breaks when no
# rule matches it.
ALLOWED_UNSTYLED: dict[str, str] = {
    # Structural hooks inside the workbench, styled through their parents
    # (.wb-head button, .wb-scratch-controls button) rather than by name.
    "wb-run": "styled through its parent's button rule",
    "wb-stop": "styled through its parent's button rule",
    "wb-close": "styled through its parent's button rule",
    "wb-output": "layout comes from the panel's grid",
    "wb-ran-for": "inherits the panel's status typography",
    "wb-sections-label": "inherits the label idiom from its parent",
    # Wrappers whose behaviour comes from a class beside them: scroll-x
    # supplies the overflow and the edge fade.
    "figure-scroll": "overflow and fade come from scroll-x beside it",
    # This course's own panel identity hooks: they name the panel for tests
    # and screenshots, and every rule inside them is scoped to a child.
    "tally-builder": "panel identity hook; its rules are on its children",
    "wheel-sampler": "panel identity hook; its rules are on its children",
    "vocab-grid": "panel identity hook; its rules are on its children",
    "window-slicer": "panel identity hook; its rules are on its children",
    "tally-cell": "grid cell; painted inline and by tally-cell-next",
}


def rendered_classes() -> dict[str, list[str]]:
    """Every class name a component states outright, with where it came from.

    Deliberately narrow, and the narrowness is the point: this reads only the
    forms where a literal IS a class name, which are a plain
    `className="a b"` and the static text of a `className={`a ${x}`}`
    template. Everything a ternary contributes is skipped.

    A wider scan was tried first and it reported `?`, `===`, `n.id` and the
    string `"passing"` from `state === "passing" ? ...` as missing classes. A
    checker with false positives gets switched off, and the three real bugs
    this guards against (`className="start"`, `className="fig fig-box"`,
    `className="control-row"`) were all plain literals, so the narrow rule
    loses nothing that has ever actually broken a page. Conditional classes
    are state hooks in practice, and the allow-list above carries the few that
    carry no rule.
    """
    found: dict[str, list[str]] = {}
    for path in sorted(SRC.rglob("*.tsx")):
        text = path.read_text()
        for literal in static_class_text(text):
            for piece in literal.split():
                if piece:
                    found.setdefault(piece, []).append(str(path.relative_to(ROOT)))
    return found


def static_class_text(text: str):
    """The class text a file states outright, one string per className."""
    for match in re.finditer(r'className="([^"]*)"', text):
        yield match.group(1)
    # A template literal: keep its static text and drop every ${...} span,
    # since what a substitution evaluates to is not knowable here. The span is
    # replaced with a marker rather than a space so that a name GLUED to a
    # substitution, as in `wb-section-${state}`, is recognisable as a fragment
    # and dropped: the whole class name is composed at runtime, and the static
    # prefix on its own is not a class anything should have a rule for.
    for match in re.finditer(r"className=\{`([^`]*)`\}", text):
        marked = re.sub(r"\$\{[^}]*\}", MARKER, match.group(1))
        yield " ".join(p for p in marked.split() if MARKER not in p)


def defined_classes() -> set[str]:
    """Every class name any selector in the stylesheets mentions."""
    names: set[str] = set()
    for sheet in SHEETS:
        if not sheet.exists():
            continue
        css = sheet.read_text()
        # Strip comments so a class named only in prose does not count.
        css = re.sub(r"/\*.*?\*/", " ", css, flags=re.S)
        names.update(re.findall(r"\.(-?[_a-zA-Z][\w-]*)", css))
    return names


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--list-unused", action="store_true",
                    help="also list stylesheet classes no component renders")
    args = ap.parse_args()

    rendered = rendered_classes()
    defined = defined_classes()

    problems = []
    for name, where in sorted(rendered.items()):
        if name in defined or name in ALLOWED_UNSTYLED:
            continue
        files = ", ".join(sorted(set(where)))
        problems.append(
            f"{name!r} is rendered by {files} and no rule in styles.css or "
            "brand.css selects it. Either the component invented a name (use "
            "the existing vocabulary, or add the class to the family's "
            "selector list) or the rule is missing.")

    if args.list_unused:
        unused = sorted(n for n in defined if n not in rendered)
        print(f"{len(unused)} stylesheet class(es) nothing renders yet "
              "(course one's sheet was lifted whole; prune as chapters land, "
              "never speculatively):")
        for name in unused:
            print(f"  .{name}")
        print()

    if problems:
        print(f"{len(problems)} problem(s):\n", file=sys.stderr)
        for p in problems:
            print(f"  {p}", file=sys.stderr)
        return 1

    print(f"styles agree: all {len(rendered)} rendered class(es) have a rule.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
