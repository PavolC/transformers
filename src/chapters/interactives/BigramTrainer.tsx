// Chapter 4's centerpiece: the learned tally trained live, in the tab, from a
// table of zeros, with its loss falling from the ceiling rung toward the
// counted rung and the table itself filling in beside the counted one.
//
// The training runs in the Pyodide worker on reference_scribe's own code
// path, the same functions the chapter's exercise solutions are sliced from,
// through the same train_driver. At the panel's starting settings and seed it
// is the computation tools/bench/chapter4.py records, so the number this
// panel ends on and the number in the prose are one number (CLAUDE.md,
// Decisions: benches run under the pinned Pyodide). Change a knob and the run
// is the reader's own, and the prose quotes none of it.
//
// tools/check_panels.py lifts TRAIN_BIGRAM out of this file and runs it
// natively with the corpus in place, so a driver that dies on a renamed
// function is caught before a reader presses Train.

import { useEffect, useRef, useState } from "react";
import { CORPUS_URL } from "../../runtime/assets";
import { sendRequest, terminateWorker } from "../../runtime/workerClient";
import { HeatPair } from "./HeatPair";

// The panel's starting settings. These are the bench's (tools/bench/chapter4.py
// reads them from the chapter's own constants), so the default run reproduces
// the chapter's numbers. Numeric constants only: check_panels substitutes them
// into the Python by name.
const DEFAULT_STEPS = 4000;
const DEFAULT_LR = 20;
const DEFAULT_SEED = 0;
const DEFAULT_BATCH = 16;
const DEFAULT_BLOCK = 32;
const REPORT_LOSS_EVERY = 10;
const REPORT_TABLE_EVERY = 100;

const LR_CHOICES = [2, 5, 10, 20, 50, 100, 200];
const STEP_CHOICES = [500, 1000, 2000, 4000];

const TRAIN_BIGRAM = `
import json
import numpy as np
import reference_scribe as rs
import course

_args = json.loads(_args_json) or {}
_steps = int(_args.get("steps", ${DEFAULT_STEPS}))
_lr = float(_args.get("lr", ${DEFAULT_LR}))
_seed = int(_args.get("seed", ${DEFAULT_SEED}))
_B = int(_args.get("batchSize", ${DEFAULT_BATCH}))
_T = int(_args.get("blockSize", ${DEFAULT_BLOCK}))

_text = course.load_corpus()
_chars, _stoi, _itos = rs.build_vocab(_text)
_ids = rs.encode(_text, _stoi)
_train, _val = rs.split_data(_ids)
_V = len(_chars)
_counts = rs.count_pairs(_train, _V)
_rung = rs.avg_surprise(rs.probs_from_tally(_counts, 1.0), _val)
with np.errstate(divide="ignore", invalid="ignore"):
    _counted = rs.probs_from_tally(_counts, 0.0)
_js_report(json.dumps({
    "kind": "start", "chars": _chars, "counted": np.round(_counted, 4).tolist(),
    "countedRungBits": _rung, "ceilingBits": float(np.log2(_V)), "steps": _steps,
}))

_params = rs.init_bigram(_V)
_losses = []
_pending = []

def _on_step(step, loss, params):
    _losses.append(loss)
    _pending.append(round(loss, 4))
    if step % ${REPORT_LOSS_EVERY} == 0 or step == _steps or step == 1:
        tick = {"kind": "tick", "step": step, "losses": list(_pending)}
        _pending.clear()
        if step % ${REPORT_TABLE_EVERY} == 0 or step == _steps or step == 1:
            tick["table"] = np.round(rs.softmax(params["table"], axis=-1), 4).tolist()
        _js_report(json.dumps(tick))

rs.train_driver(
    _params, _train,
    forward_fn=rs.bigram_forward, backward_fn=rs.bigram_backward,
    loss_fn=rs.cross_entropy, loss_backward_fn=rs.cross_entropy_backward,
    step_fn=rs.sgd_step, steps=_steps, batch_size=_B, block_size=_T, lr=_lr,
    rng=np.random.default_rng(_seed), on_step=_on_step,
)
_learned = rs.eval_driver(_params, _val, forward_fn=rs.bigram_forward,
                          loss_fn=rs.cross_entropy, block_size=_T)
json.dumps({
    "final_val_bits": _learned, "counted_val_bits": _rung,
    "first_bits": _losses[0], "last50_bits": float(np.mean(_losses[-50:])),
    "steps": _steps, "lr": _lr,
})
`;

