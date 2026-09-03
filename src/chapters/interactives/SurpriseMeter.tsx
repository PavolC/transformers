// Chapter 3's centerpiece: the tally reading the held-back tenth one
// character at a time, charged in bits for each guess, with the running
// average settling as it goes.
//
// The tally is counted here, in JavaScript, over the same nine tenths chapter
// 1 counted, so the counts and probabilities agree with the Python bench (the
// counts are integers, and a ratio of integers is the same in both engines).
// The prose quotes the bench's numbers and never this panel's, per the
// two-engines rule in CLAUDE.md; the dashed line on the plot is this panel's
// own average over the whole tenth, computed here.
//
// It opens UNSMOOTHED, and the chapter turns smoothing on only after the
// reader has jumped to the first pair the counting never saw and watched the
// average go to infinity. That order is the beat (succeed, break, fix), so
// the default here is not a bug.

import { useEffect, useMemo, useState } from "react";
import { loadCorpus } from "../../runtime/assets";
import { charLabel, vocabOf } from "./utils";

const STRIP_BEHIND = 36;
const STRIP_AHEAD = 8;
const TICK_MS = 40;
const STEPS_PER_TICK = 3;
const PLOT_W = 520;
const PLOT_H = 170;
const PLOT_LEFT = 44;
const PLOT_RIGHT = 12;
const PLOT_TOP = 14;
const PLOT_BOTTOM = 26;
const Y_MAX = 8; // bits shown; larger values are drawn at the top edge
const POINTS = 360;

interface Model {
  chars: string[];
  val: Int32Array;
  /** Per step (there are val.length - 1), the surprise with and without
   * smoothing, and their running sums. Infinity is a legitimate value. */
  smoothedBits: Float64Array;
  rawBits: Float64Array;
  smoothedCum: Float64Array;
  rawCum: Float64Array;
  /** Per step, the training count of the pair and the row's total. */
  pairCount: Int32Array;
  rowTotal: Int32Array;
  firstUnseen: number;
  fullAverage: number;
}

function build(text: string): Model {
  const { chars, index } = vocabOf(text);
  const V = chars.length;
  const nVal = Math.floor(text.length / 10);
  const trainEnd = text.length - nVal;
  const counts = new Int32Array(V * V);
  const totals = new Int32Array(V);
  let prev = index.get(text[0])!;
  for (let i = 1; i < trainEnd; i++) {
    const cur = index.get(text[i])!;
    counts[prev * V + cur] += 1;
    totals[prev] += 1;
    prev = cur;
  }
  const val = new Int32Array(nVal);
  for (let i = 0; i < nVal; i++) val[i] = index.get(text[trainEnd + i])!;
  const steps = nVal - 1;
  const smoothedBits = new Float64Array(steps);
  const rawBits = new Float64Array(steps);
  const smoothedCum = new Float64Array(steps);
  const rawCum = new Float64Array(steps);
  const pairCount = new Int32Array(steps);
  const rowTotal = new Int32Array(steps);
  let firstUnseen = -1;
  let sS = 0;
  let sR = 0;
  for (let i = 0; i < steps; i++) {
    const a = val[i];
    const b = val[i + 1];
    const c = counts[a * V + b];
    const t = totals[a];
    pairCount[i] = c;
    rowTotal[i] = t;
    const smoothed = -Math.log2((c + 1) / (t + V));
    const raw = c === 0 ? Infinity : -Math.log2(c / t);
    if (c === 0 && firstUnseen < 0) firstUnseen = i;
    smoothedBits[i] = smoothed;
    rawBits[i] = raw;
    sS += smoothed;
    sR += raw;
    smoothedCum[i] = sS;
    rawCum[i] = sR;
  }
  return {
    chars,
    val,
    smoothedBits,
    rawBits,
    smoothedCum,
    rawCum,
    pairCount,
    rowTotal,
    firstUnseen,
    fullAverage: sS / steps,
  };
}

function fmtBits(x: number) {
  return Number.isFinite(x) ? x.toFixed(3) : "∞";
}

