import type { ReactNode } from "react";

/** One row of the notation reference on the front page.
 *
 * The rule that keeps this honest (CLAUDE.md, "Notation and vocabulary"):
 * **every new symbol or coined term gets its row in the same change that
 * introduces it.** Chapters are written assuming weeks pass between them, and
 * a symbol defined once four thousand words ago is not defined for a reader
 * coming back. Course one back-filled 36 rows after all ten chapters existed
 * and then found 7 more (CASEBOOK.md 8); starting the table empty on day one
 * costs nothing.
 *
 * `alsoCalled` is the field's name for the thing, rendered as a muted line
 * under the meaning rather than as a fourth column, because two columns of
 * prose pan the whole lookup at the prose measure. A coined word also hands
 * over to the field's word in the chapter that earns it, in prose; this line
 * is the lookup, not the handover (CASEBOOK.md 17).
 */
export interface NotationRow {
  id: string;
  /** The glyph, the shape or the code spelling, as the reader meets it. */
  symbol: ReactNode;
  /** One line. What it means, in the course's own words. */
  means: string;
  /** What everyone outside this course calls it, when that differs. */
  alsoCalled?: string;
  /** The chapter that introduced it: "Chapter 1". */
  from: string;
}

/** In the order a reader meets them. Never alphabetical: the lookup is read
 * down the way the course is read. */
export const NOTATION: NotationRow[] = [
  {
    id: "section-line",
    symbol: <code>{"# ---- [section:...] ----"}</code>,
    means:
      "a section line in your file: the course reads the name in the brackets to find where each piece starts, and everything else on the line is yours",
    from: "Chapter 1",
  },
  {
    id: "tally",
    symbol: <b>the tally</b>,
    means:
      "the table of counts: one row per character, one column per character, and in each cell how often that column's character followed that row's",
    alsoCalled: "a table of bigram counts, or a bigram model",
    from: "Chapter 1",
  },
  {
    id: "corpus",
    symbol: <b>the corpus</b>,
    means:
      "the text the course reads: Tiny Shakespeare, 1,115,394 characters, split nine to one into the part a model may read and the part it is scored on",
    alsoCalled: "the training set and the validation set",
    from: "Chapter 1",
  },
  {
    id: "id",
    symbol: <code>id</code>,
    means:
      "a character's number: its position in the sorted vocabulary, so every character is an index into a row or a column of the tally",
    alsoCalled: "a token id",
    from: "Chapter 1",
  },
  {
    id: "vocab",
    symbol: <code>vocab_size</code>,
    means:
      "how many distinct characters the vocabulary holds, which is 65 for this corpus and the width and height of the tally",
    from: "Chapter 1",
  },
  {
    id: "slices",
    symbol: <code>ids[:-1], ids[1:]</code>,
    means:
      "every character except the last, and every character except the first: line them up and you have each pair of neighbours, which is why n characters hold n minus 1 pairs",
    from: "Chapter 1",
  },
  {
    id: "add-at",
    symbol: <code>np.add.at(a, idx, v)</code>,
    means:
      "add v at those coordinates, accumulating when a coordinate repeats. Plain a[idx] += v writes each repeated coordinate once instead, which undercounts",
    from: "Chapter 1",
  },
  {
    id: "rng",
    symbol: <code>rng</code>,
    means:
      "a random generator made by np.random.default_rng(seed) and passed in as an argument, never created inside a function: the caller owning it is what makes a run repeatable",
    from: "Chapter 1",
  },
  {
    id: "space-glyph",
    symbol: <code>␣ ⏎</code>,
    means:
      "a space and a newline, drawn visibly inside a figure or a table. Both are characters like any other here, and the most common two in the corpus",
    from: "Chapter 1",
  },
];
