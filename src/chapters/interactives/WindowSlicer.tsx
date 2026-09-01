// Chapter 2's centerpiece: one window cut out of the corpus, with the
// targets that go with it and the T training examples hiding inside it.
//
// Everything here is a slice of the same text and a lookup in the same sorted
// vocabulary, so the ids and the characters agree with the Python bench
// exactly; no generator runs in this panel. It opens on the window the
// chapter walks through (the offset comes from the committed bench), so the
// reader can compare the panel against the prose before moving it.
//
// The grid family for the two rows of cells, read down rather than across: a
// column is one training example. On a narrow screen the rows pan inside
// their scroll wrapper rather than reflowing, because a window that wrapped
// would stop being a window.

import { useEffect, useMemo, useRef, useState } from "react";
import { loadCorpus } from "../../runtime/assets";
import { charLabel, mulberry32, vocabOf } from "./utils";
import bench from "../../bench/chapter2.json";

const MIN_T = 4;
const MAX_T = 16;

/** Where the chapter's own worked window starts, from the bench that produced
 * it. The training text is the corpus's first nine tenths, so the same offset
 * into the whole corpus reads the same characters. */
const CHAPTER_START = bench.window.start;

interface Loaded {
  text: string;
  chars: string[];
  index: Map<string, number>;
  /** The nine tenths a model may read, which is where the windows come from
   * (the same split as split_data: a tenth held back, rounded down). */
  trainChars: number;
}

export function WindowSlicer() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState(CHAPTER_START);
  const [blockSize, setBlockSize] = useState(bench.window.block_size);
  const jump = useRef(mulberry32(20260902));

  useEffect(() => {
    let live = true;
    loadCorpus()
      .then((text) => {
        if (!live) return;
        const { chars, index } = vocabOf(text);
        setData({ text, chars, index, trainChars: text.length - Math.floor(text.length / 10) });
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      live = false;
    };
  }, []);

  const maxStart = data ? data.trainChars - blockSize - 2 : CHAPTER_START;
  const at = Math.min(start, maxStart);

  const cut = useMemo(() => {
    if (!data) return null;
    const x = [...data.text.slice(at, at + blockSize)];
    const y = [...data.text.slice(at + 1, at + blockSize + 1)];
    return {
      x,
      y,
      xIds: x.map((c) => data.index.get(c)!),
      yIds: y.map((c) => data.index.get(c)!),
      // Eight characters either side. Wider flanks push the line past a
      // 375px screen at the longest window the slider offers, and the strip
      // clips on the right, which is where the window's own tail sits.
      before: data.text.slice(Math.max(0, at - 8), at),
      after: data.text.slice(at + blockSize + 1, at + blockSize + 9),
    };
  }, [data, at, blockSize]);

  const columns = Array.from({ length: blockSize }, (_, t) => t);

  return (
    <div className="interactive window-slicer">
      <p className="interactive-title">One window, and the examples inside it</p>
      <p className="interactive-legend">
        The two rows are the arrays a batch is made of: <code>x</code> is the window, and{" "}
        <code>y</code> is the character that actually followed each position. Read down a
        column rather than across: column <code>t</code> is one training example, and the
        cell under it is what came next. What a model may look at is that column and
        everything left of it. The last cell of <code>y</code> is
        marked because it comes from outside the window, one character past its right
        edge.
      </p>

      {error && (
        <p className="interactive-error">
          The corpus did not load ({error}), so there is no text to cut a window out of.
        </p>
      )}

      <p className="slicer-strip" aria-hidden="true">
        <span className="slicer-strip-out">{(cut?.before ?? "").replace(/\n/g, "⏎")}</span>
        <span className="slicer-strip-in">
          {(cut?.x ?? []).map(charLabel).join("")}
        </span>
        <span className="slicer-strip-past">
          {cut ? charLabel(cut.y[blockSize - 1] ?? "") : ""}
        </span>
        <span className="slicer-strip-out">{(cut?.after ?? "").replace(/\n/g, "⏎")}</span>
      </p>

      <div className="table-scroll scroll-x" tabIndex={0}>
        <table className="slicer-grid">
          <caption className="sr-only">
            A window of {blockSize} characters starting at character {at} of the corpus,
            with its targets
          </caption>
          <tbody>
            <tr>
              <th scope="row">t</th>
              {columns.map((t) => (
                <td key={t} className="slicer-t">
                  {t}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">
                <code>x</code>
              </th>
              {columns.map((t) => (
                <td key={t} className="slicer-cell">
                  <span className="slicer-cell-char">{charLabel(cut?.x[t] ?? " ")}</span>
                  <span className="slicer-cell-id">{cut?.xIds[t]}</span>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">
                <code>y</code>
              </th>
              {columns.map((t) => (
                <td
                  key={t}
                  className={
                    "slicer-cell" + (t === blockSize - 1 ? " slicer-cell-past" : "")
                  }
                >
                  <span className="slicer-cell-char">{charLabel(cut?.y[t] ?? " ")}</span>
                  <span className="slicer-cell-id">{cut?.yIds[t]}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="interactive-status slicer-status" role="status">
        {data
          ? `T = ${blockSize}, so this one window is ${blockSize} training examples, from characters ${at.toLocaleString()} to ${(at + blockSize).toLocaleString()}.`
          : "Loading the corpus..."}
      </p>

      <div className="interactive-controls">
        <label className="slider-row slider-row-wide">
          <span>Where in the text</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, maxStart)}
            value={at}
            onChange={(e) => setStart(Number(e.target.value))}
          />
          <code>{at.toLocaleString()}</code>
        </label>
        <label className="slider-row slider-row-wide">
          <span>Window length T</span>
          <input
            type="range"
            min={MIN_T}
            max={MAX_T}
            value={blockSize}
            onChange={(e) => setBlockSize(Number(e.target.value))}
          />
          <code>{blockSize}</code>
        </label>
        <button
          className="button-secondary"
          onClick={() => setStart(Math.floor(jump.current() * Math.max(1, maxStart)))}
          disabled={!data}
        >
          Somewhere else
        </button>
        <button
          className="button-secondary"
          onClick={() => {
            setStart(CHAPTER_START);
            setBlockSize(bench.window.block_size);
          }}
          disabled={at === CHAPTER_START && blockSize === bench.window.block_size}
        >
          Back to the chapter's window
        </button>
      </div>

      <div className="table-scroll scroll-x" tabIndex={0}>
        <table className="slicer-log">
          <caption>
            The same window read as {blockSize} examples: every prefix of it, and the
            character that came next.
          </caption>
          <thead>
            <tr>
              <th scope="col">position</th>
              <th scope="col">so far</th>
              <th scope="col">next</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((t) => (
              <tr key={t}>
                <td className="slicer-t">{t}</td>
                <td className="slicer-log-context">
                  {(cut?.x.slice(0, t + 1) ?? []).map(charLabel).join("")}
                </td>
                <td className="slicer-log-target">{charLabel(cut?.y[t] ?? " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
