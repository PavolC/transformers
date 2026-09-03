"""Run every panel's Python outside a browser.

The panels that train, score or draw with real code are the course's payoff,
and chapters quote their numbers, so a panel that dies on
`AttributeError: module has no attribute 'forward_gpt'` is a broken chapter,
not a broken panel. Nothing but a reader clicking would notice, which is why
this runs in CI.

Each panel keeps its Python in a template literal in a .tsx (or, for the
training driver, in the worker itself). This script lifts that literal out,
substitutes the numeric constants the file declares, builds the same
arguments the panel builds, and runs it with the worker's own globals in
place: the `course` module, the corpus on a fake filesystem, and _js_report.

What it asserts is that the panel runs, reports progress, and returns JSON
whose numbers are in a sane range. It does not pin exact values; those come
from the benches under tools/bench/, which run the same code paths under the
pinned Pyodide. This is the check that the wiring is right.

    pip install numpy && python3 tools/check_panels.py
    python3 tools/check_panels.py --fast    # tiny model, few steps

Needs NumPy and the committed corpus in public/data.
"""

import argparse
import ast
import builtins
import io
import json
import pathlib
import re
import sys
import types

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import workbench as wb  # noqa: E402

ROOT = wb.ROOT
PANELS = ROOT / "src" / "chapters" / "interactives"
RUNTIME = ROOT / "src" / "runtime"
DATA = ROOT / "public" / "data"

# Where each panel's Python lives: (file, the template-literal const, the
# arguments the panel passes). The training driver is in the worker rather
# than in a panel, because every chapter that trains sends the same request;
# it is checked here for the same reason a panel would be.
CASES = [
    (RUNTIME / "pyodideWorker.ts", "TRAIN_DRIVER", "train"),
]

# What --fast trains: enough steps to move the loss and exercise every branch
# in the driver (including the sample-every-200 one, which is why the step
# count is not 5), and a model small enough to do it in seconds.
FAST_PARAMS = {
    "steps": 12,
    "blockSize": 16,
    "nEmbd": 16,
    "nHead": 2,
    "nLayer": 1,
    "batchSize": 4,
    "lr": 2e-3,
    "seed": 1337,
}
FULL_PARAMS = {**FAST_PARAMS, "steps": 60, "blockSize": 32, "nEmbd": 48, "nHead": 4}


def snippet(path, name):
    """The panel's Python, with its numeric constants substituted in."""
    source = path.read_text()
    m = re.search(rf"^const {name} = `\n(.*?)^`;$", source, re.S | re.M)
    if m is None:
        raise SystemExit(f"{path.name}: could not find the {name} template literal")
    body = m.group(1)
    consts = {
        k: int(v)
        for k, v in re.findall(r"^const ([A-Z_]+) = (\d+);$", source, re.M)
    }

    def sub(match):
        key = match.group(1)
        if key in consts:
            return str(consts[key])
        if key.isdigit():
            return key
        raise SystemExit(f"{path.name}: {name} interpolates ${{{key}}}, which is not a "
                         "plain numeric constant; this checker cannot stand in for it")

    body = re.sub(r"\$\{([A-Za-z_][A-Za-z0-9_]*|\d+)\}", sub, body)

    # What is on disk is the template literal's SOURCE; what Pyodide receives
    # is the string JS builds from it, with the literal's own escapes
    # resolved. Reading the source as Python leaves `\\n` two characters, so
    # rs.encode("\\n", stoi) looks up a backslash in the vocabulary and dies
    # with KeyError: '\\'. Undo the three escapes a template literal can
    # carry, in one pass so an unescaped backslash cannot be re-read.
    return re.sub(r"\\([\\`$])", lambda m: m.group(1), body)


def load_module(path, name):
    mod = types.ModuleType(name)
    mod.__file__ = str(path)
    exec(compile(path.read_text(), path.name, "exec"), mod.__dict__)
    return mod


