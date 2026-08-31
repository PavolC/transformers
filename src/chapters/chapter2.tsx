// Chapter 2: Tokens and the corpus.
//
// Beat plan (CLAUDE.md, the authoring playbook):
//   1 the unit is a choice, priced in numbers before any notation: the same
//     corpus read as characters and as words;
//   2 the vocabulary as a measurement of this text, with the grid panel and
//     the three characters that are in it by accident;
//   3 the crossing, on chapter 1's own line, numbered twice;
//   4 the window, with the slicer at the page's midpoint and the log of the
//     examples inside one window;
//   5 the batch, its shapes and what one costs;
//   6 the same thing written down, as a recap with receipts;
//   7 the two exercises.
//
// Every number in the prose comes from tools/bench/chapter2.py (and the
// corpus figures from tools/bench/corpus.json), and the tables are rendered
// from that committed JSON rather than retyped.
//
// Structure note: the heading and every paragraph are DIRECT children of
// article.module, which is what the stylesheet's measure rules select.

import { Fragment, useEffect, type ReactNode } from "react";
import { AfterThis, Aside, Figure, ModuleToc, Recap, SectionHeader } from "../components/ModuleBits";
import { Eq } from "../components/Math";
import { ExerciseCard } from "../components/ExerciseCard";
import { buildVocabExercise } from "../exercises/build-vocab";
import { getBatchExercise } from "../exercises/get-batch";
import { VocabularyGrid } from "./interactives/VocabularyGrid";
import { WindowSlicer } from "./interactives/WindowSlicer";
import { charLabel } from "./interactives/utils";
import bench from "../bench/chapter2.json";

const units = bench.units;
const vocab = bench.vocab;
const crossing = bench.crossing;
const win = bench.window;
const real = bench.real;

const n = (x: number) => x.toLocaleString();

/** The same corpus counted in two units. The whole of the chapter's first
 * argument is in this table, so it comes before any prose about it. */
