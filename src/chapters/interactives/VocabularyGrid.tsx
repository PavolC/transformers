// Chapter 2's first interactive: the whole vocabulary, one cell per
// character, with what each one is worth in the corpus.
//
// The grid family (CLAUDE.md, figure geometry): fixed cell size, the id in
// the cell, the fill a share of the accent. Thirteen columns by five rows is
// exactly 65 cells, which is what makes the arrow keys unambiguous and keeps
// the strip a rectangle; on a narrow screen it pans inside the scroll wrapper
// rather than reflowing, so a character's neighbours are always its
// neighbours in the sorted order.
//
// Counts are integers computed in JavaScript, so they agree with the Python
// bench exactly (addition agrees across engines). The prose still quotes
// tools/bench/chapter2.py and never this panel.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { loadCorpus } from "../../runtime/assets";
import { charLabel, charName, vocabOf } from "./utils";

const COLUMNS = 13;

/** How dark a cell is drawn. The counts run from 1 to 169,892, so a straight
 * share of the maximum leaves every character but the space at the palest
 * step; this follows the count's size in digits instead, which separates a
 * character seen once from one seen three hundred times. */
function shade(count: number, max: number): string {
  const share = Math.log(1 + count) / Math.log(1 + max);
  const mix = 6 + Math.round(share * 52);
  return `color-mix(in oklab, var(--accent) ${mix}%, var(--bg))`;
}

interface Loaded {
  chars: string[];
  counts: number[];
  first: number[];
  text: string;
  max: number;
}

function measure(text: string): Loaded {
  const { chars, index } = vocabOf(text);
  const counts = chars.map(() => 0);
  const first = chars.map(() => -1);
  for (let i = 0; i < text.length; i++) {
    const id = index.get(text[i])!;
    counts[id] += 1;
    if (first[id] < 0) first[id] = i;
  }
  return { chars, counts, first, text, max: Math.max(...counts) };
}

export function VocabularyGrid() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Opens on the space: the corpus's most common character, and the one whose
  // being a character at all is the thing to notice first.
  const [selected, setSelected] = useState(1);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let live = true;
    loadCorpus()
      .then((text) => {
        if (live) setData(measure(text));
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      live = false;
    };
  }, []);

  // Where the selected character first turns up, with the character itself
  // marked. Twelve characters either side, newlines drawn rather than taken.
  const context = useMemo(() => {
    if (!data) return null;
    const at = data.first[selected];
    if (at < 0) return null;
    const before = data.text.slice(Math.max(0, at - 12), at);
    const after = data.text.slice(at + 1, at + 13);
    return { before, hit: data.text[at], after, at };
  }, [data, selected]);

  // One tab stop for the whole grid, arrows inside it: 65 cells would
  // otherwise be 65 stops between the paragraph above and the one below.
  const move = (to: number) => {
    if (!data) return;
    const next = Math.max(0, Math.min(data.chars.length - 1, to));
    setSelected(next);
    cells.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowLeft: selected - 1,
      ArrowRight: selected + 1,
      ArrowUp: selected - COLUMNS,
      ArrowDown: selected + COLUMNS,
      Home: 0,
      End: (data?.chars.length ?? 1) - 1,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    move(keys[e.key]);
  };

  const count = data ? data.counts[selected] : 0;
  const share = data ? (count / data.text.length) * 100 : 0;

  return (
    <div className="interactive vocab-grid">
      <p className="interactive-title">Every character the corpus contains</p>
      <p className="interactive-legend">
        One cell per character, in sorted order, with the id underneath it. Darker means
        more common; the counts run from 1 to the space's six figures, so the shading
        follows the size of the count rather than the count itself. Click a cell, or use
        the arrow keys, to see what that character is worth and where it first appears.
      </p>

      {error && (
        <p className="interactive-error">
          The corpus did not load ({error}), so this strip has nothing to count.
        </p>
      )}

      <div className="table-scroll scroll-x" tabIndex={-1}>
        <div
          className="vocab-cells"
          role="group"
          aria-label="The corpus vocabulary, 65 characters"
          onKeyDown={onKeyDown}
        >
          {(data?.chars ?? []).map((ch, id) => (
            <button
              key={ch}
              ref={(el) => {
                cells.current[id] = el;
              }}
              className={"vocab-cell" + (id === selected ? " vocab-cell-on" : "")}
              style={{ background: shade(data!.counts[id], data!.max) }}
              tabIndex={id === selected ? 0 : -1}
              aria-pressed={id === selected}
              aria-label={`${charName(ch)}, id ${id}, ${data!.counts[id]} times`}
              onClick={() => move(id)}
            >
              <span className="vocab-cell-char">{charLabel(ch)}</span>
              <span className="vocab-cell-id">{id}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="interactive-status vocab-readout" role="status">
        {data ? (
          <>
            <b>id {selected}</b> is {charName(data.chars[selected])}, and it occurs{" "}
            {count.toLocaleString()} times, {share.toFixed(share < 1 ? 4 : 1)} percent of
            the corpus.
          </>
        ) : (
          "Loading the corpus..."
        )}
      </p>
      <p className="vocab-context">
        {context ? (
          <>
            <span className="vocab-context-label">first at character {context.at.toLocaleString()}:</span>{" "}
            <span className="vocab-context-text">
              {context.before.replace(/\n/g, "⏎")}
              <span className="vocab-context-hit">{charLabel(context.hit)}</span>
              {context.after.replace(/\n/g, "⏎")}
            </span>
          </>
        ) : (
          " "
        )}
      </p>
    </div>
  );
}
