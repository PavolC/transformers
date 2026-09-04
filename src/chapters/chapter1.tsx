// Chapter 1: The next-letter game.
//
// Beat plan (CLAUDE.md, the authoring playbook):
//   1 numbers before notation: the line, counted by hand, no code and no
//     symbols;
//   2 the tally, with the TallyBuilder reached before the page's midpoint;
//   3 the same counting over a million characters, rows sorted into kinds;
//   4 writing by drawing, with the sampler, and the favourite-loop failure
//     shown after the success rather than before it;
//   5 the score, and what it buys;
//   6 what one row cannot know: the cost this course spends the next eleven
//     chapters reducing;
//   7 the two exercises.
//
// Every number in the prose comes from tools/bench/chapter1.py (and the
// corpus figures from tools/bench/corpus.py), and the tables and the sampled
// passage are rendered from that committed JSON rather than retyped.
//
// Structure note: the heading and every paragraph are DIRECT children of
// article.module, which is what the stylesheet's measure rules select.

import { useEffect } from "react";
import { AfterThis, Figure, ModuleToc, Recap, SectionHeader, fig } from "../components/ModuleBits";
import { ExerciseCard } from "../components/ExerciseCard";
import { countPairsExercise } from "../exercises/count-pairs";
import { sampleNextExercise } from "../exercises/sample-next";
import { TallyBuilder } from "./interactives/TallyBuilder";
import { WheelSampler } from "./interactives/WheelSampler";
import { charLabel } from "./interactives/utils";
import bench from "../bench/chapter1.json";
import corpusBench from "../bench/corpus.json";

const rows = bench.rows as Record<string, { total: number; top: { char: string; count: number; share: number }[] }>;
const line = bench.line;
const fav = bench.favourite_guess;

/** The line's own characters in sorted order, which is the order that gives
 * each one its number. Derived from the bench's line rather than typed out, so
 * this strip, the chapter's prose and the exercise's tests cannot disagree. */
const lineVocab = [...new Set(line.text)].sort();

/** The vocabulary strip: every character the line uses, and the number that
 * stands for it. Grid family, one row of fixed cells. */
