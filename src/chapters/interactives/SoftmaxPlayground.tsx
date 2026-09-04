// Chapter 4's first interactive: four scores in, a guess list out. The reader
// drags a score and watches its share move, drags every score together and
// watches the list sharpen or flatten, and picks which character really came
// next to see what the list would be charged for it.
//
// Everything here is computed in JavaScript and none of it is quoted in the
// prose, which quotes tools/bench/chapter4.py (CLAUDE.md, two engines). The
// four characters and their starting scores are the chapter's hand row, so
// the panel opens on the numbers the reader has just worked by hand.

import { useState } from "react";

const CHARS = ["e", "a", "i", "o"];
const START = [2.0, 0.0, -2.0, 1.0];
const START_NEXT = 3;
const SCORE_MIN = -4;
const SCORE_MAX = 4;
const SCALES = [0.25, 0.5, 1, 2, 4];

function softmax(scores: number[]): { exps: number[]; sum: number; probs: number[] } {
  const m = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  // The exponentials shown are of the raw scores, since that is what the
  // hand computation uses; the shift only guards the arithmetic.
  const rawExps = scores.map((s) => Math.exp(s));
  return { exps: rawExps, sum: rawExps.reduce((a, b) => a + b, 0), probs: exps.map((e) => e / sum) };
}

export function SoftmaxPlayground() {
  const [scores, setScores] = useState<number[]>(START);
  const [scaleIdx, setScaleIdx] = useState(2);
  const [next, setNext] = useState(START_NEXT);
  const scale = SCALES[scaleIdx];
  const scaled = scores.map((s) => s * scale);
  const { exps, sum, probs } = softmax(scaled);
  const bits = -Math.log2(probs[next]);
  const favourite = probs.indexOf(Math.max(...probs));

  return (
    <div className="interactive softmax-playground">
      <p className="interactive-title">Scores into a guess list</p>
      <p className="interactive-legend">
        Four scores for four characters that might follow <code>h</code>. Each bar is that
        character's share of the guess list: e to the power of its score, over the total of
        all four such powers. The boxed character is the one that really came next, and the
        readout is what the list would be charged for it. The scale slider multiplies every
        score by the same number.
      </p>

      <div className="interactive-controls">
        {CHARS.map((ch, i) => (
          <label className="slider-row" key={ch}>
            <span>
              score for <code>{ch}</code>
            </span>
            <input
              type="range"
              min={SCORE_MIN}
              max={SCORE_MAX}
              step={0.1}
              value={scores[i]}
              onChange={(e) => {
                const v = Number(e.target.value);
                setScores((s) => s.map((x, j) => (j === i ? v : x)));
              }}
            />
            <code>{scores[i].toFixed(1)}</code>
          </label>
        ))}
        <label className="slider-row slider-row-wide">
          <span>scale every score by</span>
          <input
            type="range"
            min={0}
            max={SCALES.length - 1}
            step={1}
            value={scaleIdx}
            onChange={(e) => setScaleIdx(Number(e.target.value))}
          />
          <code>{scale}</code>
        </label>
        <button className="button-secondary" onClick={() => { setScores(START); setScaleIdx(2); setNext(START_NEXT); }}>
          Back to the hand row
        </button>
      </div>

      <div className="wheel-row">
        {CHARS.map((ch, i) => (
          <div className="wheel-bar-line" key={ch}>
            <button
              className={"softmax-pick" + (i === next ? " softmax-pick-next" : "")}
              aria-pressed={i === next}
              title={`Make ${ch} the character that really came next`}
              onClick={() => setNext(i)}
            >
              {ch}
            </button>
            <span className="wheel-bar-track">
              <span className="wheel-bar-fill" style={{ width: `${(probs[i] * 100).toFixed(2)}%` }} />
            </span>
            <span className="wheel-bar-value softmax-value">
              e<sup>{scaled[i].toFixed(1)}</sup> = {exps[i].toFixed(3)}, share {probs[i].toFixed(4)}
            </span>
          </div>
        ))}
      </div>

      <p className="interactive-status softmax-status" role="status">
        {`The four powers total ${sum.toFixed(3)} and the four shares total ${probs.reduce((a, b) => a + b, 0).toFixed(4)}. Favourite: ${CHARS[favourite]}. The real next character, ${CHARS[next]}, has share ${probs[next].toFixed(4)}, so this step would cost ${Number.isFinite(bits) ? bits.toFixed(3) : "∞"} bits.`}
      </p>
    </div>
  );
}