def worker_globals(datasets):
    """The names the worker has in scope when a snippet runs."""
    sys.modules["reference_scribe"] = load_module(
        wb.PY / "reference_scribe.py", "reference_scribe")
    course = load_module(wb.PY / "course_helpers.py", "course")
    sys.modules["course"] = course

    real_open = builtins.open

    def fake_open(path, mode="r", *args, **kwargs):
        # The driver reads /tinyshakespeare.txt, which is where the worker
        # writes it inside Pyodide's filesystem.
        key = str(path).lstrip("/")
        if key in datasets:
            data = datasets[key]
            return io.StringIO(data) if "b" not in mode else io.BytesIO(data.encode())
        return real_open(path, mode, *args, **kwargs)

    # course.load_corpus() resolves `open` in the course module's own globals
    # before builtins, so the fake filesystem has to be planted there too:
    # putting it only in the snippet's namespace leaves the module reading the
    # real disk, where Pyodide's /tinyshakespeare.txt does not exist.
    course.open = fake_open

    reports = []
    ns = {
        "__builtins__": {**vars(builtins), "open": fake_open},
        "course": course,
        "_js_report": lambda payload: reports.append(json.loads(payload)),
    }
    return ns, reports


def run_snippet(code, filename, ns):
    """Exec the snippet and return its final expression, as Pyodide does.

    A first-party snippet ends in a json.dumps(...) that the worker posts
    back, and pyodide.runPythonAsync returns the last expression's value.
    exec() discards it, so the last statement is compiled separately.
    """
    tree = ast.parse(code)
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        final = ast.Expression(tree.body.pop().value)
        exec(compile(tree, filename, "exec"), ns)  # noqa: S102
        return eval(compile(final, filename, "eval"), ns)  # noqa: S307
    exec(compile(tree, filename, "exec"), ns)  # noqa: S102
    return None


def check_numbers(summary):
    """Sanity, not exactness: bits in range, times positive, no NaN."""
    problems = []

    def walk(value, path):
        if isinstance(value, dict):
            for k, v in value.items():
                walk(v, f"{path}.{k}" if path else k)
        elif isinstance(value, list):
            for i, v in enumerate(value[:4]):
                walk(v, f"{path}[{i}]")
        elif isinstance(value, float):
            if value != value or value in (float("inf"), float("-inf")):
                problems.append(f"{path} is {value}")
            elif "bits" in path and not 0.0 <= value <= 64.0:
                problems.append(f"{path} is {value}, which is not a plausible "
                                "bits-per-character figure")

    walk(summary, "")
    return "; ".join(problems)


def check_train(summary, ticks, params, problems, label):
    """The training driver's own contract, beyond not crashing."""
    for key in ("final_val_bits", "bigram_rung_bits", "steps", "seconds",
                "tokens_per_s", "n_params", "sample"):
        if key not in summary:
            problems.append(f"{label}: the result has no {key}, which the UI reads")
    if summary.get("steps") != params["steps"]:
        problems.append(f"{label}: asked for {params['steps']} steps, ran "
                        f"{summary.get('steps')}")
    if not ticks:
        problems.append(f"{label}: streamed no ticks, so the reader watches nothing")
        return
    if ticks[-1]["step"] != params["steps"]:
        problems.append(f"{label}: the last tick is step {ticks[-1]['step']}, not "
                        f"{params['steps']}; the curve would stop short")
    if not any("sample" in t for t in ticks):
        problems.append(f"{label}: no tick carried a sample, so the text panel "
                        "stays empty for the whole run")
    for t in ticks:
        for key in ("step", "steps", "lossBits", "tokensPerS", "elapsed"):
            if key not in t:
                problems.append(f"{label}: a tick has no {key}")
                return
    # Untrained, the model guesses near-uniformly over 65 characters, which is
    # log2(65) = 6.02 bits. A first loss far from that means the model was not
    # freshly initialized or the loss is not in bits.
    first = ticks[0]["lossBits"]
    if not 3.0 <= first <= 7.0:
        problems.append(f"{label}: the first logged loss is {first} bits, which is "
                        "nowhere near a fresh model's ~6.0 over 65 characters")



# ------------------------------------------------- the prompts' own snippets
#
# Every exercise prompt carries a copyable experiment with a Copy button and a
# Send-to-the-scratch-pad button (CLAUDE.md: "Every prompt carries a concrete
# experiment"). That code is the reader's first run of their own function
# against the real corpus, and until this ran, nothing but a reader clicking
# had ever executed it. Chapter 1 shipped two snippets opening on
# load_corpus() into a scratch pad that fetched no corpus.

