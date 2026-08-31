"""Assemble the workbench document, the way the app assembles it.

The learner's code is one Python file divided into sections by marker
comments. src/exercises/sections.json is the section table both sides read:
the order, the exact marker line, what each section provides and which
sections it requires. src/python/workbench_prelude.py is the file header.

The join rule lives in two places, here and in src/state/workbenchDoc.ts,
and check_exercises.py asserts that splitting an assembled document on its
markers gives the bodies back byte for byte, which is what keeps them
honest:

    document = [prelude, section, section, ...] joined by two blank lines
    section  = marker + one blank line + body

Nothing here imports NumPy, so it can be read by any tool.
"""

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
EX = ROOT / "src" / "exercises"
PY = ROOT / "src" / "python"

SECTIONS = json.loads((EX / "sections.json").read_text())
BY_ID = {s["id"]: s for s in SECTIONS}
PRELUDE = (PY / "workbench_prelude.py").read_text().rstrip()

JOIN = "\n\n\n"

# The one marker regex, read out of the TypeScript that owns it rather than
# restated here, so the two cannot drift.
_TS = (ROOT / "src" / "state" / "workbenchDoc.ts").read_text()
_LITERAL = re.search(r"^const MARKER_RE = /(.+)/gm;$", _TS, re.M)
MARKER_RE = re.compile(_LITERAL.group(1).replace("\\n", "\n"), re.M) if _LITERAL else None


def body(section_id, kind):
    """One section's Python, without its marker.

    kind is "solution" or "skeleton". Given sections have exactly one body
    and ignore the kind, because there is nothing for the learner to write
    in them; a given section's file lives at src/exercises/given/<name>.py
    with the "given-" prefix dropped.
    """
    s = BY_ID[section_id]
    if s["kind"] == "given":
        name = section_id.removeprefix("given-")
        return (EX / "given" / f"{name}.py").read_text().rstrip()
    return (EX / section_id / f"{kind}.py").read_text().rstrip()


def section_text(section_id, kind):
    return BY_ID[section_id]["marker"] + "\n\n" + body(section_id, kind)


def assemble(ids, kind="solution", kinds=None):
    """The document holding exactly these sections, in table order.

    kinds overrides kind for named sections (per-section skeleton against a
    solved background, and so on).
    """
    kinds = kinds or {}
    ordered = [s["id"] for s in SECTIONS if s["id"] in set(ids)]
    parts = [PRELUDE]
    for sid in ordered:
        parts.append(section_text(sid, kinds.get(sid, kind)))
    return JOIN.join(parts) + "\n"


def closure(section_id, seen=None):
    """section_id and everything it needs, transitively."""
    seen = seen if seen is not None else set()
    if section_id in seen:
        return seen
    seen.add(section_id)
    for req in BY_ID[section_id]["requires"]:
        closure(req, seen)
    return seen


def givens_for(section_id):
    """The given sections that arrive with this exercise section."""
    return [s["id"] for s in SECTIONS if section_id in s["pulledInBy"]]


def with_givens(ids):
    """These sections, everything they call into, and the given sections that
    arrive alongside them: what the learner's file actually holds once these
    exercises have been opened."""
    out = set()
    todo = list(ids)
    while todo:
        sid = todo.pop()
        if sid in out:
            continue
        for extra in closure(sid) | set(givens_for(sid)):
            if extra not in out:
                todo.append(extra)
        out.add(sid)
    return [s["id"] for s in SECTIONS if s["id"] in out]


def line_map(document):
    """The section list the harness wants: 1-based inclusive line ranges."""
    lines = document.splitlines()
    starts = []
    for i, line in enumerate(lines):
        m = re.match(r"^#[ \t]*-{2,}[ \t]*\[section:([a-z0-9-]+)\]", line)
        if m:
            starts.append((i + 1, m.group(1)))
    out = []
    for k, (start, sid) in enumerate(starts):
        end = starts[k + 1][0] - 1 if k + 1 < len(starts) else len(lines)
        s = BY_ID.get(sid, {"label": sid, "kind": "unknown"})
        out.append({"id": sid, "label": s["label"], "kind": s["kind"],
                    "start": start, "end": end})
    return out


def lend_for(target, present_ids, touched_ids, course_names):
    """Which names the course lends for a run targeting `target`.

    A section that is absent, or present but untouched, is not the learner's
    work, so the course lends its copy. Never a name the target itself owns:
    that is what stops a lend from turning an unwritten exercise green.
    """
    # Never a name the target owns, and never one its own suite examines
    # directly: either would let a lend report success about unwritten code.
    owned = set(BY_ID[target]["provides"]) | set(BY_ID[target].get("checks", []))
    names = []
    for sid in sorted(closure(target) - {target}):
        if sid in present_ids:
            # A section written for you is the real thing wherever it sits in
            # the file; only an exercise section can be present but untouched.
            if BY_ID[sid]["kind"] == "given" or sid in touched_ids:
                continue
        for name in BY_ID[sid]["provides"]:
            if name not in owned and name in course_names:
                names.append(name)
    return sorted(set(names))