function VocabStrip() {
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="vocab-strip">
        <caption>
          The line's {lineVocab.length} characters in sorted order. A character's number is
          simply its place in this row, counting from 0.
        </caption>
        <tbody>
          <tr>
            <th scope="row">character</th>
            {lineVocab.map((c) => (
              <td key={c}>{charLabel(c)}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">its number</th>
            {lineVocab.map((c, i) => (
              <td key={c} className="vocab-strip-id">
                {i}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** A row of the corpus tally, as the chapter shows it: the character, how
 * often it appeared, and its four most common successors with shares. */
function RowTable() {
  const kinds: Record<string, string> = {
    q: "nearly certain",
    z: "dominated",
    h: "dominated",
    " ": "wide open",
  };
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          Four rows of the corpus tally, sorted into three kinds. Shares are of that row,
          not of the table, and only the top four successors are shown, so a wide-open
          row's shares do not add up to 100 percent.
        </caption>
        <thead>
          <tr>
            <th scope="col">after</th>
            <th scope="col">times</th>
            <th scope="col">most common next</th>
            <th scope="col">kind of row</th>
          </tr>
        </thead>
        <tbody>
          {["q", "z", "h", " "].map((ch) => (
            <tr key={ch}>
              <td>
                <code>{charLabel(ch)}</code>
              </td>
              <td>{rows[ch].total.toLocaleString()}</td>
              <td>
                {rows[ch].top.map((t, i) => (
                  <span key={t.char}>
                    {i > 0 && ", "}
                    <code>{charLabel(t.char)}</code> {(t.share * 100).toFixed(1)}%
                  </span>
                ))}
              </td>
              <td>{kinds[ch]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The one figure that draws the loop: current character, its row, a draw,
 * and the answer becoming the next current character. Box-and-arrow family:
 * one shared viewBox width, rendered at full column width. */
function LoopFigure() {
  return (
    <Figure caption="The writing loop. The tally is read one row at a time: the character just written picks the row, the draw picks a character from that row in proportion to its counts, and the character drawn becomes the one that picks the next row. Nothing else is remembered.">
      {/* Named for itself and joined to the box-and-arrow family by adding
          .c1-loop to that family's selector list in the stylesheet, which is
          how a diagram gets the family's one scale. The generic fig-* classes
          below are this course's shared box, arrow and label ink. */}
      <svg {...fig(0, 0, 526, 168)} className="c1-loop" role="img" aria-label="The writing loop: a character picks a row of the tally, a draw picks the next character, and that character picks the next row.">
        <rect x="12" y="44" width="118" height="52" rx="6" className="fig-box-fill" />
        <text x="71" y="66" className="fig-label" textAnchor="middle">
          character
        </text>
        <text x="71" y="84" className="fig-label" textAnchor="middle">
          just written
        </text>

        <path d="M130 70 H188" className="fig-arrow" markerEnd="url(#c1-arrow)" />
        <text x="159" y="60" className="fig-note" textAnchor="middle">
          picks
        </text>

        {/* Wide enough for its own note line: at 122 units the note ran past
            both edges of the box it belongs to. */}
        <rect x="188" y="30" width="150" height="80" rx="6" className="fig-box-fill" />
        <text x="263" y="56" className="fig-label" textAnchor="middle">
          its row of
        </text>
        <text x="263" y="74" className="fig-label" textAnchor="middle">
          the tally
        </text>
        <text x="263" y="96" className="fig-note" textAnchor="middle">
          counts of what followed
        </text>

        <path d="M338 70 H396" className="fig-arrow" markerEnd="url(#c1-arrow)" />
        <text x="367" y="60" className="fig-note" textAnchor="middle">
          draw
        </text>

        <rect x="396" y="44" width="118" height="52" rx="6" className="fig-box-fill" />
        <text x="455" y="66" className="fig-label" textAnchor="middle">
          next
        </text>
        <text x="455" y="84" className="fig-label" textAnchor="middle">
          character
        </text>

        <path d="M455 96 V138 H71 V96" className="fig-arrow" markerEnd="url(#c1-arrow)" />
        <text x="263" y="154" className="fig-note" textAnchor="middle">
          written down, and it becomes the character just written
        </text>

        <defs>
          <marker id="c1-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" className="fig-arrow-head" />
          </marker>
        </defs>
      </svg>
    </Figure>
  );
}

export function Chapter1() {
  useEffect(() => {
    document.title = "The next-letter game · Transformers · Moving Parts";
  }, []);

  return (
    <article className="module">
      <h2>Chapter 1: The next-letter game</h2>

      <AfterThis
        items={[
          "Count what follows what in a piece of text, and read the resulting table as a set of guesses.",
          "Turn those counts into writing: draw the next character in proportion, feed it back in, repeat.",
          "Say exactly what a machine that looks at one character throws away, and put a number on it.",
        ]}
      />
      <ModuleToc />

      <SectionHeader id="c1-game" title="One line, counted by hand" />
      <p>
        Here is the game this whole course plays. You are shown some text, and you have to
        guess the character that comes next. Not the next word, not the next sentence: the
        next single character, including spaces and newlines. Everything you build over
        the next eleven chapters is a better player of that one game.
      </p>
      <p>
        Start by playing it with nothing but counting. Take one line, <code>{line.text}</code>
        , and read it one character at a time, keeping a note of what followed what. The
        line is {line.chars} characters long, so reading it once gives you {line.pairs}{" "}
        pairs of neighbours.
      </p>
      <p>
        Take the letter <code>t</code>. It appears three times in the line, and each time
        something follows it: <code>o</code> in <code>to</code>, <code>o</code> again in
        the second <code>to</code>, and a space at the end of <code>not</code>. So the note
        against <code>t</code> reads: <code>o</code> twice, space once. The letter{" "}
        <code>b</code> appears twice and is followed by <code>e</code> both times. After a
        space, five characters occur: <code>b</code> twice, then <code>n</code>,{" "}
        <code>o</code> and <code>t</code> once each.
      </p>
      <p>
        Those notes are a working guesser. Given a <code>t</code>, you can answer{" "}
        <code>o</code>, and be right two times in three on this line. Given a{" "}
        <code>b</code>, you can answer <code>e</code> and be right every time. No network,
        no training, no algebra: reading the line once and counting was enough.
      </p>

      <SectionHeader id="c1-tally" title="The tally" />
      <p>
        Written out as one table, the notes have a row for every character that can come
        first and a column for every character that can come next, with the count of that
        pair in the cell where they cross. This course calls that table the{" "}
        <b>tally</b>, and it is the object chapter 4 turns into something learned, chapter
        6 turns into something contextual, and chapter 9 buries inside a transformer
        block. Everyone else calls it a table of bigram counts, or a bigram model, from{" "}
        <i>bi</i> for two and <i>gram</i> for written thing. The code you write in a
        moment is called <code>count_pairs</code>.
      </p>
      <p>
        The panel below builds it. Drag the control, or press the button, to count the
        line's pairs one at a time and watch the cells fill.
      </p>
      <TallyBuilder />
      <p>
        Two things are worth noticing in the finished table. It is not symmetric: the cell
        for <code>t</code> then <code>o</code> holds 2, and the cell for <code>o</code>{" "}
        then <code>t</code> holds 1, because <code>to</code> and <code>ot</code> are
        different pairs. And most of it is empty, which is not a defect of this line but
        the normal condition of a tally: the vast majority of character pairs never occur.
      </p>

      <SectionHeader id="c1-corpus" title="The same counting, a million characters" />
      <p>
        One line makes a poor guesser, so give it more text. The course's corpus is Tiny
        Shakespeare: {corpusBench.corpus.chars.toLocaleString()} characters of dialogue
        from the plays, {corpusBench.corpus.vocab_size} distinct characters, held in one
        file the page has already downloaded. Nine tenths of it,{" "}
        {bench.corpus.train_chars.toLocaleString()} characters, is the text to read and
        count; the last tenth is held back, and chapter 3 explains what for.
      </p>
      <p>
        The counting is unchanged. Read the {bench.corpus.train_chars.toLocaleString()}{" "}
        characters in order, add 1 to a cell for each of the{" "}
        {bench.corpus.pairs_counted.toLocaleString()} pairs, and the result is a{" "}
        {corpusBench.corpus.vocab_size} by {corpusBench.corpus.vocab_size} table instead of
        an 8 by 8 one. What changes is how much the rows know.
      </p>
      <RowTable />
      <p>
        Those four rows are three kinds, and the kinds matter more than the individual
        numbers. A <b>nearly certain</b> row has one successor and almost no competition:
        after <code>q</code>, in {rows.q.total.toLocaleString()} appearances, Shakespeare
        writes <code>u</code> every single time. A <b>dominated</b> row has a clear
        favourite that is far from a sure thing: <code>z</code> is followed by{" "}
        <code>e</code> {(rows.z.top[0].share * 100).toFixed(1)} percent of the time, and{" "}
        <code>h</code> by <code>e</code> only {(rows.h.top[0].share * 100).toFixed(1)}{" "}
        percent, with <code>a</code>, <code>i</code> and <code>o</code> taking most of the
        rest. A <b>wide open</b> row has no favourite worth the name: after a space, the
        most common character is <code>t</code> at just{" "}
        {(rows[" "].top[0].share * 100).toFixed(1)} percent, which is another way of
        saying that the start of a word is the hardest thing in this game to guess.
      </p>
      <p>
        Every row is one of those three shapes, and a model that guesses well is one whose
        rows are sharp where the text really is predictable and honest where it is not.
      </p>

      <SectionHeader id="c1-writing" title="Writing by drawing" />
      <p>
        A tally can do more than answer questions. It can write, by feeding its own answers
        back to itself: start from some character, get the next one, write it down, and
        then treat that new character as the one you are asking about.
      </p>
      <LoopFigure />
      <p>
        The one decision in that loop is how to turn a row of counts into a single
        character. Draw it in proportion: a successor counted 30 times comes up ten times
        as often as one counted 3 times, and a successor counted zero times never comes up.
        The panel below does exactly that, on the corpus tally, showing the row it is
        drawing from as it goes.
      </p>
      <WheelSampler />
      <p>
        What comes out is not English, and it is not noise either. Here are{" "}
        {bench.sample.steps} draws of it, starting from a line break, made by the same
        tally in the course's Python rather than in the panel above, which is why the
        letters differ while the counts behind them are identical:
      </p>
      <pre className="sample-block">{bench.sample.text}</pre>
      <p>
        Every neighbouring pair of characters in that passage is a pair Shakespeare wrote
        at least once. That is the whole of what the tally guarantees, and it buys more
        than you might expect: line breaks in plausible places, capitals clustering into
        speaker names, a colon after them, apostrophes inside words rather than between
        them. It also shows what one pair cannot buy. The words are mostly not words.
      </p>
      <p>
        The draw has to stay random, and the panel's checkbox shows why. Take each row's
        most common successor instead, and the loop closes on itself: starting from{" "}
        <code>t</code>, the favourite of <code>t</code> is <code>h</code>, the favourite of{" "}
        <code>h</code> is <code>e</code>, the favourite of <code>e</code> is a space, and
        the favourite of a space is <code>t</code>. The output is{" "}
        <code>{bench.favourite_loop.text}</code> forever. A model with one best answer per
        character has one text in it; the randomness is what turns the same tally into an
        endless supply of them.
      </p>

      <SectionHeader id="c1-score" title="How often is it right?" />
      <p>
        Writing text is hard to grade, so grade the guessing instead. Take the held-back
        tenth of the corpus, the part the counting never read, and at every position ask
        the tally for its single best guess at the next character. It is right{" "}
        {fav.hits.toLocaleString()} times out of {fav.of.toLocaleString()}, which is{" "}
        {(fav.share * 100).toFixed(1)} percent.
      </p>
      <p>
        The tally does not write during this. The loop of the last section would draw a
        character, feed it back in, and be somewhere else in Shakespeare within a few
        steps, so a comparison with the held-back text would measure where the two parted
        rather than how well the tally guesses. Here the held-back text is walked with the
        answer key open: at each position the tally reads the real character, guesses,
        the guess is marked against the real next character, and then the real next
        character is what it reads at the following position. Its own guesses are never
        fed back in.
      </p>
      <p>
        On its own that number means nothing, so measure it against the laziest possible
        player: always answer <code>{charLabel(fav.baseline_char)}</code>, the corpus's
        most common character, whatever came before. That is right{" "}
        {(fav.baseline_share * 100).toFixed(1)} percent of the time. So counting pairs is
        about {(fav.share / fav.baseline_share).toFixed(1)} times better than counting
        nothing, and it cost one pass over the text.
      </p>
      <p>
        This score has a flaw worth naming now, because chapter 3 replaces it. A model that
        says <code>u</code> after <code>q</code> and a model that says <code>u</code> is
        merely likely after <code>q</code> get identical credit here: only the top guess is
        graded, so how confident the row was, and how much of its weight sat on characters
        that did not occur, goes unmeasured. Chapter 3 introduces a score that reads the
        whole row, and every chapter after it is measured with that one instead.
      </p>

      <SectionHeader id="c1-forgets" title="What one row cannot know" />
      <p>
        Now the cost. The tally keeps one row per character, which means the guess depends
        on exactly one thing: the character immediately before. Everything earlier is
        thrown away at the moment the next row is chosen.
      </p>
      <p>
        Watch that in one letter. In the corpus, the row for <code>h</code> puts{" "}
        {(rows.h.top[0].share * 100).toFixed(1)} percent on <code>e</code>. That is the
        answer after the <code>h</code> in <code>the</code>, and also after the{" "}
        <code>h</code> in <code>which</code>, and after the <code>h</code> in{" "}
        <code>sh</code> at the start of a word, and after an <code>h</code> that opens a
        line. A reader who has just seen <code>whic</code> knows the next character is
        almost certainly <code>h</code> and the one after it almost certainly is not{" "}
        <code>e</code>. The tally cannot know that, because by the time it is asked, all{" "}
        {rows.h.total.toLocaleString()} of the corpus's <code>h</code> characters have been
        merged into one row.
      </p>
      <p>
        That is the number to carry forward: {corpusBench.corpus.vocab_size} rows, one per
        character, is the entire memory of this model. The rest of the course is a sequence
        of answers to the question of what else the guess could depend on, and every one of
        them costs something. Chapter 5 widens the window to a fixed handful of characters
        and pays for it in parameters. Chapters 6 and 7 let the model choose which earlier
        characters to look at, which is attention, and pay for it in arithmetic. The tally
        is the floor all of that is measured against.
      </p>

      <SectionHeader id="c1-numbers" title="The same table, in numbers" />
      <p>
        One thing has to change before you can write this down as code. The tally you have
        been reading has characters along its edges, and an array in Python does not: its
        rows and columns are numbered. So each character gets a number, and the simplest
        honest choice is its position in the sorted list of the characters that occur.
      </p>
      <VocabStrip />
      <p>
        For this line that gives <code>{charLabel(" ")}</code> the number 0, the comma 1,{" "}
        <code>b</code> 2, and so on up to <code>t</code> at{" "}
        {lineVocab.length - 1}. Nothing about the tally changes: the cell that held "how
        often <code>o</code> followed <code>t</code>" is now the cell at row{" "}
        {lineVocab.indexOf("t")}, column {lineVocab.indexOf("o")}, holding the same{" "}
        {line.rows.t.o}. The letters were never in the table, only on its edges.
      </p>
      <p>
        Three words for the three pieces, because the code below uses them. The sorted list
        of characters is the <b>vocabulary</b>. A character's number is its <b>id</b>. How
        many characters the vocabulary holds is <b>vocab_size</b>, which is exactly how
        wide and how tall the table has to be: {lineVocab.length} for this line, and{" "}
        {corpusBench.corpus.vocab_size} for the corpus. Chapter 2 lays out all{" "}
        {corpusBench.corpus.vocab_size} of the corpus's characters and builds this
        properly, with the two functions that cross between text and numbers; the strip
        above is the smallest version of it, and it is all the next exercise needs.
      </p>

      <SectionHeader id="c1-exercise" title="Your turn: the tally, and the draw" />
      <p>
        Two functions, and they are the first two sections of the file you build across this
        course. The first counts pairs into a table. The second draws a character from one
        row of that table, which is the step the writing loop repeats. Everything in later
        chapters calls your own earlier code, so these two are the ones the rest sits on.
      </p>
      <ExerciseCard exercise={countPairsExercise} />
      <ExerciseCard exercise={sampleNextExercise} />

      <Recap
        items={[
          "Language modelling here is one game: given the text so far, guess the next character.",
          "The tally counts what followed what, one row per character. It is what everyone else calls a table of bigram counts.",
          `Over ${bench.corpus.train_chars.toLocaleString()} characters of Shakespeare, its rows come in three shapes: nearly certain (after q, u every time), dominated (after h, e ${(rows.h.top[0].share * 100).toFixed(1)} percent), and wide open (after a space, t at ${(rows[" "].top[0].share * 100).toFixed(1)} percent).`,
          "Drawing from a row in proportion, and feeding the answer back in, turns the tally into a writer. Taking the favourite every time turns it into a loop.",
          `Its best guess is right ${(fav.share * 100).toFixed(1)} percent of the time on held-out text, against ${(fav.baseline_share * 100).toFixed(1)} percent for always answering the most common character.`,
          `Its memory is ${corpusBench.corpus.vocab_size} rows: every context ending in the same character gets the same guesses, which is the limit the rest of the course spends its time removing.`,
        ]}
        deeper="Claude Shannon, Prediction and Entropy of Printed English (1951)"
        href="https://archive.org/details/bstj30-1-50"
      />
    </article>
  );
}