PROMPTS = sorted((wb.EX).glob("*/index.ts"))

# What the JS escapes in a quoted string mean, once JS has read the literal.
JS_ESCAPES = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\", '"': '"', "'": "'",
              "`": "`", "0": "\0", "b": "\b", "f": "\f", "v": "\v"}


def bench_file(path):
    """Which committed bench a prompt's `bench` import refers to.

    Read out of the import line rather than assumed, because chapter 2's
    prompts quote chapter2.json and a checker that resolved every ${bench.x}
    against chapter 1 would silently compare the wrong numbers.
    """
    m = re.search(r'^import bench from "\.\./\.\./bench/([a-z0-9]+)\.json";$',
                  path.read_text(), re.M)
    if m is None:
        raise SystemExit(f"{path.parent.name}: a prompt interpolates a bench value "
                         "but the file imports no bench JSON")
    return ROOT / "src" / "bench" / f"{m.group(1)}.json"


def bench_value(dotted, path):
    """A value out of a committed bench, for a ${bench.a.b} interpolation."""
    parts = dotted.split(".")
    if parts[0] != "bench":
        raise SystemExit(f"a prompt snippet interpolates ${{{dotted}}}; this checker "
                         "resolves only bench values")
    value = json.loads(bench_file(path).read_text())
    for key in parts[1:]:
        # A list is indexed by number in the same dotted path: rows.0.x_text.
        value = value[int(key)] if isinstance(value, list) else value[key]
    return str(value)


def js_string_chain(source, start, path):
    """Decode the chain of JS string literals beginning at source[start].

    A prompt's code block is written as "line\n" + "line\n" + ..., so the
    value is a run of quoted literals joined by +. A backtick piece may
    interpolate a bench value, which is resolved here the way the bundler
    resolves it. Scanning stops at the first comma or closing brace found
    outside a literal, which is where the object entry ends.
    """
    out = []
    i = start
    while i < len(source):
        ch = source[i]
        if ch in "\"'`":
            quote = ch
            i += 1
            buf = []
            while i < len(source) and source[i] != quote:
                if quote == "`" and source.startswith("${", i):
                    close = source.index("}", i)
                    buf.append(bench_value(source[i + 2:close].strip(), path))
                    i = close + 1
                    continue
                if source[i] == "\\":
                    esc = source[i + 1]
                    if esc == "u":
                        buf.append(chr(int(source[i + 2:i + 6], 16)))
                        i += 6
                        continue
                    buf.append(JS_ESCAPES.get(esc, esc))
                    i += 2
                    continue
                buf.append(source[i])
                i += 1
            out.append("".join(buf))
            i += 1
            continue
        if ch in ",}":
            break
        i += 1
    return "".join(out)


def prompt_snippets(path):
    """Every runnable code block in one exercise's prompt, in prompt order."""
    source = path.read_text()
    return [js_string_chain(source, m.end(), path)
            for m in re.finditer(r"\bcode:\s*", source)]


# Where a prompt's prose tells the reader what its snippet prints, the printed
# output has to contain the chapter's own committed value. Each entry is a
# dotted path into the bench that prompt imports. This is the check that
# caught chapter 1's sampler printing the chapter's loop with its first
# character missing (casebook 21) and its tally counting the whole corpus
# where the chapter's table counts nine tenths of it.
SNIPPET_MUST_PRINT = {
    "count-pairs": ["rows.q.total"],
    "sample-next": ["sample.text", "favourite_loop.text"],
    "build-vocab": ["crossing.corpus_ids", "crossing.own_ids"],
    "get-batch": ["window.x_text", "window.y_text", "batch.rows.3.y_text"],
    "avg-surprise": ["receipt.val_text", "receipt.train_text", "receipt.unseen_count",
                     "receipt.worst_bits_text"],
}


