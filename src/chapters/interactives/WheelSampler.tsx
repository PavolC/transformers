// Chapter 1's second interactive: the corpus tally writing text, one drawn
// character at a time, with the row it is drawing from on screen beside it.
//
// The row is drawn as proportional bars (the plot family's job: natural
// scale, no fixed grid), because what matters here is the shape of one row
// rather than the whole 65 by 65 table. The counts are integers computed in
// JavaScript, so they match the Python bench exactly; the DRAWS do not, since
// the two engines have different generators, and no sampled text from this
// panel is ever quoted in the prose (CLAUDE.md, "Numbers").

import { useEffect, useMemo, useRef, useState } from "react";
import { loadCorpus } from "../../runtime/assets";
import { charLabel, charName, mulberry32 } from "./utils";

const SPEED_MS = 55;
const KEEP = 420;

interface Tally {
  chars: string[];
  index: Map<string, number>;
  /** counts[a][b], and rowTotals[a], over the whole corpus. */
  counts: Int32Array;
  rowTotals: Int32Array;
}

function buildTally(text: string): Tally {
  const chars = [...new Set(text)].sort();
  const index = new Map(chars.map((c, i) => [c, i] as const));
  const v = chars.length;
  const counts = new Int32Array(v * v);
  const rowTotals = new Int32Array(v);
  let prev = index.get(text[0])!;
  for (let i = 1; i < text.length; i++) {
    const cur = index.get(text[i])!;
    counts[prev * v + cur] += 1;
    rowTotals[prev] += 1;
    prev = cur;
  }
  return { chars, index, counts, rowTotals };
}

export function WheelSampler() {
  const [tally, setTally] = useState<Tally | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [text, setText] = useState("");
  const [current, setCurrent] = useState<number | null>(null);
  const [mode, setMode] = useState<"draw" | "favourite">("draw");
  const draw = useRef(mulberry32(20260831));

  useEffect(() => {
    let live = true;
    loadCorpus()
      .then((corpus) => {
        if (!live) return;
        const built = buildTally(corpus);
        setTally(built);
        setCurrent(built.index.get("\n") ?? 0);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      live = false;
    };
  }, []);

  // One step: draw from the current character's row (or take its favourite),
  // append the answer, and make it the new current character.
  useEffect(() => {
    if (!running || !tally || current === null) return;
    const v = tally.chars.length;
    const timer = window.setInterval(() => {
      setCurrent((cur) => {
        if (cur === null) return cur;
        const base = cur * v;
        const total = tally.rowTotals[cur];
        let next = 0;
        if (total === 0) {
          next = Math.floor(draw.current() * v);
        } else if (mode === "favourite") {
          let best = 0;
          for (let i = 1; i < v; i++) {
            if (tally.counts[base + i] > tally.counts[base + best]) best = i;
          }
          next = best;
        } else {
          let ticket = draw.current() * total;
          for (let i = 0; i < v; i++) {
            ticket -= tally.counts[base + i];
            if (ticket <= 0) {
              next = i;
              break;
            }
          }
        }
        setText((t) => (t + tally.chars[next]).slice(-KEEP));
        return next;
      });
    }, SPEED_MS);
    return () => window.clearInterval(timer);
  }, [running, tally, current, mode]);

  const row = useMemo(() => {
    if (!tally || current === null) return [];
    const v = tally.chars.length;
    const base = current * v;
    const total = tally.rowTotals[current] || 1;
    return tally.chars
      .map((ch, i) => ({ ch, count: tally.counts[base + i], share: tally.counts[base + i] / total }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [tally, current]);

  const currentChar = tally && current !== null ? tally.chars[current] : null;
  const widest = row.length ? row[0].share : 1;

  return (
    <div className="panel wheel-sampler">
      <p className="panel-title">Writing with the corpus tally</p>
      <p className="panel-legend">
        The bars are the row for the character just written: its counted successors, the
        longest bar the most common. Drawing picks a bar in proportion to its length;
        whatever comes up is written down and becomes the next row to draw from.
      </p>

      {error && (
        <p className="panel-error">
          The corpus did not load ({error}). The tally needs it, so this panel stays empty.
        </p>
      )}

      <div className="control-row">
        <span className="control-buttons">
          <button onClick={() => setRunning((r) => !r)} disabled={!tally}>
            {running ? "Pause" : text ? "Keep writing" : "Start writing"}
          </button>
          <button
            className="button-secondary"
            onClick={() => {
              setText("");
              draw.current = mulberry32(20260831);
              if (tally) setCurrent(tally.index.get("\n") ?? 0);
            }}
            disabled={!tally || !text}
          >
            Clear
          </button>
        </span>
        <label className="control control-inline">
          <input
            type="checkbox"
            checked={mode === "favourite"}
            onChange={(e) => setMode(e.target.checked ? "favourite" : "draw")}
          />
          <span className="control-label">Always take the longest bar</span>
        </label>
      </div>
      <p className="wheel-status" role="status">
        {!tally
          ? "Loading the corpus..."
          : mode === "favourite"
            ? "Taking the favourite every time, which is where it gets stuck."
            : `Drawing in proportion. Now writing from ${charName(currentChar ?? "")}.`}
      </p>

      <div className="wheel-row">
        {row.length === 0 && <p className="wheel-empty">No counted successors for this character.</p>}
        {row.map((entry) => (
          <div className="wheel-bar-line" key={entry.ch}>
            <span className="wheel-bar-char">{charLabel(entry.ch)}</span>
            <span className="wheel-bar-track">
              <span
                className="wheel-bar-fill"
                style={{ width: `${(entry.share / widest) * 100}%` }}
              />
            </span>
            <span className="wheel-bar-value">
              {entry.count.toLocaleString()} ({(entry.share * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>

      <pre className="wheel-output" aria-live="off">
        {text || " "}
      </pre>
    </div>
  );
}
