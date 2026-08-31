"""Check the workbench: the one file the learner builds across the course.

The exercises are sections of one growing Python file, so the thing worth
checking is the file: that it assembles, that it compiles at every point a
learner can reach, that no section quietly rebinds a name an earlier section
defined, and that a section's tests really do depend on the sections above it
rather than on a copy the course slipped in underneath.

That last one is why assertion G exists, and it is the reason this script is
a day-one artifact (CASEBOOK.md 16): course one's isolated skeletons, merged
untouched into one file, passed 19 of 52 tests, because a later import
rebound names retroactively for every suite. Running the suites cannot detect
that, because everything is green. Only sabotaging a provider and watching
its consumer stay green can.

Assertions, each with its own failure message:

  A  course order is derived, never written down twice
  B  every document a learner can reach compiles, per kind and per section
  C  no section rebinds a name an earlier section owns
  D  the solved document passes every suite, including at every prefix
  E  the untouched document implements nothing
  F  a later section does not break an earlier one
  G  the mutation check: a consumer's suite notices a sabotaged provider
  H  lending is exact and cannot make an unwritten exercise pass
  I  markers round-trip: split and rejoin is byte-identical
  J  the marker regex in workbenchDoc.ts agrees with the markers in the table
  L  every given section's names exist on course_helpers.py (value-agreement
     checks get written alongside the first given section; none exist yet)

Needs NumPy (Pyodide's only package beyond the standard library):

    pip install numpy && python3 tools/check_exercises.py
    python3 tools/check_exercises.py --verbose   # print every test title
    python3 tools/check_exercises.py --quick     # skip G, the slow one

Exits non-zero if anything is wrong, so it can gate a change to a test, a
skeleton, a solution or the section table.
"""

import argparse
import ast
import json
import pathlib
import re
import sys
import types

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import workbench as wb  # noqa: E402

ROOT = wb.ROOT
PY = ROOT / "src" / "python"
EX = ROOT / "src" / "exercises"

EXERCISE_IDS = [s["id"] for s in wb.SECTIONS if s["kind"] == "exercise"]

# Failures the untouched document is supposed to produce that are not the
# skeleton's own NotImplementedError, because an exercise deliberately writes
# a better message for the not-yet-written state. Keep this list short and
# keep the reason with it: it is an exemption from assertion E's
# teaching-message rule, not a place to park a test that crashes.
EXPECTED_SKELETON_FAILURES: dict[str, str] = {}

# Tests that check work done in a DIFFERENT section, so they can pass while
# the section they are filed under is still a stub. None exist yet; course
# one needed exactly one, for a cross-section seam edit.
CROSS_SECTION_TESTS: set[str] = set()


def load_module(path, name):
    mod = types.ModuleType(name)
    mod.__file__ = str(path)
    exec(compile(path.read_text(), path.name, "exec"), mod.__dict__)
    return mod


def harness():
    """The app's harness, with modules registered the way the worker does."""
    sys.modules["reference_scribe"] = load_module(PY / "reference_scribe.py", "reference_scribe")
    sys.modules["course"] = load_module(PY / "course_helpers.py", "course")
    return load_module(PY / "harness.py", "harness")


def tests_for(section_id):
    return (EX / section_id / "tests.py").read_text()


def spec_for(document, target, present, touched, course_names):
    return json.dumps({
        "target": target,
        "sections": wb.line_map(document),
        "lend": wb.lend_for(target, set(present), set(touched), course_names),
    })


def run(h, document, target, present, touched, course_names):
    return json.loads(h.run_document(
        document, tests_for(target),
        spec_for(document, target, present, touched, course_names)))


def prefix_ids(k):
    """Every section up to and including exercise k, in course order."""
    through = EXERCISE_IDS[k]
    rank = wb.SECTIONS.index(wb.BY_ID[through])
    ids = [s["id"] for s in wb.SECTIONS[: rank + 1]]
    for g in wb.givens_for(through):
        if g not in ids:
            ids.append(g)
    return [s["id"] for s in wb.SECTIONS if s["id"] in set(ids)]


# ---------------------------------------------------------------- assertions

