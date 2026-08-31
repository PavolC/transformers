// The bench harness: run a bench under the SAME Pyodide the reader's tab runs.
//
// Every measured number in the prose comes from a committed bench that runs
// the artifact's own code path (CLAUDE.md, "Numbers"). This runner is what
// makes "the same code path" true down to the interpreter: it boots the
// pinned Pyodide in Node, registers reference_scribe.py and course_helpers.py
// exactly as src/runtime/pyodideWorker.ts does, hands the bench the same
// corpus the app fetches, and writes the result to src/bench/, which the
// chapters import directly, so a table in a chapter and a sentence beside it
// cannot disagree and a figure cannot 404 on its own numbers.
//
//   npm run bench              # every bench in tools/bench/*.py
//   npm run bench -- corpus    # just this one
//
// Each bench prints the prose sentence it backs, so a number that has drifted
// is visible without holding the chapter open beside it.
//
// NumPy: Pyodide's npm package ships the runtime core but not the package
// wheels, so the wheel is taken from .pyodide-cache/ when it is there and
// fetched from the pinned CDN otherwise. On a network that blocks the CDN,
// drop the release's numpy wheel into .pyodide-cache/ (see tools/spike/README).

import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadPyodide, version as pyodideVersion } from "pyodide";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BENCH_DIR = path.join(ROOT, "tools", "bench");
const OUT_DIR = path.join(ROOT, "src", "bench");
const CACHE_DIR = path.join(ROOT, ".pyodide-cache");

// The pin lives in the worker; this reads it from there rather than restating
// it, so a bench can never measure a different runtime than the reader runs.
const workerSource = await readFile(path.join(ROOT, "src/runtime/pyodideWorker.ts"), "utf8");
const pinned = workerSource.match(/const PYODIDE_VERSION = "([^"]+)"/)?.[1];
if (!pinned) throw new Error("could not read PYODIDE_VERSION out of src/runtime/pyodideWorker.ts");
if (pinned !== pyodideVersion) {
  throw new Error(
    `the worker pins Pyodide ${pinned} but node_modules has ${pyodideVersion}. ` +
      "The benches must run the reader's runtime; fix package.json, or re-run the " +
      "M0 spike and move the pin deliberately (CLAUDE.md, Pinned versions).",
  );
}

async function numpySource() {
  if (existsSync(CACHE_DIR)) {
    const wheel = (await readdir(CACHE_DIR)).find((f) => f.startsWith("numpy-") && f.endsWith(".whl"));
    if (wheel) return path.join(CACHE_DIR, wheel);
  }
  return "numpy";
}

const args = process.argv.slice(2);
const wanted = args.filter((a) => !a.startsWith("-"));

const benches = (await readdir(BENCH_DIR))
  .filter((f) => f.endsWith(".py"))
  .map((f) => f.replace(/\.py$/, ""))
  .filter((name) => wanted.length === 0 || wanted.includes(name))
  .sort();

if (benches.length === 0) {
  console.error(`no bench matched ${wanted.join(", ") || "(none)"} in tools/bench/`);
  process.exit(2);
}

const py = await loadPyodide({ stdout: (line) => console.log(line) });
await py.loadPackage(await numpySource());

// The same three registrations the worker performs, in the same order.
const register = (name, filename) => `
import sys, types
_mod = types.ModuleType("${name}")
_mod.__file__ = "${filename}"
exec(compile(_mod_src, "${filename}", "exec"), _mod.__dict__)
sys.modules["${name}"] = _mod
`;

py.globals.set("_mod_src", await readFile(path.join(ROOT, "src/python/reference_scribe.py"), "utf8"));
await py.runPythonAsync(register("reference_scribe", "reference_scribe.py"));
py.globals.set("_mod_src", await readFile(path.join(ROOT, "src/python/course_helpers.py"), "utf8"));
await py.runPythonAsync(register("course", "course_helpers.py"));

// The corpus, at the path the worker writes it to, so course.load_corpus()
// and every bench read it exactly as the tab does.
const corpus = await readFile(path.join(ROOT, "public/data/tinyshakespeare.txt"));
py.FS.writeFile("/tinyshakespeare.txt", new Uint8Array(corpus));

const runtime = await py.runPythonAsync(
  "import sys, numpy; f'Python {sys.version.split()[0]}, NumPy {numpy.__version__}'",
);
console.log(`# Pyodide ${pyodideVersion} (${runtime}), the pinned runtime\n`);

await mkdir(OUT_DIR, { recursive: true });
let failed = 0;
for (const name of benches) {
  console.log(`# ---- ${name} ${"-".repeat(Math.max(0, 60 - name.length))}`);
  const source = await readFile(path.join(BENCH_DIR, `${name}.py`), "utf8");
  try {
    py.globals.set("_bench_src", source);
    const resultJson = await py.runPythonAsync(`
_ns = {"__name__": "__bench__"}
exec(compile(_bench_src, "${name}.py", "exec"), _ns)
_ns["main"]()
`);
    // Deliberately no timestamp: CI asserts that a re-run reproduces the
    // committed file byte for byte, and a date would make that assertion fail
    // on every run and then get switched off. The commit that changed a
    // bench's numbers is the record of when they changed.
    const out = { bench: name, pyodide: pyodideVersion, ...JSON.parse(resultJson) };
    const file = path.join(OUT_DIR, `${name}.json`);
    await writeFile(file, `${JSON.stringify(out, null, 2)}\n`);
    console.log(`\n-> src/bench/${name}.json\n`);
  } catch (err) {
    failed++;
    console.error(`${name} FAILED:\n${err?.message ?? err}\n`);
  }
}

process.exit(failed ? 1 : 0);