interface StartReport {
  kind: "start";
  chars: string[];
  counted: number[][];
  countedRungBits: number;
  ceilingBits: number;
  steps: number;
}

interface TickReport {
  kind: "tick";
  step: number;
  losses: number[];
  table?: number[][];
}

interface Done {
  final_val_bits: number;
  counted_val_bits: number;
  first_bits: number;
  last50_bits: number;
  steps: number;
  lr: number;
}

type Phase = "idle" | "starting" | "training" | "done" | "error";

const PLOT_W = 520;
const PLOT_H = 190;
const PLOT_LEFT = 44;
const PLOT_RIGHT = 12;
const PLOT_TOP = 16;
const PLOT_BOTTOM = 26;
const Y_MAX = 7;

export function BigramTrainer() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [lrIdx, setLrIdx] = useState(LR_CHOICES.indexOf(DEFAULT_LR));
  const [stepsIdx, setStepsIdx] = useState(STEP_CHOICES.indexOf(DEFAULT_STEPS));
  const [start, setStart] = useState<StartReport | null>(null);
  const [losses, setLosses] = useState<number[]>([]);
  const [table, setTable] = useState<number[][] | null>(null);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<Done | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<number | null>(null);

  const lr = LR_CHOICES[lrIdx];
  const steps = STEP_CHOICES[stepsIdx];
  const running = phase === "starting" || phase === "training";

  useEffect(() => () => {
    if (requestRef.current !== null) terminateWorker();
  }, []);

  const begin = () => {
    setPhase("starting");
    setError(null);
    setDone(null);
    setLosses([]);
    setTable(null);
    setStep(0);
    setStatus("Starting the Python runtime...");
    requestRef.current = sendRequest(
      {
        type: "runPython",
        code: TRAIN_BIGRAM,
        args: { steps, lr, seed: DEFAULT_SEED, batchSize: DEFAULT_BATCH, blockSize: DEFAULT_BLOCK },
        dataUrl: CORPUS_URL,
      },
      (msg) => {
        if (msg.type === "status") setStatus(msg.text);
        else if (msg.type === "report") {
          const r = msg.payload as StartReport | TickReport;
          if (r.kind === "start") {
            setStart(r);
            setPhase("training");
          } else {
            setLosses((prev) => prev.concat(r.losses));
            setStep(r.step);
            if (r.table) setTable(r.table);
          }
        } else if (msg.type === "pythonDone") {
          requestRef.current = null;
          setDone(msg.result as Done);
          setPhase("done");
        } else if (msg.type === "error") {
          requestRef.current = null;
          setError(msg.message);
          setPhase("error");
        } else if (msg.type === "cancelled") {
          requestRef.current = null;
          setPhase("idle");
        }
      },
    );
  };

  const stop = () => {
    terminateWorker();
    requestRef.current = null;
    setPhase("idle");
  };

  // The plot: batch loss against step, on a fixed axis for the run's length,
  // with the two rungs the run is measured against drawn across it.
  const innerW = PLOT_W - PLOT_LEFT - PLOT_RIGHT;
  const innerH = PLOT_H - PLOT_TOP - PLOT_BOTTOM;
  const xMax = start?.steps ?? steps;
  const xOf = (s: number) => PLOT_LEFT + (s / xMax) * innerW;
  const yOf = (b: number) => PLOT_TOP + innerH - (Math.min(b, Y_MAX) / Y_MAX) * innerH;
  const path = losses
    .map((b, i) => `${i === 0 ? "M" : "L"}${xOf(i + 1).toFixed(1)} ${yOf(b).toFixed(1)}`)
    .join(" ");
  const ticksY = [0, 1, 2, 3, 4, 5, 6, 7];
  const ticksX = [0, xMax / 2, xMax];
  const last = losses.length ? losses[losses.length - 1] : null;

  const chars = start?.chars ?? [];
  const statusLine =
    phase === "idle"
      ? `Ready: learning rate ${lr}, ${steps.toLocaleString()} steps, batches of ${DEFAULT_BATCH} windows of ${DEFAULT_BLOCK}.`
      : phase === "starting"
        ? status || "Starting..."
        : phase === "training"
          ? `Step ${step.toLocaleString()} of ${xMax.toLocaleString()}: this batch cost ${last?.toFixed(4) ?? "..."} bits.`
          : phase === "done" && done
            ? `Done. Scored on every step of the held-back tenth: the learned table ${done.final_val_bits.toFixed(4)} bits, the counted tally ${done.counted_val_bits.toFixed(4)}. The first batch cost ${done.first_bits.toFixed(4)} and the last 50 steps averaged ${done.last50_bits.toFixed(4)}.`
            : "";

  return (
    <div className="interactive bigram-trainer">
      <p className="interactive-title">Training the table, live</p>
      <p className="interactive-legend">
        A 65 by 65 table of zeros, trained on the nine tenths of the corpus chapter 1
        counted: each step draws a batch, scores it, and moves every score against its
        slope. The plot is each batch's loss in bits against the step, with the ceiling and
        the counted tally's rung drawn across it. Below, the counted tally and the learned
        table on one colour scale, darker where the probability is higher; hover a cell to
        read both.
      </p>

      <div className="interactive-controls">
        <label className="slider-row">
          <span>learning rate</span>
          <input
            type="range"
            min={0}
            max={LR_CHOICES.length - 1}
            step={1}
            value={lrIdx}
            disabled={running}
            onChange={(e) => setLrIdx(Number(e.target.value))}
          />
          <code>{lr}</code>
        </label>
        <label className="slider-row">
          <span>steps</span>
          <input
            type="range"
            min={0}
            max={STEP_CHOICES.length - 1}
            step={1}
            value={stepsIdx}
            disabled={running}
            onChange={(e) => setStepsIdx(Number(e.target.value))}
          />
          <code>{steps}</code>
        </label>
        {running ? (
          <button className="button-secondary" onClick={stop}>
            Stop
          </button>
        ) : (
          <button onClick={begin}>{phase === "idle" ? "Train" : "Train again"}</button>
        )}
        <p className="interactive-status trainer-status" role="status">
          {statusLine}
        </p>
      </div>

      {error && (
        <p className="interactive-error">The run stopped with an error: {error}</p>
      )}

      <svg
        viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
        className="meter-plot"
        role="img"
        aria-label="Batch loss in bits against training step, with the ceiling and the counted tally's rung drawn across."
      >
        {ticksY.map((t) => (
          <g key={t}>
            <line x1={PLOT_LEFT} x2={PLOT_W - PLOT_RIGHT} y1={yOf(t)} y2={yOf(t)} className="chart-grid" />
            <text x={PLOT_LEFT - 6} y={yOf(t) + 4} textAnchor="end" className="chart-tick">
              {t}
            </text>
          </g>
        ))}
        {ticksX.map((t) => (
          <text key={t} x={xOf(t)} y={PLOT_H - 8} textAnchor="middle" className="chart-tick">
            {t.toLocaleString()}
          </text>
        ))}
        <text x={PLOT_LEFT} y={PLOT_TOP - 5} className="chart-axis-label">
          bits per character, this batch
        </text>
        {start && (
          <>
            <line x1={PLOT_LEFT} x2={PLOT_W - PLOT_RIGHT} y1={yOf(start.ceilingBits)} y2={yOf(start.ceilingBits)} className="ladder-rung" />
            <text x={PLOT_W - PLOT_RIGHT} y={yOf(start.ceilingBits) - 5} textAnchor="end" className="ladder-rung-label">
              the ceiling, {start.ceilingBits.toFixed(2)}
            </text>
            <line x1={PLOT_LEFT} x2={PLOT_W - PLOT_RIGHT} y1={yOf(start.countedRungBits)} y2={yOf(start.countedRungBits)} className="ladder-rung" />
            <text x={PLOT_W - PLOT_RIGHT} y={yOf(start.countedRungBits) + 13} textAnchor="end" className="ladder-rung-label">
              the counted tally, {start.countedRungBits.toFixed(2)}
            </text>
          </>
        )}
        {path && <path d={path} className="meter-plot-line" />}
      </svg>

      <HeatPair
        chars={chars.length ? chars : PLACEHOLDER_CHARS}
        left={{ title: "counted", probs: start?.counted ?? null }}
        right={{ title: "learned", probs: table }}
        idleText={
          start
            ? "Hover a cell to read the counted and the learned probability for that pair."
            : "Both grids fill in once training starts."
        }
      />
    </div>
  );
}

/** Sixty-five placeholders so the empty grids have the right size before the
 * worker has reported the vocabulary. */
const PLACEHOLDER_CHARS = Array.from({ length: 65 }, () => "·");