def check_order(problems):
    """A. Course order is derived from the registry and the chapter list."""
    registry = (EX / "registry.ts").read_text()
    chapters = (ROOT / "src" / "chapters" / "index.ts").read_text()

    listed = re.findall(r'\bid: "([a-z0-9-]+)"', registry)
    module_of = dict(zip(listed, re.findall(r'\bmodule: "([a-z0-9]+)"', registry)))
    chapter_ids = re.findall(r'\bid: "(c\d+)"', chapters)

    for ex_id in listed:
        index = EX / ex_id / "index.ts"
        if not index.exists():
            problems.append(f"A: registry lists {ex_id}, which has no folder in src/exercises")
        elif f'id: "{ex_id}"' not in index.read_text():
            problems.append(f"A: registry's id {ex_id} does not match the id in its own index.ts")
        if module_of.get(ex_id) not in set(chapter_ids):
            problems.append(
                f"A: registry files {ex_id} under chapter {module_of.get(ex_id)!r}, "
                "which src/chapters/index.ts does not define")

    for d in sorted(EX.iterdir()):
        if (d / "tests.py").exists() and d.name not in listed:
            problems.append(
                f"A: src/exercises/{d.name} exists but the registry does not list it, "
                "so it is invisible on the front page")

    # The registry's own order is the order the workbench assembles in, so a
    # registry that lists two exercises out of chapter order would build a
    # file whose sections run backwards against the course.
    rank = {c: i for i, c in enumerate(chapter_ids)}
    seen = [rank.get(module_of[i], -1) for i in listed if i in module_of]
    if seen != sorted(seen):
        problems.append(
            "A: the registry lists exercises out of chapter order, so the workbench "
            "would assemble sections in an order the reader never meets them in")

    if listed != EXERCISE_IDS:
        problems.append(
            f"A: sections.json's exercise order is {EXERCISE_IDS} but the registry's "
            f"is {listed}; the two have to be the same list")

    for name in ("workbench", "scratch", "undo-workbench"):
        if name in listed or (EX / name).exists():
            problems.append(
                f"A: {name} is a reserved storage id and cannot also be an exercise id")
    for ex_id in listed:
        if ex_id.startswith("given-") or ex_id.startswith("passhash-"):
            problems.append(f"A: {ex_id} collides with a reserved storage id prefix")

    # Every name a section promises has to be a def in every kind of its body,
    # because codeReady() checks exactly that before unlocking a panel.
    for s in wb.SECTIONS:
        kinds = ["solution"] if s["kind"] == "given" else ["solution", "skeleton"]
        for kind in kinds:
            body = wb.body(s["id"], kind)
            defined = {n.name for n in ast.parse(body).body
                       if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}
            missing = [n for n in s["provides"] if n not in defined]
            if missing:
                problems.append(
                    f"A: sections.json says {s['id']} provides {missing}, but its "
                    f"{kind} does not define them; the panel unlock check reads "
                    "that list")


def check_compiles(problems):
    """B. Every document a learner can reach compiles, and so does each part."""
    for kind in ("solution", "skeleton"):
        for s in wb.SECTIONS:
            body = wb.body(s["id"], "solution" if s["kind"] == "given" else kind)
            try:
                compile(body, f"{s['id']}.py", "exec")
            except SyntaxError as exc:
                problems.append(
                    f"B: {s['id']}'s {kind} does not compile on its own "
                    f"(line {exc.lineno}), so resetting that section would leave "
                    "an unparseable file")
            if wb.MARKER_RE and wb.MARKER_RE.search(body):
                problems.append(
                    f"B: {s['id']}'s {kind} contains a line that reads as a section "
                    "marker, which would split the section in two")
    if wb.MARKER_RE and wb.MARKER_RE.search(wb.PRELUDE):
        problems.append(
            "B: the file header contains a line that reads as a section marker")

    for k in range(len(EXERCISE_IDS)):
        ids = prefix_ids(k)
        for kind in ("solution", "skeleton"):
            doc = wb.assemble(ids, kind)
            try:
                compile(doc, "your_code.py", "exec")
            except SyntaxError as exc:
                problems.append(
                    f"B: the {kind} document through {EXERCISE_IDS[k]} does not "
                    f"compile (line {exc.lineno})")


def check_no_rebinding(problems):
    """C. No section rebinds a name an earlier section owns."""
    for kind in ("solution", "skeleton"):
        ids = [s["id"] for s in wb.SECTIONS]
        owner = {}
        for sid in ids:
            body = wb.body(sid, "solution" if wb.BY_ID[sid]["kind"] == "given" else kind)
            for node in ast.parse(body).body:
                names = []
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    names = [node.name]
                elif isinstance(node, (ast.Import, ast.ImportFrom)):
                    names = [a.asname or a.name.split(".")[0] for a in node.names]
                elif isinstance(node, ast.Assign):
                    names = [t.id for t in node.targets if isinstance(t, ast.Name)]
                for name in names:
                    if name == "np":
                        continue  # the one alias the file header owns
                    if name in owner and owner[name] != sid:
                        problems.append(
                            f"C: {sid} rebinds {name}, which {owner[name]} already "
                            f"defines ({kind} bodies). In the workbench that replaces "
                            "the learner's own function with another copy, and the "
                            "tests cannot tell")
                    owner.setdefault(name, sid)


