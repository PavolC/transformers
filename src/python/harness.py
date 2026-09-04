"""Exercise test harness. Runs inside Pyodide.

The course is one growing Python file, the workbench, divided into sections
by marker comments. One section per exercise, plus two written for the
learner. The marker lines are parsed on the JavaScript side (there is one
regex, in src/state/workbenchDoc.ts); this file is handed the line ranges
already worked out, so the document format has exactly one parser.

run_document(document, tests_code, spec_json) executes the whole document as
a fresh `submission` module, lends the course's copy of anything the learner
has not written yet, then runs every `test_*` function defined in tests_code
in definition order. Returns a JSON string:

    {
      "setup_error": null | {"message": str, "line": int | null,
                             "section": str | null},
      "tests": [{"name", "title", "passed", "message", "section"}],
      "passed": bool,
      "lent": [str]
    }

Test functions signal failure by raising AssertionError with a teaching
message (see CLAUDE.md: failure messages are teaching content). Any other
exception is reported with its type, message, the line in the learner's code
that raised it, and the section that line falls in, so a failure caused by
an earlier section says so instead of blaming the one being worked on.

run_exercise(learner_code, tests_code) is the older single-file entry point.
It is what tools/check_exercises.py used before the workbench and what any
saved-per-exercise code still runs through; keep it working.
"""

import json
import sys
import traceback
import types

LEARNER_FILENAME = "your_code.py"
SCRATCH_FILENAME = "scratch.py"


def _learner_line(exc, filename=LEARNER_FILENAME):
    """Deepest traceback line inside the learner's code, or None."""
    line = None
    for frame in traceback.extract_tb(exc.__traceback__):
        if frame.filename == filename:
            line = frame.lineno
    return line


def _format_error(exc, filename=LEARNER_FILENAME):
    message = f"{type(exc).__name__}: {exc}"
    line = _learner_line(exc, filename)
    if isinstance(exc, SyntaxError) and exc.filename == filename:
        line = exc.lineno
    return {"message": message, "line": line}


def _section_finder(sections):
    """Map a 1-based line number to the section it falls in.

    sections is the list JavaScript worked out from the marker lines, each
    {"id", "label", "start", "end", "kind"}, with start and end 1-based and
    inclusive. A line above the first marker belongs to no section.
    """
    def find(line):
        if line is None:
            return None
        for s in sections:
            if s["start"] <= line <= s["end"]:
                return s
        return None
    return find


def run_scratch(learner_code):
    """Execute the learner's code alone, no tests: for printing and playing.

    Anything printed streams to the UI's output panel via the worker's
    stdout handler. Returns JSON: {"error": null | {"message", "line"}}.
    """
    scratch = types.ModuleType("scratch")
    scratch.__file__ = LEARNER_FILENAME
    try:
        exec(compile(learner_code, LEARNER_FILENAME, "exec"), scratch.__dict__)
    except Exception as exc:
        return json.dumps({"error": _format_error(exc)})
    return json.dumps({"error": None})


def _lend(submission, names):
    """Hand the course's copy of a name to code that has not written it yet.

    A section the learner has not touched is not their work, so the course
    lends its own copy for the run. JavaScript decides the list (an untouched
    or absent section, never a name the tested section itself owns); this
    just applies it. Overwriting an untouched section's stub is the point;
    what must never be overwritten, a function the learner wrote, is kept off
    the list by the caller, not checked here.
    """
    import course
    lent = []
    for name in names:
        if hasattr(course, name):
            setattr(submission, name, getattr(course, name))
            lent.append(name)
    return lent


def _exec_document(document, lend_names):
    """Exec the workbench as a fresh `submission` module. Returns (mod, err)."""
    # A previous run's module stays importable otherwise, so a document that
    # no longer defines a name can still be imported by a test through the
    # stale copy, and the tests pass on code that is not there.
    sys.modules.pop("submission", None)
    submission = types.ModuleType("submission")
    submission.__file__ = LEARNER_FILENAME
    try:
        code = compile(document, LEARNER_FILENAME, "exec")
    except SyntaxError as exc:
        return None, [], _format_error(exc)
    try:
        exec(code, submission.__dict__)
    except Exception as exc:
        return None, [], _format_error(exc)
    lent = _lend(submission, lend_names)
    sys.modules["submission"] = submission
    return submission, lent, None


