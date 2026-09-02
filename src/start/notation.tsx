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
      "a space and a newline, drawn visibly inside a figure or a table. Both are characters like any other here, and the space is the most common character in the corpus",
    from: "Chapter 1",
  },
  {
    id: "token",
    symbol: <b>a token</b>,
    means:
      "the unit a model reads and writes one of. Here it is one character, so the corpus is 1,115,394 tokens over a vocabulary of 65",
    alsoCalled: "character-level tokens; the field's usual choice is subword tokens, built by byte-pair encoding",
    from: "Chapter 2",
  },
  {
    id: "scribe",
    symbol: <b>the scribe</b>,
    means:
      "the model this course builds, one piece per chapter: a character-level transformer in NumPy that reads Shakespeare and writes more of it",
    alsoCalled: "a decoder-only transformer, or a small GPT",
    from: "Chapter 2",
  },
  {
    id: "stoi",
    symbol: <code>stoi, itos</code>,
    means:
      "the two lookup tables of a vocabulary: character to id, said \"stoy\" for string to int, and id back to character, said \"eye-toss\"",
    from: "Chapter 2",
  },
  {
    id: "crossing",
    symbol: <code>encode, decode</code>,
    means:
      "the only crossing between text and arrays: a string to a row of ids, and a row of ids back to the string it spells. Ids mean nothing without the vocabulary they were numbered by",
    alsoCalled: "a tokenizer",
    from: "Chapter 2",
  },
  {
    id: "window",
    symbol: <b>a window</b>,
    means:
      "T characters in a row, cut out of the stream. It is T training examples rather than one, because every position in it is a question whose answer is the character after it",
    alsoCalled: "a context window",
    from: "Chapter 2",
  },
  {
    id: "size-T",
    symbol: <code>T</code>,
    means:
      "the size of a window: how many characters it holds, and so how many steps reading it takes. The code writes the same number block_size",
    alsoCalled: "block size, or context length",
    from: "Chapter 2",
  },
  {
    id: "step-t",
    symbol: <code>t</code>,
    means:
      "the step the reading of a window has reached, counted from 0, so the last one is T - 1. A position in the window and the step at which the model reaches it are the same number",
    alsoCalled: "the time axis, or position",
    from: "Chapter 2",
  },
  {
    id: "shape-bt",
    symbol: <code>(B, T)</code>,
    means:
      "the shape of a batch: B windows down the first axis, T positions across the second. Batch first and time second, in every array in this course, is the promise this course calls the axis law",
    alsoCalled: "batch size and block size",
    from: "Chapter 2",
  },
  {
    id: "xy",
    symbol: <code>x, y</code>,
    means:
      "a batch and its targets. y is the same windows sliced one character later, so y[b, t] is the character that actually followed x[b, t]",
    from: "Chapter 2",
  },
  {
    id: "slice-stop",
    symbol: <code>ids[s : s + T]</code>,
    means:
      "T characters starting at s. The number after the colon is where the slice stops rather than the last position it takes, so this one does not include ids[s + T], which is exactly the character the targets need",
    from: "Chapter 2",
  },
];