def check_round_trip(problems):
    """I. Splitting an assembled document on its markers gives the bodies back."""
    ids = [s["id"] for s in wb.SECTIONS]
    doc = wb.assemble(ids, "solution")
    found = wb.line_map(doc)
    if [f["id"] for f in found] != ids:
        problems.append(
            f"I: the assembled document splits into {[f['id'] for f in found]}, "
            f"not {ids}")
        return
    lines = doc.splitlines()
    for entry in found:
        # Byte for byte, not stripped: a body that comes back with one more
        # blank line than it went in with is exactly the drift this catches,
        # and a strip() on both sides hides it.
        raw = "\n".join(lines[entry["start"]: entry["end"]])
        body = raw[1:] if raw.startswith("\n") else raw
        body = body.rstrip()
        want = wb.body(entry["id"], "solution")
        if body != want.rstrip():
            problems.append(
                f"I: {entry['id']} does not come back byte for byte after a split; "
                "the splice operations the editor performs are built on this")


def check_regex(problems):
    """J. The regex the app parses with matches the markers the table holds."""
    if wb.MARKER_RE is None:
        problems.append(
            "J: could not read MARKER_RE out of src/state/workbenchDoc.ts; the app "
            "and this checker would be parsing the document two different ways")
        return
    for s in wb.SECTIONS:
        m = wb.MARKER_RE.search(s["marker"])
        if not m or m.group(1) != s["id"]:
            problems.append(f"J: the app's regex does not read {s['id']} out of its own marker")
    for bad in ("# ---- softmax ----", "#[section:softmax]", "  # ---- [section:softmax] x"):
        if wb.MARKER_RE.search(bad):
            problems.append(f"J: the app's regex accepts {bad!r}, which is not a marker")


def check_given_sections(problems):
    """L. Every given section's provided names exist on course_helpers.py.

    A given section is course code sitting in the learner's file, and the
    course module is what gets lent while sections are unwritten, so the two
    must carry the same names. Value-agreement checks (course one's L ran the
    given code on fixtures against the course module) get written alongside
    the first given section this course ships; none exist yet.
    """
    course = sys.modules["course"]
    for s in wb.SECTIONS:
        if s["kind"] != "given":
            continue
        for name in s["provides"]:
            if not hasattr(course, name):
                problems.append(
                    f"L: given section {s['id']} provides {name}, which "
                    "course_helpers.py does not define, so it cannot be lent")


def check_lending(problems, h, course_names):
    """H. Lending is exact, and cannot make an unwritten exercise pass."""
    for target in EXERCISE_IDS:
        owned = set(wb.BY_ID[target]["provides"])
        lent = wb.lend_for(target, set(), set(), course_names)
        if owned & set(lent):
            problems.append(
                f"H: the lend list for {target} contains {sorted(owned & set(lent))}, "
                "which the exercise itself is meant to write")
        # Only the names downstream code actually calls need a copy to lend.
        used = set()
        for sid in wb.closure(target):
            for kind in ("solution", "skeleton"):
                if wb.BY_ID[sid]["kind"] == "given" and kind == "skeleton":
                    continue
                body = wb.body(sid, "solution" if wb.BY_ID[sid]["kind"] == "given" else kind)
                used |= {n.id for n in ast.walk(ast.parse(body))
                         if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load)}
        for req in wb.closure(target) - {target}:
            if wb.BY_ID[req]["kind"] == "given":
                continue
            for name in wb.BY_ID[req]["provides"]:
                if name in used and name not in course_names:
                    problems.append(
                        f"H: {target} calls {name}, which {req} provides, but "
                        "course_helpers.py has no copy to lend while that section "
                        "is still unwritten")

    # A learner who opens a late chapter first gets a run, not a NameError.
    for target in EXERCISE_IDS:
        ids = wb.with_givens([target])
        bodies = {sid: ("solution" if sid == target or wb.BY_ID[sid]["kind"] == "given"
                        else "skeleton") for sid in ids}
        doc = wb.assemble(ids, "skeleton", bodies)
        got = run(h, doc, target, ids, [target], course_names)
        if got["setup_error"]:
            problems.append(
                f"H: a document holding only {target} does not even run: "
                f"{got['setup_error']['message']}")
        else:
            failed = [t["name"] for t in got["tests"]
                      if not t["passed"] and t["name"] not in CROSS_SECTION_TESTS]
            if failed:
                problems.append(
                    f"H: {target} alone in a file, with the course lending the rest, "
                    f"fails {failed}; a reader who opens that chapter first sees this")