def _run_tests(tests_code, find_section):
    """Run every test_* in tests_code, in definition order."""
    test_ns = {}
    try:
        exec(compile(tests_code, "tests.py", "exec"), test_ns)
    except Exception as exc:
        # Usually `from submission import name` against a document that does
        # not define it. Unguarded this reached the UI as a bare crash with
        # no test list at all.
        missing = getattr(exc, "name", None)
        detail = (
            f"your file does not define {missing}"
            if isinstance(exc, ImportError) and missing
            else f"{type(exc).__name__}: {exc}"
        )
        return None, {
            "message": (
                f"the tests could not start: {detail}. Check that every "
                "function this exercise asks for is defined in your file, "
                "spelled exactly as the contract spells it."
            ),
            "line": None,
            "section": None,
        }

    entries = []
    for name, fn in test_ns.items():
        if not name.startswith("test_") or not callable(fn):
            continue
        title = (fn.__doc__ or name.replace("_", " ")).strip().splitlines()[0]
        entry = {"name": name, "title": title, "passed": True, "message": "",
                 "section": None}
        try:
            fn()
        except AssertionError as exc:
            entry["passed"] = False
            entry["message"] = str(exc) or "assertion failed (no message)"
        except Exception as exc:
            entry["passed"] = False
            err = _format_error(exc)
            section = find_section(err["line"])
            entry["section"] = section["id"] if section else None
            entry["message"] = _crash_message(err, section)
        entries.append(entry)
    return entries, None


def _crash_message(err, section, target_id=None):
    """What to say when a test called the learner's code and it raised."""
    if err["line"] is None:
        return (
            f"your code raised {err['message']}. The test called your "
            "function with valid inputs, so the error is in the "
            "implementation, not the test."
        )
    where = f" at line {err['line']} of your file"
    if section is None or section["id"] == target_id:
        return (
            f"your code raised {err['message']}{where}. The test called "
            "your function with valid inputs, so the error is in the "
            "implementation, not the test."
        )
    return (
        f"your code raised {err['message']}{where}, which is inside your "
        f"{section['label']} section. That section is where the error is, "
        "not this one."
    )


def run_document(document, tests_code, spec_json):
    """Run one section's tests against the whole workbench."""
    spec = json.loads(spec_json)
    sections = spec.get("sections", [])
    find_section = _section_finder(sections)
    results = {"setup_error": None, "tests": [], "passed": False, "lent": []}

    submission, lent, err = _exec_document(document, spec.get("lend", []))
    if err is not None:
        section = find_section(err["line"])
        err["section"] = section["id"] if section else None
        if section is not None:
            err["message"] = (
                f"{err['message']} (line {err['line']}, in your "
                f"{section['label']} section)"
            )
        results["setup_error"] = err
        return json.dumps(results)
    results["lent"] = lent

    entries, setup_error = _run_tests(tests_code, find_section)
    if setup_error is not None:
        results["setup_error"] = setup_error
        return json.dumps(results)

    target = spec.get("target")
    for entry in entries:
        if entry["section"] is not None and entry["section"] == target:
            entry["section"] = None
    results["tests"] = entries
    results["passed"] = all(e["passed"] for e in entries) and bool(entries)
    return json.dumps(results)


def run_document_scratch(document, scratch_code, spec_json):
    """Run the whole workbench, then the scratch pad, in one namespace.

    The scratch pad is how a learner prints things and tries an experiment, so
    it sees the library and everything lent to it, and the scratch pad is a
    separate compile so its line numbers are its own.
    """
    spec = json.loads(spec_json)
    find_section = _section_finder(spec.get("sections", []))
    submission, lent, err = _exec_document(document, spec.get("lend", []))
    if err is not None:
        section = find_section(err["line"])
        return json.dumps({
            "error": {**err, "section": section["id"] if section else None,
                      "label": section["label"] if section else None},
            "lent": lent,
        })
    if scratch_code.strip():
        # The corpus loader, so a play snippet can open the bundled text the
        # way the prompts say it can, and the two drivers, the loop every
        # model trains and is scored through, which the course provides and
        # no exercise writes. Only names the learner's own file does not
        # define: their work always wins over a convenience.
        import course
        for name in ("load_corpus", "train_driver", "eval_driver"):
            if hasattr(course, name) and name not in submission.__dict__:
                setattr(submission, name, getattr(course, name))
        try:
            exec(compile(scratch_code, SCRATCH_FILENAME, "exec"),
                 submission.__dict__)
        except Exception as exc:
            return json.dumps({
                "error": {**_format_error(exc, SCRATCH_FILENAME),
                          "section": "scratch", "label": "scratch pad"},
                "lent": lent,
            })
    return json.dumps({"error": None, "lent": lent})


def run_exercise(learner_code, tests_code):
    """One self-contained file against one test suite (the older path)."""
    results = {"setup_error": None, "tests": [], "passed": False, "lent": []}

    sys.modules.pop("submission", None)
    submission = types.ModuleType("submission")
    submission.__file__ = LEARNER_FILENAME
    try:
        exec(compile(learner_code, LEARNER_FILENAME, "exec"), submission.__dict__)
    except Exception as exc:
        results["setup_error"] = {**_format_error(exc), "section": None}
        return json.dumps(results)
    sys.modules["submission"] = submission

    entries, setup_error = _run_tests(tests_code, lambda line: None)
    if setup_error is not None:
        results["setup_error"] = setup_error
        return json.dumps(results)
    results["tests"] = entries
    results["passed"] = all(e["passed"] for e in entries) and bool(entries)
    return json.dumps(results)
