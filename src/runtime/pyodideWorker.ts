/// <reference lib="webworker" />
// Pyodide worker: runs Python + NumPy off the main thread. Serves the
// workbench (one document against one section's tests, or against the
// scratch pad), first-party snippets from the interactives, the training
// protocol for the panels that train the scribe, and the older single-file
// test path. Requests are processed sequentially; every response echoes the
// request id.

import referenceScribeSource from "../python/reference_scribe.py?raw";
import courseHelpersSource from "../python/course_helpers.py?raw";
import harnessSource from "../python/harness.py?raw";
import type { WorkerRequest, WorkerResponse } from "./messages";

// Pinned Pyodide version (see CLAUDE.md). Do not bump without re-running the
// M0 feasibility spike (tools/spike/README.md).
const PYODIDE_VERSION = "314.0.5";
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// The id of the request currently being processed; the worker is
// single-threaded, so status/log lines always belong to this request.
let currentId = 0;

const post = (msg: WorkerResponse) => self.postMessage(msg);
const status = (text: string) => post({ type: "status", id: currentId, text });

// Until the runtime finishes booting, stdout is loader noise; afterwards it
// is the user's own print() output.
let bootDone = false;
const logStdout = (text: string) =>
  post({ type: "log", id: currentId, source: bootDone ? "stdout" : "runtime", text });
const logRuntime = (text: string) =>
  post({ type: "log", id: currentId, source: "runtime", text });

// Minimal typing for the parts of the Pyodide API we use.
interface Pyodide {
  loadPackage(name: string): Promise<void>;
  runPythonAsync(code: string): Promise<unknown>;
  globals: { set(name: string, value: unknown): void };
  FS: { writeFile(path: string, data: Uint8Array): void };
}

/** Put the `course` module back the way it was booted.
 *
 * Panels may swap a name on it so the learner's own function is what their
 * earlier code calls. The worker outlives every request, so those assignments
 * would persist across runs; a snapshot at boot, restored before every
 * request, ends that. (Course one shipped the bug this prevents.)
 */
const RESET_COURSE = `
import sys
_course = sys.modules["course"]
_course.__dict__.clear()
_course.__dict__.update(_course_snapshot)
`;

/** Register source text as a real module, so `import name` works and
 * tracebacks carry the file name. */
const registerModule = (name: string, filename: string) => `
import sys, types
_mod = types.ModuleType("${name}")
_mod.__file__ = "${filename}"
exec(compile(_mod_src, "${filename}", "exec"), _mod.__dict__)
sys.modules["${name}"] = _mod
`;

let pyodidePromise: Promise<Pyodide> | null = null;

function getPyodide(): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      // Not "first run only": pressing Stop discards the worker, so this runs
      // again on the next attempt. The browser cache is what makes the repeat
      // cheap, and that is what the reader needs told.
      status("Downloading the Python runtime (about 15 MB, then cached)...");
      const mod = await import(/* @vite-ignore */ `${PYODIDE_BASE_URL}pyodide.mjs`);
      const pyodide: Pyodide = await mod.loadPyodide({
        indexURL: PYODIDE_BASE_URL,
        stdout: (text: string) => logStdout(text),
        stderr: (text: string) => logStdout(text),
      });
      status("Loading NumPy...");
      await pyodide.loadPackage("numpy");
      const version = await pyodide.runPythonAsync(
        "import sys, numpy; f'Python {sys.version.split()[0]}, NumPy {numpy.__version__}'",
      );
      logRuntime(`Pyodide ${PYODIDE_VERSION} ready (${version})`);
      // Shared course Python: the reference scribe (registered as the
      // `reference_scribe` module), the helpers (registered as `course`, which
      // is what exercises import from and what the harness lends out of), and
      // the exercise test harness.
      pyodide.globals.set("_mod_src", referenceScribeSource);
      await pyodide.runPythonAsync(registerModule("reference_scribe", "reference_scribe.py"));
      pyodide.globals.set("_mod_src", courseHelpersSource);
      await pyodide.runPythonAsync(registerModule("course", "course_helpers.py"));
      await pyodide.runPythonAsync(`
import sys
_course_snapshot = dict(sys.modules["course"].__dict__)
`);
      await pyodide.runPythonAsync(harnessSource);
      bootDone = true;
      return pyodide;
    })();
    pyodidePromise.catch(() => {
      pyodidePromise = null; // allow retry after a failed load
    });
  }
  return pyodidePromise;
}