def check_solved(problems, h, course_names, verbose):
    """D and F. Every suite passes on the solved document, and on every prefix."""
    ids = [s["id"] for s in wb.SECTIONS]
    full = wb.assemble(ids, "solution")
    for target in EXERCISE_IDS:
        got = run(h, full, target, ids, ids, course_names)
        if got["setup_error"]:
            problems.append(f"D: the solved document does not run: {got['setup_error']}")
            return
        failed = [t for t in got["tests"] if not t["passed"]]
        n = len(got["tests"])
        print(f"{target:16} solved document: {n - len(failed)}/{n} "
              f"{'ok' if not failed else 'FAILED'}")
        for t in failed:
            problems.append(f"F: on the whole solved file, {target} fails {t['name']}: {t['message']}")
        if verbose:
            for t in got["tests"]:
                print(f"    {'pass' if t['passed'] else 'FAIL'}  {t['title']}")
        if not got["tests"]:
            problems.append(f"D: {target}'s test file defines no test_ functions")
        if got["lent"]:
            problems.append(
                f"D: the solved document still borrowed {got['lent']} from the course; "
                "a finished file runs entirely on the learner's own code")

    for k, target in enumerate(EXERCISE_IDS):
        ids = prefix_ids(k)
        doc = wb.assemble(ids, "solution")
        got = run(h, doc, target, ids, ids, course_names)
        failed = [t["name"] for t in got["tests"] if not t["passed"]]
        if failed or got["setup_error"]:
            problems.append(
                f"D: at the point a learner actually reaches {target} (sections "
                f"{ids}), it fails {failed or got['setup_error']}")


def check_untouched(problems, h, course_names, verbose):
    """E. The untouched document implements nothing."""
    ids = [s["id"] for s in wb.SECTIONS]
    doc = wb.assemble(ids, "skeleton")
    total_passed = 0
    total = 0
    for target in EXERCISE_IDS:
        got = run(h, doc, target, ids, [], course_names)
        if got["setup_error"]:
            problems.append(
                f"E: the untouched document does not run: {got['setup_error']['message']}")
            return
        passed = [t["name"] for t in got["tests"] if t["passed"]]
        total_passed += len(passed)
        total += len(got["tests"])
        if passed:
            problems.append(
                f"E: on an untouched workbench, {target} already passes {passed}; "
                "those tests do not test anything the learner writes")
        for t in got["tests"]:
            if t["passed"]:
                continue
            allow = EXPECTED_SKELETON_FAILURES.get(t["name"])
            if allow and allow in t["message"]:
                continue
            if "NotImplementedError" not in t["message"]:
                problems.append(
                    f"E: on the untouched workbench, {target}'s {t['name']} fails with "
                    f"something other than the skeleton's NotImplementedError: {t['message']}")
        if verbose:
            print(f"{target:16} untouched: {len(got['tests']) - len(passed)}/{len(got['tests'])} fail")
    print(f"{' ':16} untouched document: {total_passed}/{total} tests pass "
          f"{'ok' if total_passed == 0 else 'FAILED'}")
    if total_passed:
        problems.append(
            f"E: on an untouched workbench {total_passed} of {total} tests pass; a "
            "learner who presses Run tests before writing anything is told they have "
            "already finished several functions")

    # And the realistic mid-course state: everything above solved, this one a stub.
    for k, target in enumerate(EXERCISE_IDS):
        ids = prefix_ids(k)
        kinds = {sid: ("skeleton" if sid == target else "solution") for sid in ids}
        doc = wb.assemble(ids, "solution", kinds)
        touched = [i for i in ids if i != target]
        got = run(h, doc, target, ids, touched, course_names)
        passed = [t["name"] for t in got["tests"]
                  if t["passed"] and t["name"] not in CROSS_SECTION_TESTS]
        if passed:
            problems.append(
                f"E: with every earlier section solved and {target} still a stub, "
                f"{target} passes {passed}")