function UnitsTable() {
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          One corpus, counted twice. A word here is whatever sits between two runs of
          whitespace, punctuation included, which is the crudest possible word and enough
          to price the choice. "Tokens" counts every one in the file; "distinct" counts
          how many different ones there are, which is also how many answers a guess
          chooses among.
        </caption>
        <thead>
          <tr>
            <th scope="col">read as</th>
            <th scope="col">tokens</th>
            <th scope="col">distinct</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>characters</td>
            <td>{n(units.chars)}</td>
            <td>{n(units.vocab_size)}</td>
          </tr>
          <tr>
            <td>words</td>
            <td>{n(units.words)}</td>
            <td>{n(units.distinct_words)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** The 65 characters sorted into four kinds, which is how a reader checks the
 * grid above by eye rather than counting cells. */
function KindsTable() {
  const rows: [string, number][] = [
    ["letters", vocab.kinds.letters],
    ["punctuation", vocab.kinds.punctuation],
    ["whitespace", vocab.kinds.whitespace],
    ["digits", vocab.kinds.digit],
  ];
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          The {vocab.size} characters, sorted into kinds: 26 capitals and 26 lowercase,
          the ten marks <code>! $ &amp; &apos; , - . : ; ?</code>, a space and a newline,
          and the <code>3</code> from a play&apos;s title. The kinds are not in the
          vocabulary itself, which is one flat sorted list; they are a way of reading it.
        </caption>
        <thead>
          <tr>
            <th scope="col">kind</th>
            <th scope="col">how many</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([kind, count]) => (
            <tr key={kind}>
              <td>{kind}</td>
              <td>{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Chapter 1's line, numbered by two different vocabularies. The point of the
 * chapter's third section, in one figure. */
function TwoNumberings() {
  const chars = [...crossing.line];
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="vocab-strip">
        <caption>
          The same nineteen characters, numbered twice. Nothing about the line changed;
          the numbering did, because the second one has {vocab.size} characters to sort
          among instead of {crossing.own_vocab.length}.
        </caption>
        <tbody>
          <tr>
            <th scope="row">character</th>
            {chars.map((c, i) => (
              <td key={i}>{charLabel(c)}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">id, own vocabulary</th>
            {crossing.own_ids.map((id, i) => (
              <td key={i} className="vocab-strip-id">
                {id}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">id, corpus vocabulary</th>
            {crossing.corpus_ids.map((id, i) => (
              <td key={i} className="vocab-strip-id">
                {id}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** The batch the bench drew: four windows, each with its targets under it. */
function BatchFigure() {
  return (
    <Figure
      caption={`One batch, drawn with seed ${bench.batch.seed}: ${bench.batch.shape[0]} windows of ${bench.batch.shape[1]} characters, with the targets under each one. The four starting points were drawn independently, so the windows come from four unrelated places in the text. Read a column of any pair of rows and you have one training example.`}
    >
      <table className="c2-batch-grid">
          <tbody>
            {bench.batch.rows.map((row, b) => (
              <Fragment key={b}>
                <tr>
                  <th scope="row">x[{b}]</th>
                  {[...row.x_text].map((c, t) => (
                    <td key={t}>{charLabel(c)}</td>
                  ))}
                </tr>
                <tr className="c2-batch-y">
                  <th scope="row">y[{b}]</th>
                  {[...row.y_text].map((c, t) => (
                    <td key={t}>{charLabel(c)}</td>
                  ))}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
    </Figure>
  );
}

/** The receipts: each formal statement beside a number the reader has already
 * seen come out of the panel or the figure above it. The receipts are JSX
 * rather than strings because most of them end on a single character, and a
 * comma quoted as bare text next to the sentence's own comma reads as a typo.
 */
function ReceiptsTable() {
  const C = ({ ch }: { ch: string }) => <code>{charLabel(ch)}</code>;
  const rows: [string, ReactNode][] = [
    [
      "x has shape (B, T)",
      <>
        the batch above is ({bench.batch.shape[0]}, {bench.batch.shape[1]}), and the
        scribe's own batches are ({real.batch_size}, {real.block_size})
      </>,
    ],
    [
      "row b is one window, column t is one position",
      <>
        row 0 of that batch is <code>{[...win.x_text].map(charLabel).join("")}</code>, and
        column 0 of it is the single character <C ch={win.x_text[0]} />
      </>,
    ],
    [
      "y[b, t] is the character that followed x[b, t]",
      <>
        x[0, 3] is <C ch={win.x_text[3]} /> and y[0, 3] is <C ch={win.y_text[3]} />, which
        is what follows it in the text
      </>,
    ],
    [
      "y[b, t] equals x[b, t + 1], except at t = T - 1",
      <>
        y[0, 0] is <C ch={win.y_text[0]} /> and so is x[0, 1]. The one that comes from
        outside the window is y[0, {win.block_size - 1}], the character{" "}
        <C ch={win.y_text[win.block_size - 1]} />
      </>,
    ],
    [
      "one batch is B times T examples",
      <>
        {bench.batch.shape[0]} times {bench.batch.shape[1]} is {bench.batch.predictions}{" "}
        above, and {real.batch_size} times {real.block_size} is {real.predictions} in
        chapter 10
      </>,
    ],
  ];
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          Each statement, beside the number you have already watched come out of it.
        </caption>
        <thead>
          <tr>
            <th scope="col">written down</th>
            <th scope="col">where you saw it</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([claim, receipt]) => (
            <tr key={claim}>
              <td>{claim}</td>
              <td>{receipt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Chapter2() {
  useEffect(() => {
    document.title = "Tokens and the corpus · Transformers · Moving Parts";
  }, []);

  return (
    <article className="module">
      <h2>Chapter 2: Tokens and the corpus</h2>

      <AfterThis
        items={[
          "Say what a token is, and give the numbers that make one character this course's unit.",
          "Turn text into ids and back, and say which vocabulary a row of ids belongs to.",
          "Cut a batch of windows out of a million characters, and say how many training examples one window holds.",
        ]}
      />
      <ModuleToc />

      <SectionHeader id="c2-unit" title="What counts as one move" />
      <p>
        Chapter 1's game had a fixed move: read the text so far, guess what comes next.
        The thing being guessed was one character, and that was a decision rather than a
        law. The unit a model reads and writes is called a <b>token</b>, and picking one
        is the first choice anyone building a language model makes. This course's token
        is one character, and the cost of that is worth seeing before the code assumes it.
      </p>
      <p>
        Count the same corpus both ways. Read it character by character and it is{" "}
        {n(units.chars)} tokens drawn from {units.vocab_size} distinct ones. Split it on
        whitespace instead and it is {n(units.words)} tokens drawn from{" "}
        {n(units.distinct_words)} distinct ones.
      </p>
      <UnitsTable />
      <p>
        The distinct count is what the second row costs. Chapter 1's tally
        had one row and one column per token, {units.vocab_size} by {units.vocab_size},
        which is {n(units.char_cells)} cells. The same table over words would be{" "}
        {n(units.distinct_words)} by {n(units.distinct_words)}, which is{" "}
        {n(units.word_cells)} cells, and the corpus has {n(units.words)} words in it to fill
        them with.
      </p>
      <p>
        Two more costs come with words, and both of them are about rarity.{" "}
        {n(units.words_once)} of the {n(units.distinct_words)} distinct words occur
        exactly once, which is {(units.words_once_share * 100).toFixed(0)} percent of the
        vocabulary learned from a single example each. And a model whose unit is a word
        can only ever write words it has already seen: it has no way to spell one. A model
        whose unit is a character can write any word at all, correct or not, because it
        assembles them letter by letter.
      </p>
      <p>
        Characters have their own bill, and it comes due in chapter 5. A model reads a
        fixed number of tokens at a time, so the shorter the token the less text that
        fixed number covers. A word in this corpus is{" "}
        {units.chars_per_word.toFixed(2)} characters long counting the space after it, so
        the scribe's window of {real.block_size} characters holds about{" "}
        {real.window_words.toFixed(1)} words. That is this chapter's tally, and it is not
        measured in bits like every other chapter's: a vocabulary of{" "}
        {units.vocab_size} rows, against a window that reaches back under six words.
      </p>
      <Aside>
        <p>
          The field mostly picks neither end. A <b>subword</b> tokenizer, built by an
          algorithm called byte-pair encoding, starts from characters and repeatedly
          merges the most common neighbouring pair into a new token, so that common words
          end up as one token and rare ones stay in pieces. GPT-2 was trained with 50,257
          of them. The reach is a word model's, the spelling is a character model's, and
          the cost is a build step this course does not need: with{" "}
          {units.vocab_size} tokens every table in it stays small enough to print.
          Chapter 12 walks up to the door byte-pair encoding opens, and does not go
          through it.
        </p>
      </Aside>

      <SectionHeader id="c2-vocab" title="All sixty-five" />
      <p>
        The vocabulary is not chosen, it is measured. Take the distinct characters that
        occur in the corpus, sort them, and that list is the vocabulary. Sorting is what
        makes it repeatable: the same text always produces the same list, so a character's
        place in it is a number the course can rely on.
      </p>
      <p>
        The panel below is all {vocab.size} of them, in that order, each with the number
        that stands for it.
      </p>
      <VocabularyGrid />
      <KindsTable />
      <p>
        Three cells in that grid are there by accident, and they are worth clicking. The{" "}
        <code>{vocab.rarest[0].char}</code> occurs {vocab.rarest[0].count} times, always
        in a play's title (<code>{vocab.rarest[0].context}</code>). The{" "}
        <code>{vocab.rarest[1].char}</code> occurs {vocab.rarest[1].count} times, in an
        abbreviation (<code>{vocab.rarest[1].context}</code>). The{" "}
        <code>{vocab.rarest[2].char}</code> occurs once, in{" "}
        <code>{vocab.rarest[2].context}</code>, which is the source
        text's own typo for "shall".
      </p>
      <p>
        Each of those three gets an id, a row of the tally and a column of it, exactly as
        wide as the row for <code>e</code>. The vocabulary is a measurement of one file,
        not a fact about English, and every number in this course inherits that. Chapter
        12 hands the model text nobody curated, and this list is the first thing that
        breaks.
      </p>

      <SectionHeader id="c2-crossing" title="Crossing between text and numbers" />
      <p>
        Text is a Python string and every table in the course is a NumPy array, so
        something has to cross between them. Two functions do, and nothing else in the
        course is allowed to. <code>encode</code> walks a string and replaces each
        character with its id. <code>decode</code> walks a row of ids and replaces each
        with its character.
      </p>
      <p>
        The two lookups they use are built in the same pass as the vocabulary itself:
        sort the distinct characters once, then number them in both directions. Both
        lookups have the field's names. <code>stoi</code> maps a character to its id, and is said
        "stoy", for string to int. <code>itos</code> maps an id back to its character, and
        is said "eye-toss". Two tables rather than one, because a dict goes one way.
      </p>
      <p>
        Here is chapter 1's line, <code>{crossing.line}</code>, numbered twice. Once by the
        vocabulary of the line itself, which is the strip chapter 1 built and has{" "}
        {crossing.own_vocab.length} characters in it. Once by the corpus's{" "}
        {vocab.size}.
      </p>
      <TwoNumberings />
      <p>
        A <code>t</code> is {crossing.own_ids[0]} in the first numbering and{" "}
        {crossing.corpus_ids[0]} in the second. Neither is more correct, because an id is
        a position in a particular sorted list and nothing else. Ids carry no letters
        inside them, so a row of ids is meaningless without the vocabulary it was numbered
        by, and the two always travel together.
      </p>
      <p>
        The check that the crossing is lossless is one line: encode the whole corpus, decode
        it again, and compare. All {n(units.chars)} characters come back unchanged, spaces
        and newlines included. The exercise below runs that check on your own two
        functions.
      </p>
      <p>
        A pair of functions that turns text into tokens and back is what everyone else
        calls a <b>tokenizer</b>. The word usually implies something more elaborate than
        this, with a training step of its own, and this course's is about as small as one
        can be. Both words are in play from here: the crossing when the point is what the
        functions do, a tokenizer when the point is which component they are.
      </p>

      <SectionHeader id="c2-windows" title="One window, and the examples inside it" />
      <p>
        The scribe cannot read {n(units.chars)} characters at once. It reads a fixed
        number, and every model this course trains has that number written into its
        shape. Call it <code>T</code>, for the number of positions in time it
        can see. A stretch of <code>T</code> characters cut out of the corpus is a{" "}
        <b>window</b>, which the field calls a context window, and its length is the
        setting called <code>block_size</code> in the code.
      </p>
      <p>
        Cutting a window is a slice. What makes it a piece of training data is the second
        slice beside it, one character further along: for each position in the window,
        what actually came next. Drag either control below and watch both.
      </p>
      <WindowSlicer />
      <p>
        The table at the bottom of that panel is the window read as training data. A
        window of{" "}
        {win.block_size} characters is not one training example, it is{" "}
        {win.block_size}: predict the second character from the first, the third from the
        first two, and so on to the end. Reading the window <code>{win.x_text}</code> that
        way gives "after <code>{win.pairs[0].context}</code> comes{" "}
        <code>{win.pairs[0].target}</code>", then "after{" "}
        <code>{win.pairs[3].context}</code> comes{" "}
        <code>{charLabel(win.pairs[3].target)}</code>", down to "after{" "}
        <code>{win.pairs[win.block_size - 1].context}</code> comes{" "}
        <code>{charLabel(win.pairs[win.block_size - 1].target)}</code>".
      </p>
      <p>
        That last one is why the targets are a slice of the text rather than a copy of the
        window. The answer to the final position sits one character past the window's
        right edge, so <code>y</code> has to be cut from the corpus starting one character
        later than <code>x</code>, not built out of <code>x</code> afterwards.
      </p>
      <p>
        The scribe's real window is {real.block_size} characters, so each one it reads is{" "}
        {real.block_size} examples. Chapter 1's tally was the same idea with the window
        set to one: one character in, one character out, and no room to remember anything
        before it.
      </p>

      <SectionHeader id="c2-batch" title="Sixteen windows at a time" />
      <p>
        One window at a time would work and would be slow. Every step of training does the
        same arithmetic to every window it is handed. NumPy does that arithmetic on a
        stack of windows about as fast as on a single one, so the windows come in
        batches: <code>B</code> of them, cut from <code>B</code> starting points drawn
        independently at random.
      </p>
      <BatchFigure />
      <p>
        Both arrays have the same shape, <code>(B, T)</code>: {bench.batch.shape[0]} rows
        of {bench.batch.shape[1]} here. The axis law is fixed for the whole course, and
        every array in every later chapter obeys it. Axis 0 is the batch, so row{" "}
        <code>b</code> is one window. Axis 1 is time, so column <code>t</code> is one
        position, and time reads left to right.
      </p>
      <p>
        The starts are independent, which is why the four rows above come from four
        unrelated places in the plays. Nothing keeps two of them from overlapping, or from
        being the same window twice. It does not come up often: the training text, which
        is the nine tenths of the corpus a model is allowed to read, holds{" "}
        {n(real.starts)} legal starting points at <code>T</code> = {real.block_size}.
      </p>
      <p>
        What one batch of the real thing costs and buys:
      </p>
      <Eq
        tex={`\\begin{aligned} \\underbrace{${real.batch_size}}_{B} \\times \\underbrace{${real.block_size}}_{T} &= ${real.predictions} \\text{ predictions} \\\\[2pt] ${real.batch_size} \\times (${real.block_size} + 1) &= ${real.chars_touched} \\text{ characters read} \\end{aligned}`}
        gloss={`Sixteen windows of thirty-two characters hold ${real.predictions} training examples between them, and reading them off the corpus touches ${real.chars_touched} characters, one extra per window for the final target.`}
      />
      <p>
        That ratio is the shift's whole payoff. The text is{" "}
        {real.block_size} times more training data than it looks, because every position
        of every window is a question with a known answer. The same ratio is why "one
        pass over the corpus" is not a thing this course counts. At{" "}
        {real.chars_touched} characters a batch,{" "}
        {Math.round(real.batches_per_pass).toLocaleString()} batches read as many
        characters as the training text holds. The starts are drawn independently
        though, so some stretches come up twice in those batches and others not at all.
      </p>

      <SectionHeader id="c2-written" title="What you just watched, written down" />
      <p>
        Nothing new happens in this section. The panel above already did all of it, and
        these are the same moves in the notation the rest of the course uses, so that a
        line of code in chapter 10 is recognizable rather than novel.
      </p>
      <p>
        A window and its targets, for one starting point <code>s</code>:
      </p>
      <Eq
        tex={"\\begin{aligned} x[b] &= \\text{ids}[\\,s_b : s_b + T\\,] \\\\[2pt] y[b] &= \\text{ids}[\\,s_b + 1 : s_b + T + 1\\,] \\end{aligned}"}
        gloss="Row b of x is T characters of the stream starting at that row's own starting point, and row b of y is the same length of stream starting one character later."
      />
      <p>
        The colon is Python's slice, and the number after it is where the slice stops
        rather than the last position it takes. So{" "}
        <code>ids[{win.start} : {win.start + win.block_size}]</code> is the{" "}
        {win.block_size} characters at positions {n(win.start)} through{" "}
        {n(win.start + win.block_size - 1)}, and the character at position{" "}
        {n(win.start + win.block_size)} is the one <code>y</code> needs and{" "}
        <code>x</code> does not have.
      </p>
      <ReceiptsTable />
      <p>
        The overlap in the fourth row is the thing to carry forward. The two arrays hold
        almost exactly the same characters, offset by one position, and the single cell
        where that stops being true is the cell that makes them a question and an answer
        rather than the same window written twice.
      </p>

      <SectionHeader id="c2-exercise" title="Your turn: the crossing, and the batch" />
      <p>
        Two more sections of your file. The first is the crossing, three small functions
        that everything after this chapter calls before it can start. The second cuts the
        batches, and it is the function chapter 10's training loop calls on every step.
        Both are short, and both have one detail that has to be exactly right: the sorting
        in the first, the draw in the second.
      </p>
      <ExerciseCard exercise={buildVocabExercise} />
      <ExerciseCard exercise={getBatchExercise} />

      <Recap
        items={[
          `A token is the unit a model reads and writes. This course's is one character, which makes the corpus ${n(units.chars)} tokens over a vocabulary of ${units.vocab_size}.`,
          `Words would be ${n(units.distinct_words)} distinct tokens, ${(units.words_once_share * 100).toFixed(0)} percent of them seen exactly once, and a word model cannot spell anything it has not met. Characters pay for that in reach: ${real.block_size} of them is about ${real.window_words.toFixed(1)} words.`,
          `The vocabulary is measured, not chosen: the sorted distinct characters of this file, ${vocab.kinds.letters} letters, ${vocab.kinds.punctuation} punctuation marks, ${vocab.kinds.whitespace} kinds of whitespace and a digit, typo included.`,
          "encode and decode are the only crossing between text and arrays, and an id means nothing without the vocabulary it was numbered by. Together they are what the field calls a tokenizer.",
          `A window of T characters is T training examples, not one, because every position in it is a question whose answer is the next character. The targets are a second slice, one character further along.`,
          `A batch is (B, T): batch on axis 0, time on axis 1. The scribe's ${real.batch_size} by ${real.block_size} batch is ${real.predictions} examples read off ${real.chars_touched} characters of Shakespeare.`,
        ]}
        deeper="Karpathy's lecture on tokenization, which builds a byte-pair encoder from scratch"
        href="https://www.youtube.com/watch?v=zduSFxRajkE"
      />
    </article>
  );
}