/** The path a fetched dataset lands on inside Pyodide: the URL's own file
 * name, with the .gz suffix dropped, at the root. So data/tinyshakespeare.txt
 * becomes /tinyshakespeare.txt, which is where course.load_corpus() and every
 * snippet in the course read it from. */
function datasetPath(dataUrl: string): string {
  const name = new URL(dataUrl, self.location.href).pathname.split("/").pop() || "dataset";
  return `/${name.replace(/\.gz$/, "")}`;
}

const fetched = new Set<string>();

async function fetchDataset(pyodide: Pyodide, dataUrl: string): Promise<void> {
  // Absolute or nothing. A relative URL here resolves against this worker's
  // own directory rather than the page's, and the site's base is "./", so a
  // relative dataUrl silently fetches the SPA fallback and writes index.html
  // into the dataset's path. Callers resolve on the main thread; this is the
  // assertion that they did.
  try {
    new URL(dataUrl);
  } catch {
    throw new Error(
      `dataset URL must be absolute, got ${dataUrl}: a relative URL in a ` +
        "worker resolves against the worker's own directory, not the page's",
    );
  }
  const path = datasetPath(dataUrl);
  if (fetched.has(path)) return;
  status(`Fetching ${path.slice(1)}...`);
  const resp = await fetch(dataUrl);
  if (!resp.ok) {
    throw new Error(`failed to fetch ${dataUrl}: HTTP ${resp.status}`);
  }
  // Some servers (Vite dev among them) serve .gz files with
  // Content-Encoding: gzip, so the browser has already decompressed the
  // body; others serve the raw bytes. Check the gzip magic and decompress
  // only if still compressed.
  let bytes = new Uint8Array(await resp.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  pyodide.FS.writeFile(path, bytes);
  fetched.add(path);
  const size =
    bytes.byteLength >= 1e6
      ? `${(bytes.byteLength / 1e6).toFixed(1)} MB`
      : `${Math.round(bytes.byteLength / 1e3)} kB`;
  logRuntime(`${path.slice(1)} loaded (${size})`);
}

// The training driver runs the reference scribe's own code path (the same
// functions the exercises' solutions are sliced from), streaming a tick every
// few steps. Chapter 11's assembly panel runs the learner's document instead;
// that variant arrives with chapter 11.
const TRAIN_DRIVER = `
import json, time
import numpy as np
import reference_scribe as rs
import course

def _train(params_json, on_tick):
    p = json.loads(params_json)
    text = course.load_corpus()
    chars, stoi, itos = rs.build_vocab(text)
    cfg = {
        "vocab_size": len(chars),
        "block_size": p["blockSize"],
        "n_embd": p["nEmbd"],
        "n_head": p["nHead"],
        "n_layer": p["nLayer"],
    }
    ids = rs.encode(text, stoi)
    train_ids, val_ids = rs.split_data(ids)
    counts = rs.bigram_counts(train_ids, len(chars))
    rung = rs.bigram_avg_surprise_bits(rs.bigram_probs(counts), val_ids)
    rng = np.random.default_rng(p["seed"])
    model = rs.init_params(cfg, rng)
    state = rs.adamw_init(model)
    n_params = int(sum(v.size for v in model.values()))
    B, T = p["batchSize"], p["blockSize"]
    t0 = time.time()
    for step in range(1, p["steps"] + 1):
        x, y = rs.get_batch(train_ids, T, B, rng)
        loss, grads = rs.loss_and_grads(model, x, y, cfg)
        rs.adamw_step(model, grads, state, step, lr=p["lr"])
        if step % 10 == 0 or step == p["steps"]:
            el = time.time() - t0
            tick = {
                "step": step, "steps": p["steps"],
                "lossBits": round(float(loss), 4),
                "tokensPerS": round(step * B * T / el),
                "elapsed": round(el, 1),
            }
            if step % 200 == 0 or step == p["steps"]:
                sample = rs.generate(model, cfg, rs.encode("\\n", stoi), 160,
                                     np.random.default_rng(5), temperature=0.8)
                tick["sample"] = rs.decode(sample, itos)
            on_tick(json.dumps(tick))
    seconds = time.time() - t0
    val = rs.eval_loss_bits(model, val_ids, cfg, np.random.default_rng(99))
    sample = rs.generate(model, cfg, rs.encode("\\n", stoi), 300,
                         np.random.default_rng(5), temperature=0.8)
    return json.dumps({
        "final_val_bits": round(float(val), 4),
        "bigram_rung_bits": round(float(rung), 4),
        "steps": p["steps"],
        "seconds": round(seconds, 1),
        "tokens_per_s": round(p["steps"] * B * T / seconds),
        "n_params": n_params,
        "sample": rs.decode(sample, itos),
    })
`;

async function train(msg: Extract<WorkerRequest, { type: "train" }>): Promise<void> {
  const pyodide = await getPyodide();
  await fetchDataset(pyodide, msg.dataUrl);
  await pyodide.runPythonAsync(TRAIN_DRIVER);
  const { id, type, dataUrl, ...params } = msg;
  void type;
  void dataUrl;
  for (const value of Object.values(params)) {
    if (!Number.isFinite(value)) throw new Error("invalid training parameter");
  }
  pyodide.globals.set("_train_params", JSON.stringify(params));
  pyodide.globals.set("_js_on_tick", (tickJson: string) =>
    post({ type: "trainTick", id, ...JSON.parse(tickJson) }),
  );
  status("Training...");
  const resultJson = (await pyodide.runPythonAsync(
    "_train(_train_params, _js_on_tick)",
  )) as string;
  post({ type: "trainDone", id, result: JSON.parse(resultJson) });
}

async function runDocument(
  msg: Extract<WorkerRequest, { type: "runDocument" }>,
): Promise<void> {
  const pyodide = await getPyodide();
  if (msg.dataUrl) await fetchDataset(pyodide, msg.dataUrl);
  status("Running tests...");
  pyodide.globals.set("_document", msg.document);
  pyodide.globals.set("_tests_code", msg.testsCode);
  pyodide.globals.set("_spec_json", JSON.stringify(msg.spec));
  const resultJson = (await pyodide.runPythonAsync(
    "run_document(_document, _tests_code, _spec_json)",
  )) as string;
  post({ type: "testsDone", id: msg.id, result: JSON.parse(resultJson) });
}

async function runDocumentScratch(
  msg: Extract<WorkerRequest, { type: "runDocumentScratch" }>,
): Promise<void> {
  const pyodide = await getPyodide();
  await fetchDataset(pyodide, msg.dataUrl);
  status("Running your code...");
  pyodide.globals.set("_document", msg.document);
  pyodide.globals.set("_scratch_code", msg.scratchCode);
  pyodide.globals.set("_spec_json", JSON.stringify(msg.spec));
  const resultJson = (await pyodide.runPythonAsync(
    "run_document_scratch(_document, _scratch_code, _spec_json)",
  )) as string;
  post({ type: "pythonDone", id: msg.id, result: JSON.parse(resultJson) });
}

async function runTests(msg: Extract<WorkerRequest, { type: "runTests" }>): Promise<void> {
  const pyodide = await getPyodide();
  status("Running tests...");
  pyodide.globals.set("_learner_code", msg.learnerCode);
  pyodide.globals.set("_tests_code", msg.testsCode);
  const resultJson = (await pyodide.runPythonAsync(
    "run_exercise(_learner_code, _tests_code)",
  )) as string;
  post({ type: "testsDone", id: msg.id, result: JSON.parse(resultJson) });
}

async function runPython(msg: Extract<WorkerRequest, { type: "runPython" }>): Promise<void> {
  const pyodide = await getPyodide();
  if (msg.dataUrl) await fetchDataset(pyodide, msg.dataUrl);
  pyodide.globals.set("_args_json", JSON.stringify(msg.args ?? null));
  pyodide.globals.set("_js_report", (payloadJson: string) =>
    post({ type: "report", id: msg.id, payload: JSON.parse(payloadJson) }),
  );
  const resultJson = (await pyodide.runPythonAsync(msg.code)) as string;
  post({ type: "pythonDone", id: msg.id, result: JSON.parse(resultJson) });
}

function dispatch(msg: WorkerRequest): Promise<void> {
  switch (msg.type) {
    case "train":
      return train(msg);
    case "runTests":
      return runTests(msg);
    case "runDocument":
      return runDocument(msg);
    case "runDocumentScratch":
      return runDocumentScratch(msg);
    default:
      return runPython(msg);
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  currentId = msg.id;
  // Whatever the last request did to `course`, this one starts from boot.
  const job = getPyodide()
    .then((pyodide) => pyodide.runPythonAsync(RESET_COURSE))
    .then(() => dispatch(msg));
  job.catch((err) =>
    post({
      type: "error",
      id: msg.id,
      message: err instanceof Error ? err.message : String(err),
    }),
  );
};
