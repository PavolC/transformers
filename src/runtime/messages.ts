// Message protocol between the main thread and the Pyodide worker.
// Every request carries an id; every response echoes the id of the request
// it belongs to, so multiple UI components can share one worker.

/** Knobs for an in-tab training run of the reference scribe. The defaults the
 * panels pass come from the M0 spike's proven envelope (tools/spike/README.md);
 * chapter 10's panel constrains what the reader can raise them to. */
export interface TrainParams {
  steps: number;
  blockSize: number;
  nEmbd: number;
  nHead: number;
  nLayer: number;
  batchSize: number;
  lr: number;
  seed: number;
}

/** The line ranges the harness needs to say which section a failure came
 * from. Worked out on this side, because the document format has exactly one
 * parser (src/state/workbenchDoc.ts). */
export interface SectionRange {
  id: string;
  label: string;
  kind: string;
  start: number;
  end: number;
}

export interface RunSpec {
  /** The section whose tests are running. */
  target: string;
  sections: SectionRange[];
  /** Names the course lends because the learner has not written them yet. */
  lend: string[];
}

export type WorkerRequest =
  | ({ type: "train"; id: number; dataUrl: string } & TrainParams)
  | { type: "runTests"; id: number; learnerCode: string; testsCode: string }
  // The workbench: one document, one section's tests, and the map that says
  // which lines belong to which section.
  | {
      type: "runDocument";
      id: number;
      document: string;
      testsCode: string;
      spec: RunSpec;
      dataUrl?: string;
    }
  // The scratch pad's run: the whole document, then the scratch pad, in one
  // namespace. dataUrl is required rather than optional, and that is the
  // point: the scratch pad is where the prompts' snippets land, every one of
  // them opens with load_corpus(), and the pad belongs to no exercise, so
  // there is nothing to read a dataset off. Making the field required puts
  // the corpus in the runtime by construction instead of by remembering.
  | {
      type: "runDocumentScratch";
      id: number;
      document: string;
      scratchCode: string;
      spec: RunSpec;
      dataUrl: string;
    }
  // First-party Python snippets from interactives. The snippet reads its
  // input by json.loads(_args_json), may stream progress via
  // _js_report(json_string), and must evaluate to a JSON string. When
  // dataUrl is set, the corpus is fetched first and written to
  // /tinyshakespeare.txt before the snippet runs.
  | { type: "runPython"; id: number; code: string; args?: unknown; dataUrl?: string };

/** One training tick, every few steps: the loss in bits, the pace, and every
 * so often a fresh sample of the scribe's writing. */
export interface TrainTick {
  step: number;
  steps: number;
  lossBits: number;
  tokensPerS: number;
  elapsed: number;
  sample?: string;
}

export interface TrainResult {
  final_val_bits: number;
  bigram_rung_bits: number;
  steps: number;
  seconds: number;
  tokens_per_s: number;
  n_params: number;
  sample: string;
}

export interface TestResultEntry {
  name: string;
  title: string;
  passed: boolean;
  message: string;
  /** The section a crash came from, when it was not this one. */
  section?: string | null;
}

export interface TestRunResult {
  setup_error: {
    message: string;
    line: number | null;
    section?: string | null;
  } | null;
  tests: TestResultEntry[];
  passed: boolean;
  /** Names the course supplied because their section is not written yet. An
   * empty list is the reward: the run was entirely the learner's own code. */
  lent?: string[];
}

export interface ScratchRunResult {
  error: { message: string; line: number | null; label?: string | null } | null;
  lent?: string[];
}

export type WorkerResponse =
  | { type: "status"; id: number; text: string }
  // source "stdout" is the user's own prints; "runtime" is loader noise
  // (Pyodide boot, package downloads, dataset fetches).
  | { type: "log"; id: number; source: "runtime" | "stdout"; text: string }
  | ({ type: "trainTick"; id: number } & TrainTick)
  | { type: "trainDone"; id: number; result: TrainResult }
  | { type: "testsDone"; id: number; result: TestRunResult }
  | { type: "report"; id: number; payload: unknown }
  | { type: "pythonDone"; id: number; result: unknown }
  // The reader pressed Stop. Distinct from "error" so the UI can return to
  // idle instead of reporting a fault the reader caused on purpose.
  | { type: "cancelled"; id: number }
  | { type: "error"; id: number; message: string };
