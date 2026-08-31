// Chapter 1's first interactive: the tally being built, one pair at a time,
// on the line the chapter opens with.
//
// The grid family (CLAUDE.md, figure geometry): fixed cell size, the count in
// the cell, the cell's fill a share of the accent so the shape of the table
// reads before any number does. On a narrow screen the grid keeps its width
// and pans inside the figure's scroll wrapper rather than shrinking its
// labels.
//
// It computes its own counts in JavaScript, which is safe for integers: the
// tally is addition, so this panel and the Python bench agree exactly. The
// prose quotes tools/bench/chapter1.py all the same, and never this panel.

import { useMemo, useState } from "react";
import { charLabel, cellFill } from "./utils";

const LINE = "to be, or not to be";

export function TallyBuilder() {
  // How many of the line's pairs have been counted so far. Starts at the end,
  // so a reader who never touches the control still sees the finished tally
  // (and can walk it back to watch it fill).
  const pairCount = LINE.length - 1;
  const [step, setStep] = useState(pairCount);

  const chars = useMemo(() => [...new Set(LINE)].sort(), []);
  const index = useMemo(
    () => new Map(chars.map((c, i) => [c, i] as const)),
    [chars],
  );

  const counts = useMemo(() => {
    const table = chars.map(() => chars.map(() => 0));
    for (let i = 0; i < step; i++) {
      table[index.get(LINE[i])!][index.get(LINE[i + 1])!] += 1;
    }
    return table;
  }, [chars, index, step]);

  const max = Math.max(1, ...counts.flat());
  const rowTotals = counts.map((row) => row.reduce((a, b) => a + b, 0));

  // The pair about to be counted, which is the one the line highlights.
  const at = Math.min(step, pairCount - 1);
  const before = LINE[at];
  const after = LINE[at + 1];
  const done = step >= pairCount;

  return (
    <div className="interactive tally-builder">
      <p className="interactive-title">The tally, built one pair at a time</p>
      <p className="interactive-legend">
        Each cell counts how often the column's character followed the row's. A space is
        drawn <code>{charLabel(" ")}</code>. Darker means counted more often; the row
        totals on the right are how many times that character was followed by anything.
      </p>

      <p className="tally-line" aria-label={`The line, with ${step} of ${pairCount} pairs counted`}>
        {[...LINE].map((ch, i) => {
          const isBefore = !done && i === at;
          const isAfter = !done && i === at + 1;
          return (
            <span
              key={i}
              className={
                "tally-line-char" +
                (i < step + 1 ? " tally-line-read" : "") +
                (isBefore ? " tally-line-before" : "") +
                (isAfter ? " tally-line-after" : "")
              }
            >
              {charLabel(ch)}
            </span>
          );
        })}
      </p>

      <p className="interactive-status tally-status" role="status">
        {done
          ? `All ${pairCount} pairs counted.`
          : `Pair ${step + 1} of ${pairCount}: ${charLabel(before)} then ${charLabel(after)}.`}
      </p>

      <div className="interactive-controls">
        <label className="slider-row slider-row-wide">
          <span>Pairs counted</span>
          <input
            type="range"
            min={0}
            max={pairCount}
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
          />
          <code>
            {step}/{pairCount}
          </code>
        </label>
        <button className="button-secondary" onClick={() => setStep(0)} disabled={step === 0}>
          Start over
        </button>
        <button
          className="button-secondary"
          onClick={() => setStep((s) => Math.min(pairCount, s + 1))}
          disabled={done}
        >
          Count the next pair
        </button>
      </div>

      <div className="table-scroll scroll-x" tabIndex={0}>
        <table className="tally-grid">
          <caption className="sr-only">
            The pair tally for the line, {step} of {pairCount} pairs counted
          </caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="tally-corner">then →</span>
              </th>
              {chars.map((c) => (
                <th scope="col" key={c}>
                  {charLabel(c)}
                </th>
              ))}
              <th scope="col" className="tally-total-head">
                total
              </th>
            </tr>
          </thead>
          <tbody>
            {chars.map((rowChar, r) => (
              <tr key={rowChar}>
                <th scope="row">{charLabel(rowChar)}</th>
                {chars.map((colChar, c) => {
                  const n = counts[r][c];
                  const isJust = !done && rowChar === before && colChar === after;
                  return (
                    <td
                      key={colChar}
                      className={"tally-cell" + (isJust ? " tally-cell-next" : "")}
                      style={{ background: cellFill(n, max) }}
                    >
                      {n === 0 ? <span className="tally-zero">·</span> : n}
                    </td>
                  );
                })}
                <td className="tally-total">{rowTotals[r] || <span className="tally-zero">·</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