def check_prompt_snippets(datasets, problems):
    """Run each prompt's experiment the way the scratch pad runs it."""
    ran = 0
    for path in PROMPTS:
        section = path.parent.name
        if section not in wb.BY_ID:
            continue
        # The document a reader holds when they meet this prompt: every
        # section up to and including this one, in course order. A snippet may
        # compose two sections (chapter 1's sampler feeds on chapter 1's
        # tally) without the sections themselves calling each other, which is
        # what `requires` in sections.json records.
        order = [s["id"] for s in wb.SECTIONS]
        ids = order[: order.index(section) + 1]
        document = wb.assemble(wb.with_givens(ids), "solution")
        for n, code in enumerate(prompt_snippets(path), start=1):
            label = f"{section} snippet {n}"
            ns, _ = worker_globals(datasets)
            # The scratch pad runs in the namespace the learner's own file
            # made, with load_corpus lent from the course module: see
            # run_document_scratch in src/python/harness.py.
            ns["load_corpus"] = ns["course"].load_corpus
            printed = io.StringIO()
            real_stdout = sys.stdout
            try:
                sys.stdout = printed
                exec(compile(document, "scribe.py", "exec"), ns)  # noqa: S102
                exec(compile(code, "scratch.py", "exec"), ns)  # noqa: S102
            except Exception as exc:  # noqa: BLE001
                sys.stdout = real_stdout
                problems.append(f"{label}: {type(exc).__name__}: {exc}")
                print(f"{label:26} FAILED  {type(exc).__name__}: {exc}")
                continue
            finally:
                sys.stdout = real_stdout
            ran += 1
            if not printed.getvalue().strip():
                problems.append(f"{label}: printed nothing, so the reader who runs "
                                "it sees an empty output panel")
            for dotted in SNIPPET_MUST_PRINT.get(section, []):
                want = bench_value(f"bench.{dotted}", path)
                if want not in printed.getvalue():
                    problems.append(
                        f"{label}: the prompt says it prints the chapter's "
                        f"{dotted}, and {want[:40]!r} is not in what it printed")
            lines = printed.getvalue().splitlines()
            head = lines[0][:40] if lines else ""
            print(f"{label:26} ok  {len(lines)} line(s) printed, first: {head!r}")
    return ran


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--fast", action="store_true", help="tiny model, 12 steps")
    ap.add_argument("--only", help="run one panel by file name")
    args = ap.parse_args()
    params = FAST_PARAMS if args.fast else FULL_PARAMS

    corpus = (DATA / "tinyshakespeare.txt").read_text()
    datasets = {"tinyshakespeare.txt": corpus}

    problems = []
    ran = 0
    for path, const, kind in CASES:
        label = path.name
        if args.only and args.only not in label:
            continue
        code = snippet(path, const)
        ns, reports = worker_globals(datasets)
        ticks = []
        try:
            run_snippet(code, label, ns)
            if kind == "train":
                out = ns["_train"](json.dumps(params),
                                   lambda t: ticks.append(json.loads(t)))
                summary = json.loads(out)
            else:
                ns["_args_json"] = json.dumps({})
                summary = run_snippet(code, label, ns)
        except Exception as exc:  # noqa: BLE001
            problems.append(f"{label}: {type(exc).__name__}: {exc}")
            print(f"{label:26} FAILED  {type(exc).__name__}: {exc}")
            continue
        ran += 1
        bad = check_numbers(summary)
        if bad:
            problems.append(f"{label}: {bad}")
        if kind == "train":
            check_train(summary, ticks, params, problems, label)
            print(f"{label:26} ok  {summary['n_params']} params, "
                  f"{len(ticks)} ticks, {ticks[0]['lossBits'] if ticks else '?'} -> "
                  f"{summary['final_val_bits']} bits (val), rung "
                  f"{summary['bigram_rung_bits']}, {summary['seconds']}s")
        else:
            print(f"{label:26} ok  {len(reports)} report(s)")

    snippets = check_prompt_snippets(datasets, problems)

    print()
    if problems:
        print(f"{len(problems)} problem(s):")
        for p in problems:
            print(" -", p)
        return 1
    print(f"{ran} panel snippet(s) and {snippets} prompt snippet(s) run outside the "
          "browser: the panels execute, stream progress and return numbers in range, "
          "and every experiment a prompt hands the reader runs against a solved "
          "document and prints something.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