def check_mutation(problems, h, course_names):
    """G. A consumer's suite notices a sabotaged provider.

    This is the only assertion that can detect shadowing. Running the suites
    cannot: with a `from course import ...` line in the file, breaking the
    learner's own function leaves every suite green, because the import
    rebinds the name for every suite after the document is executed. Do not
    delete this because it looks redundant (with one section it has no edges
    to walk); it is the test that would have caught the bug course one's
    workbench was built to remove, and edges appear with chapter 5.
    """
    ids = [s["id"] for s in wb.SECTIONS]

    # The machinery's own self-test, so this assertion has teeth before the
    # course has any provider-consumer edges to walk. Sabotaging a section
    # must be noticed by that section's OWN suite; if it is not, _sabotage
    # is not doing anything and every edge below would pass vacuously.
    for sid in EXERCISE_IDS:
        doc = wb.assemble(ids, "solution")
        sabotaged = _sabotage(doc, sid)
        if sabotaged is None:
            problems.append(
                f"G: _sabotage cannot rewrite {sid}, so the mutation check is inert")
            continue
        if sabotaged == doc:
            problems.append(f"G: sabotaging {sid} changed nothing in the document")
            continue
        got = run(h, sabotaged, sid, ids, ids, course_names)
        if not (got["setup_error"] or any(not t["passed"] for t in got["tests"])):
            problems.append(
                f"G: a sabotaged {sid} still passes its own suite, so neither this "
                "check nor the tests are running the document's own code")

    edges = []
    for s in wb.SECTIONS:
        if s["kind"] != "exercise":
            continue
        for req in wb.closure(s["id"]) - {s["id"]}:
            if wb.BY_ID[req]["kind"] != "exercise":
                continue
            edges.append((req, s["id"]))
    edges = sorted(set(edges))

    for provider, consumer in edges:
        doc = wb.assemble(ids, "solution")
        sabotaged = _sabotage(doc, provider)
        if sabotaged is None:
            problems.append(f"G: could not sabotage {provider}")
            continue
        got = run(h, sabotaged, consumer, ids, ids, course_names)
        noticed = bool(got["setup_error"]) or any(
            not t["passed"] for t in got["tests"])
        if not noticed:
            problems.append(
                f"G: breaking {provider} leaves every {consumer} test green, so "
                f"{consumer} is not really running the learner's {provider}. "
                "Something above it is rebinding the name")
    return len(edges)


def _sabotage(document, section_id):
    """Replace one section's functions with sentinels that return nonsense."""
    entry = next((s for s in wb.line_map(document) if s["id"] == section_id), None)
    if entry is None:
        return None
    lines = document.splitlines()
    body = "\n".join(lines[entry["start"]: entry["end"]])
    stubs = []
    for node in ast.parse(body).body:
        if isinstance(node, ast.FunctionDef):
            args = ", ".join(a.arg for a in node.args.args)
            defaults = len(node.args.defaults)
            if defaults:
                names = [a.arg for a in node.args.args]
                head = names[:-defaults]
                tail = [f"{n}=None" for n in names[-defaults:]]
                args = ", ".join(head + tail)
            stubs.append(f"def {node.name}({args}):\n"
                         f"    raise ValueError('sabotaged {node.name}')\n")
    if not stubs:
        return None
    return "\n".join(
        lines[: entry["start"]] + ["\n\n".join(stubs)] + lines[entry["end"]:])


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--verbose", action="store_true", help="print every test title")
    ap.add_argument("--quick", action="store_true", help="skip the mutation check")
    args = ap.parse_args()

    h = harness()
    course_names = set(dir(sys.modules["course"]))
    problems = []

    check_order(problems)
    check_compiles(problems)
    check_no_rebinding(problems)
    check_round_trip(problems)
    check_regex(problems)
    check_given_sections(problems)
    check_solved(problems, h, course_names, args.verbose)
    check_untouched(problems, h, course_names, args.verbose)
    check_lending(problems, h, course_names)
    if args.quick:
        print(f"{' ':16} mutation check: skipped (--quick)")
    else:
        edges = check_mutation(problems, h, course_names)
        print(f"{' ':16} mutation check: {edges} provider-consumer edge(s) walked")

    print(f"{' ':16} registry: {len(EXERCISE_IDS)} exercise(s), "
          f"{len(wb.SECTIONS)} section(s), ids and chapter ids match")
    print()
    if problems:
        print(f"{len(problems)} problem(s):")
        for p in problems:
            print(" -", p)
        return 1
    print("the workbench assembles, compiles at every prefix, passes every suite when "
          "solved, implements nothing when untouched, and every section really runs "
          "the sections above it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