function fmtProb(x: number) {
  if (x === 0) return "0";
  return x >= 0.001 ? x.toFixed(4) : x.toExponential(2);
}

export function SurpriseMeter() {
  const [model, setModel] = useState<Model | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState(0);
  const [running, setRunning] = useState(false);
  const [smoothing, setSmoothing] = useState(false);

  useEffect(() => {
    let live = true;
    loadCorpus()
      .then((text) => {
        if (live) setModel(build(text));
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      live = false;
    };
  }, []);

  const steps = model ? model.val.length - 1 : 0;

  useEffect(() => {
    if (!running || !model) return;
    const timer = window.setInterval(() => {
      setPos((p) => {
        const next = Math.min(p + STEPS_PER_TICK, steps - 1);
        if (next >= steps - 1) setRunning(false);
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [running, model, steps]);

  const bits = model ? (smoothing ? model.smoothedBits : model.rawBits) : null;
  const cum = model ? (smoothing ? model.smoothedCum : model.rawCum) : null;
  const running_avg = cum ? cum[pos] / (pos + 1) : NaN;

  // The plot's path: the running average at up to POINTS positions between 0
  // and pos, on an x axis that grows in whole windows so the curve does not
  // rescale on every step.
  const plot = useMemo(() => {
    if (!cum) return null;
    const xMax = Math.max(200, Math.ceil((pos + 1) / 200) * 200);
    const innerW = PLOT_W - PLOT_LEFT - PLOT_RIGHT;
    const innerH = PLOT_H - PLOT_TOP - PLOT_BOTTOM;
    const xOf = (i: number) => PLOT_LEFT + (i / xMax) * innerW;
    const yOf = (b: number) =>
      PLOT_TOP + innerH - (Math.min(Number.isFinite(b) ? b : Y_MAX, Y_MAX) / Y_MAX) * innerH;
    const n = Math.min(POINTS, pos + 1);
    const parts: string[] = [];
    for (let k = 0; k < n; k++) {
      const i = n === 1 ? 0 : Math.round((k * pos) / (n - 1));
      const avg = cum[i] / (i + 1);
      parts.push(`${k === 0 ? "M" : "L"}${xOf(i).toFixed(1)} ${yOf(avg).toFixed(1)}`);
    }
    const ticksY = [0, 2, 4, 6, 8];
    const ticksX = [0, xMax / 2, xMax];
    return { d: parts.join(" "), xMax, xOf, yOf, ticksY, ticksX, innerW, innerH };
  }, [cum, pos]);

  const strip = useMemo(() => {
    if (!model) return null;
    const label = (i: number) => (i >= 0 && i < model.val.length ? charLabel(model.chars[model.val[i]]) : " ");
    const behind: string[] = [];
    for (let i = pos - STRIP_BEHIND; i < pos; i++) behind.push(label(i));
    const ahead: string[] = [];
    for (let i = pos + 2; i < pos + 2 + STRIP_AHEAD; i++) ahead.push(label(i));
    return { behind: behind.join(""), current: label(pos), next: label(pos + 1), ahead: ahead.join("") };
  }, [model, pos]);

  const atEnd = pos >= steps - 1;

  return (
    <div className="interactive">
      <p className="interactive-title">The surprise meter</p>
      <p className="interactive-legend">
        The tally reads the held-back tenth of the corpus one character at a time. The
        highlighted character is the one just read, the boxed one is what actually came
        next, and the readout is what the tally's row gave that next character: its
        probability, the surprise in bits, and the average so far. The plot is that
        average against how far the reading has got, and once smoothing is on, the dashed
        line is the average over the whole tenth.
      </p>

      {error && (
        <p className="interactive-error">
          The corpus did not load ({error}), so there is no text to read.
        </p>
      )}

      <p className="meter-strip" aria-hidden="true">
        <span className="meter-strip-read">{strip?.behind ?? " ".repeat(STRIP_BEHIND)}</span>
        <span className="meter-strip-current">{strip?.current ?? " "}</span>
        <span className="meter-strip-next">{strip?.next ?? " "}</span>
        <span className="meter-strip-ahead">{strip?.ahead ?? " ".repeat(STRIP_AHEAD)}</span>
      </p>

      <div className="meter-readout" role="status">
        <div className="meter-item">
          <span className="meter-item-label">this step</span>
          <span className="meter-item-value">
            {model && strip
              ? `after ${strip.current} comes ${strip.next}`
              : "loading"}
          </span>
        </div>
        <div className="meter-item">
          <span className="meter-item-label">probability the row gave it</span>
          <span className="meter-item-value">
            {model
              ? smoothing
                ? `${fmtProb((model.pairCount[pos] + 1) / (model.rowTotal[pos] + model.chars.length))} = (${model.pairCount[pos].toLocaleString()} + 1) / (${model.rowTotal[pos].toLocaleString()} + ${model.chars.length})`
                : `${fmtProb(model.rowTotal[pos] ? model.pairCount[pos] / model.rowTotal[pos] : 0)} = ${model.pairCount[pos].toLocaleString()} / ${model.rowTotal[pos].toLocaleString()}`
              : ""}
          </span>
        </div>
        <div className="meter-item">
          <span className="meter-item-label">surprise</span>
          <span className="meter-item-value">{bits ? `${fmtBits(bits[pos])} bits` : ""}</span>
        </div>
        <div className="meter-item">
          <span className="meter-item-label">average over {(pos + 1).toLocaleString()} {pos === 0 ? "step" : "steps"}</span>
          <span className="meter-item-value">{model ? `${fmtBits(running_avg)} bits` : ""}</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} className="meter-plot" role="img" aria-label="Running average surprise, in bits, against position in the held-back text.">
        {plot && (
          <>
            {plot.ticksY.map((t) => (
              <g key={t}>
                <line x1={PLOT_LEFT} x2={PLOT_W - PLOT_RIGHT} y1={plot.yOf(t)} y2={plot.yOf(t)} className="chart-grid" />
                <text x={PLOT_LEFT - 6} y={plot.yOf(t) + 4} textAnchor="end" className="chart-tick">
                  {t}
                </text>
              </g>
            ))}
            {plot.ticksX.map((t) => (
              <text key={t} x={plot.xOf(t)} y={PLOT_H - 8} textAnchor="middle" className="chart-tick">
                {t.toLocaleString()}
              </text>
            ))}
            <text x={PLOT_LEFT} y={PLOT_TOP - 4} className="chart-axis-label">
              bits, running average
            </text>
            {model && smoothing && (
              <line
                x1={PLOT_LEFT}
                x2={PLOT_W - PLOT_RIGHT}
                y1={plot.yOf(model.fullAverage)}
                y2={plot.yOf(model.fullAverage)}
                className="meter-plot-mean"
              />
            )}
            <path d={plot.d} className="meter-plot-line" />
          </>
        )}
      </svg>

      <p className="interactive-status meter-status">
        {model
          ? `Step ${pos.toLocaleString()}, of steps 0 to ${(steps - 1).toLocaleString()}. Smoothing is ${smoothing ? "on: every cell of the tally carries one extra count" : "off: probabilities are the raw counts divided by the row total"}.`
          : "Loading the corpus..."}
      </p>

      <div className="interactive-controls">
        <button onClick={() => setPos((p) => Math.min(p + 1, steps - 1))} disabled={!model || atEnd}>
          Step
        </button>
        <button onClick={() => setRunning((r) => !r)} disabled={!model || atEnd}>
          {running ? "Pause" : "Run"}
        </button>
        <button
          className="button-secondary"
          onClick={() => {
            setRunning(false);
            if (model) setPos(model.firstUnseen);
          }}
          disabled={!model}
        >
          Jump to the first pair the counting never saw
        </button>
        <button
          className="button-secondary"
          onClick={() => setSmoothing((s) => !s)}
          disabled={!model}
        >
          {smoothing ? "Turn smoothing off" : "Turn smoothing on (add 1 to every cell)"}
        </button>
        <button
          className="button-secondary"
          onClick={() => {
            setRunning(false);
            setPos(0);
          }}
          disabled={!model || pos === 0}
        >
          Back to the start
        </button>
      </div>
    </div>
  );
}
