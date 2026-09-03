// Chapter 3: Measuring surprise.
//
// Beat plan (CLAUDE.md, the authoring playbook):
//   1 the score chapter 1 ended with, and the two hits it cannot tell apart;
//   2 one row of the tally divided by its total, and the field's word for
//     what the numbers now are;
//   3 what a guess costs, numbers first, then the log and its glyph;
//   4 the first eight steps of the held-back text as a log, then the meter;
//   5 the pair the counting never saw, infinite surprise, and smoothing as a
//     labelled choice with its price;
//   6 the same scorer on the text it counted and the text it did not, which
//     is what chapter 1 held the tenth back for;
//   7 the ladder's first three rungs, then the same thing written down with
//     receipts;
//   8 the exercise.
//
// Every number in the prose comes from tools/bench/chapter3.py, or is quoted
// from chapter 1's bench where the chapter quotes chapter 1. The meter
// computes live and its numbers are never quoted (CLAUDE.md, two engines).
//
// Structure note: the heading and every paragraph are DIRECT children of
// article.module, which is what the stylesheet's measure rules select.

import { useEffect, type ReactNode } from "react";
import { AfterThis, Aside, Figure, ModuleToc, Recap, SectionHeader } from "../components/ModuleBits";
import { Eq } from "../components/Math";
import { ExerciseCard } from "../components/ExerciseCard";
import { avgSurpriseExercise } from "../exercises/avg-surprise";
import { SurpriseMeter } from "./interactives/SurpriseMeter";
import { Ladder } from "./interactives/Ladder";
import { charLabel } from "./interactives/utils";
import bench from "../bench/chapter3.json";
import bench1 from "../bench/chapter1.json";

const hits = bench.hits;
const row = bench.row;
const walk = bench.walk;
const unseen = bench.unseen;
const held = bench.heldout;
const ladder = bench.ladder;
const fav = bench1.favourite_guess;
const qRow = bench1.rows.q;
const spaceRow = bench1.rows[" "];

const n = (x: number) => x.toLocaleString();
const f4 = (x: number) => x.toFixed(4);
const f2 = (x: number) => x.toFixed(2);
const pct = (x: number) => (x * 100).toFixed(1);
const C = ({ ch }: { ch: string }) => <code>{charLabel(ch)}</code>;

/** One row of the tally, as counts and as the counts divided by the row's
 * total. The probabilities are computed here from the bench's integer counts,
 * so the division the prose describes is the division the page shows. */
function RowFigure() {
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          The row for <code>{row.char}</code>: what followed it in the training text,
          as counts and as probabilities. The {row.shown} most common followers are
          shown and the other {row.vocab_size - row.shown} are summed. Every probability
          is its count divided by the row's total of {n(row.total)}, and the{" "}
          {row.vocab_size} of them sum to 1.
        </caption>
        <thead>
          <tr>
            <th scope="col">next character</th>
            <th scope="col">count</th>
            <th scope="col">probability</th>
          </tr>
        </thead>
        <tbody>
          {row.entries.map((e) => (
            <tr key={e.char}>
              <td>
                <C ch={e.char} />
              </td>
              <td>{n(e.count)}</td>
              <td>{f4(e.count / row.total)}</td>
            </tr>
          ))}
          <tr>
            <td>the other {row.vocab_size - row.shown}</td>
            <td>{n(row.rest_count)}</td>
            <td>{f4(row.rest_count / row.total)}</td>
          </tr>
          <tr>
            <th scope="row">the whole row</th>
            <td>{n(row.total)}</td>
            <td>{f4(row.sum)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** What a probability costs, at the values a reader can check by hand. */
function BitsTable() {
  const fraction = (p: number) => (p === 1 ? "1" : `1/${Math.round(1 / p)}`);
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          What a guess costs when the character it was given this probability is the one
          that came next. Each halving of the probability adds one bit.
        </caption>
        <thead>
          <tr>
            <th scope="col">probability given to what happened</th>
            <th scope="col">cost in bits</th>
          </tr>
        </thead>
        <tbody>
          {bench.bits_table.map((r) => (
            <tr key={r.prob}>
              <td>{fraction(r.prob)}</td>
              <td>{r.bits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The meter's first eight steps, logged before the meter runs, so each row
 * is a rule the reader can apply to predict the next one. */
function WalkTable() {
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          The first {walk.length} steps of the held-back text, unsmoothed. Probability is
          the pair's count over the row's total, surprise is minus log2 of it, and the
          average is the surprises so far divided by the steps so far.
        </caption>
        <thead>
          <tr>
            <th scope="col">step</th>
            <th scope="col">just read</th>
            <th scope="col">came next</th>
            <th scope="col">count / row total</th>
            <th scope="col">probability</th>
            <th scope="col">surprise</th>
            <th scope="col">average so far</th>
          </tr>
        </thead>
        <tbody>
          {walk.map((w) => (
            <tr key={w.position}>
              <td>{w.position}</td>
              <td>
                <C ch={w.current} />
              </td>
              <td>
                <C ch={w.next} />
              </td>
              <td>
                {n(w.count)} / {n(w.total)}
              </td>
              <td>{f4(w.prob)}</td>
              <td>{f2(w.bits)}</td>
              <td>{f2(w.running)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The same scorer on the text the tally counted and the text it never read. */
function HeldOutTable() {
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          The smoothed tally, scored twice. Both numbers are bits per character; the
          difference is which text was scored.
        </caption>
        <thead>
          <tr>
            <th scope="col">text scored</th>
            <th scope="col">characters</th>
            <th scope="col">bits per character</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>the nine tenths it counted</td>
            <td>{n(held.train_chars)}</td>
            <td>{f4(held.train_bits)}</td>
          </tr>
          <tr>
            <td>the tenth it never read</td>
            <td>{n(held.val_chars)}</td>
            <td>{f4(held.val_bits)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** The receipts: each formal statement beside the number that came out of it
 * earlier on the page. */
function ReceiptsTable() {
  const rows: [string, ReactNode][] = [
    [
      "a row's probabilities are its counts over its total",
      <>
        after <C ch={row.char} />, <C ch={row.entries[0].char} /> is {n(row.entries[0].count)}{" "}
        of {n(row.total)}, which is {f4(row.entries[0].count / row.total)}
      </>,
    ],
    [
      "surprise is minus log2 of the probability given to what came next",
      <>
        <C ch={hits.open.favourite} /> after a space at {f4(hits.open.prob)} cost{" "}
        {f2(hits.open.bits)} bits; <C ch={hits.miss.actual} /> after <C ch={hits.miss.row} />{" "}
        at {f4(hits.miss.prob)} cost {f2(hits.miss.bits)}
      </>,
    ],
    [
      "with alpha added to every cell, no probability is 0",
      <>
        <C ch={unseen.first_pair[0]} /> then <C ch={unseen.first_pair[1]} /> goes from 0, and
        infinite surprise, to 1 in {n(unseen.first_row_total + row.vocab_size)}, which is{" "}
        {f2(unseen.first_bits)} bits
      </>,
    ],
    [
      "the loss is the average surprise over every step, in bits per character",
      <>
        {f4(held.val_bits)} over the {n(held.val_chars - 1)} steps of the held-back tenth,
        the ladder's bottom rung
      </>,
    ],
    [
      "guessing evenly costs log2 of the vocabulary size, whatever the text",
      <>
        log2({row.vocab_size}) is {f4(ladder.uniform_bits)}, the ladder's top rung
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

export function Chapter3() {
  useEffect(() => {
    document.title = "Measuring surprise · Transformers · Moving Parts";
  }, []);

  return (
    <article className="module">
      <h2>Chapter 3: Measuring surprise</h2>

      <AfterThis
        items={[
          "Turn a row of the tally into probabilities, and say what changed and what did not.",
          "Score any guesser in bits per character on text it never read, and say why a hit rate is not that score.",
          "Read the ladder, and place the counted tally on it.",
        ]}
      />
      <ModuleToc />

      <SectionHeader id="c3-score" title="The score you already have" />
      <p>
        Chapter 1 ended with a score. On the tenth of the corpus the counting never read,
        the tally's single best guess for the next character was right{" "}
        {n(fav.hits)} times out of {n(fav.of)}, {pct(fav.share)} percent, against{" "}
        {pct(fav.baseline_share)} percent for always answering a space. That number is
        where this chapter starts.
      </p>
      <p>
        Two rows from chapter 1's table show what it cannot see. After <code>q</code>,{" "}
        <C ch={qRow.top[0].char} /> followed {n(qRow.total)} times out of {n(qRow.total)}.
        After a space, <C ch={spaceRow.top[0].char} /> followed {pct(spaceRow.top[0].share)}{" "}
        percent of the time, and was still the row's favourite, because nothing else
        followed a space more often. When the next character really is{" "}
        <C ch={qRow.top[0].char} /> after <code>q</code>, the tally's guess was as good as a
        guess gets. When it really is <C ch={spaceRow.top[0].char} /> after a space, the
        tally had put {pct(1 - spaceRow.top[0].share)} percent of the row on other
        characters and was right anyway. The hit rate counts both as one hit.
      </p>
      <p>
        A miss is the other half of the same problem. The first time <C ch={hits.miss.row} />{" "}
        is followed by <C ch={hits.miss.actual} /> in the held-back text, the favourite{" "}
        <C ch={hits.miss.favourite} /> is wrong, and the hit rate records a miss and nothing
        more. But the row had not said <C ch={hits.miss.actual} /> was impossible: it had
        seen it after <C ch={hits.miss.row} /> {n(hits.miss.count)} times in{" "}
        {n(hits.miss.total)}. A score that reads the whole row can charge for that too, a
        large number rather than a cross. So there are two questions here, and chapter 1
        answered the first: how often was the favourite right, and how much of the row sat
        on what actually happened.
      </p>

      <SectionHeader id="c3-probs" title="From counts to probabilities" />
      <p>
        The tally's rows are counts, and a count only means something next to its row's
        total. The row for <C ch={row.char} /> holds {n(row.total)} followers,{" "}
        {n(row.entries[0].count)} of them <C ch={row.entries[0].char} />. Divide every count
        in the row by {n(row.total)} and the row becomes {row.vocab_size} numbers between 0
        and 1: <C ch={row.entries[0].char} /> at {f4(row.entries[0].count / row.total)},
        then <C ch={row.entries[1].char} /> at {f4(row.entries[1].count / row.total)}, down
        to followers so rare they round to 0. The {row.vocab_size} numbers sum to 1, because
        the counts summed to the total.
      </p>
      <RowFigure />
      <p>
        A number between 0 and 1 that says how likely something is, in a row that sums to
        1, is a <b>probability</b>. Chapter 1's shares were probabilities written in
        percent, and from here the prose says probability.
      </p>
      <p>
        Nothing the tally knew has changed. The row still says what followed{" "}
        <C ch={row.char} /> and how often. What the division bought is one scale for every
        row: the <code>q</code> row holds {n(qRow.total)} counts and the space row{" "}
        {n(spaceRow.total)}, so their raw counts could never be compared, and their
        probabilities can.
      </p>

      <SectionHeader id="c3-surprise" title="What a guess costs" />
      <p>
        The score charges one number per step, after the fact: how much probability did
        the row give the character that actually came next. The numbers first. A
        probability of 1 costs nothing. A probability of 1/2 costs 1 bit. A probability of
        1/4 costs 2 bits, 1/8 costs 3, and 1/1024 costs 10.
      </p>
      <BitsTable />
      <p>
        Every halving of the probability adds one bit, and that is what a bit is: the
        answer to one yes-or-no question. A character the row gave 1/8 to is one the row
        would have needed three yes-or-no answers to pin down, so being told it happened is
        worth three bits of news. The function with that property is the logarithm to
        base 2, with its sign flipped so that the cost comes out positive:
      </p>
      <Eq
        tex={"\\text{surprise} = -\\log_2 p"}
        gloss="The surprise of what happened is minus the base-2 logarithm of the probability that was given to it: a probability of 1 costs 0 bits, and every halving adds one."
      />
      <p>
        The <code>log</code> is said "log", the small 2 is its base, and{" "}
        <code>p</code> is the probability. In code the same line is{" "}
        <code>-np.log2(p)</code>, and the bench that produced every number on this page
        computes it that way.
      </p>
      <p>
        Chapter 1's two hits come apart at once. After <code>q</code>,{" "}
        <C ch={hits.certain.favourite} /> had probability {f4(hits.certain.prob)}, so that hit
        cost {f2(hits.certain.bits)} bits. After a space, <C ch={hits.open.favourite} /> had
        probability {f4(hits.open.prob)}, so that hit cost {f2(hits.open.bits)} bits: nearly
        three yes-or-no questions' worth, for a guess that was right. And the miss:{" "}
        <C ch={hits.miss.actual} /> after <C ch={hits.miss.row} /> at probability{" "}
        {f4(hits.miss.prob)} cost {f2(hits.miss.bits)} bits. A miss is expensive and finite,
        and two misses can cost different amounts.
      </p>
      <p>
        This course calls the number <b>surprise</b>. Everyone else calls it the log loss,
        or, in information theory, the self-information of the event.
      </p>

      <SectionHeader id="c3-meter" title="Reading the held-back text" />
      <p>
        Score every step of the held-back tenth this way and take the average. The tenth
        opens <code>{walk.map((w) => charLabel(w.current)).join("")}{charLabel(walk[walk.length - 1].next)}</code>, so its first step is a
        newline followed by a newline, which the newline row gave probability{" "}
        {f4(walk[0].prob)}: {f2(walk[0].bits)} bits. The first {walk.length} steps, logged:
      </p>
      <WalkTable />
      <p>
        Each row of the log is the same three rules. The count over the row total is the
        probability; minus log2 of the probability is the surprise; the surprises so far
        over the steps so far is the average. After {walk.length} steps the average is{" "}
        {f2(walk[walk.length - 1].running)} bits, and it has not settled, because{" "}
        {walk.length} steps is nothing. The panel below keeps going.
      </p>
      <SurpriseMeter />
      <p>
        Run it. The average moves a great deal over the first few hundred steps and then
        hardly at all, which is what an average over a hundred thousand steps does. Where
        it settles is this tally's score on Shakespeare it never read.
      </p>

      <SectionHeader id="c3-unseen" title="The pair the counting never saw" />
      <p>
        Press "Jump to the first pair the counting never saw". It is step{" "}
        {n(unseen.first_position)}: <C ch={unseen.first_pair[0]} /> followed by{" "}
        <C ch={unseen.first_pair[1]} />. In {n(held.train_chars)} characters of training
        text that pair never occurred, so its count is 0, its probability is 0 over{" "}
        {n(unseen.first_row_total)}, and its surprise is minus log2 of 0, which is infinite.
        One infinite step makes the average infinite from then on, and the meter's line
        leaves the top of the plot. This is not a rare accident: {n(unseen.count)} of the{" "}
        {n(unseen.of)} steps in the held-back text are pairs the training text never
        produced.
      </p>
      <p>
        A tally that gives 0 to anything it has not seen cannot be scored on new text at
        all, because it has staked everything on the past being complete. The fix is to
        give every cell a little probability before dividing: add {row.alpha} to every
        count in the table. The <C ch={row.char} /> row's total becomes{" "}
        {n(row.smoothed_total)} instead of {n(row.total)}, and{" "}
        <C ch={row.entries[0].char} /> moves from {f4(row.entries[0].count / row.total)} to{" "}
        {f4(row.entries[0].prob_smoothed)}. The row still sums to 1. A pair the counting
        never saw now has probability 1 over the row's new total: <C ch={unseen.first_pair[0]} />{" "}
        then <C ch={unseen.first_pair[1]} /> gets {f4(unseen.first_prob)}, which costs{" "}
        {f2(unseen.first_bits)} bits, expensive and finite.
      </p>
      <p>
        The 1 is a free design choice, and it is this course's. The field calls the method{" "}
        <b>additive smoothing</b>, or Laplace smoothing, and writes the amount added as{" "}
        <b>alpha</b>. Its price falls on small rows. The <code>q</code> row holds{" "}
        {n(qRow.total)} counts, and giving each of its {row.vocab_size} cells one more takes{" "}
        <C ch={hits.certain.favourite} /> from probability {f4(hits.certain.prob)} to{" "}
        {f4(hits.certain.prob_smoothed)}, so that step now costs{" "}
        {f2(hits.certain.bits_smoothed)} bits rather than {f2(hits.certain.bits)}. On a row
        of forty thousand the same {row.vocab_size} counts change the third decimal. Turn
        smoothing on in the meter and run it to the end: the average now exists, and it
        settles on the dashed line.
      </p>
      <Aside>
        <p>
          The worst single step in the held-back text is <C ch={unseen.worst_pair[0]} />{" "}
          followed by <C ch={unseen.worst_pair[1]} />, at {f2(unseen.worst_bits)} bits with
          smoothing on. That is one step out of {n(unseen.of)}, and on its own it adds{" "}
          {(unseen.worst_bits / unseen.of).toFixed(5)} bits to the average. An average is forgiving of a few disasters and unforgiving of a small cost
          paid on every step, which is why smoothing is priced by what it does to common
          rows, not rare ones.
        </p>
      </Aside>

      <SectionHeader id="c3-heldout" title="Why the tenth was held back" />
      <p>
        Chapter 1 counted nine tenths of the corpus and held the last tenth back, with a
        promise to say what for. Score the smoothed tally on both:
      </p>
      <HeldOutTable />
      <p>
        The tally does better on the text it was built from, by {f2(held.gap)} bits a
        character. Every count in it came from that text, so on that text it is partly
        remembering rather than guessing, and a score taken there flatters it. The
        held-back score is the one that says how the tally would do on Shakespeare it has
        not met, which is the only thing a guesser is for. Every model in this course is
        scored this way. The nine tenths a model learns from is the <b>training</b> text,
        the tenth it never sees is the <b>validation</b> text, and the ladder shows
        validation numbers only.
      </p>
      <p>
        The gap is small here because a table of {n(row.vocab_size * row.vocab_size)}{" "}
        counts has little room to remember anything. A model with tens of thousands of
        parameters has more, and chapter 10 watches its two scores come apart during
        training.
      </p>

      <SectionHeader id="c3-ladder" title="The ladder, and the same thing written down" />
      <p>
        The course keeps one figure of this number, and every chapter from here adds a
        rung to it. This course calls the figure <b>the ladder</b>, a word of its own with
        nothing in the field to look up. It opens with three rungs.
      </p>
      <Figure
        caption={`The ladder: bits per character on the held-back tenth, one rung per way of guessing, lower is better. The top rung is the ceiling, guessing evenly over ${row.vocab_size} characters. The middle rung guesses from how common each character is overall. The bottom rung is chapter 1's tally, smoothed. Every rung is the same measurement on the same ${n(held.val_chars)} characters.`}
      >
        <Ladder rungs={ladder.rungs} />
      </Figure>
      <p>
        The top rung is guessing with no information at all. Every one of the{" "}
        {row.vocab_size} characters gets probability 1/{row.vocab_size}, so every step
        costs log2({row.vocab_size}), which is {f4(ladder.uniform_bits)} bits, whatever the
        text says. A guesser that spreads its probability evenly cannot do better or
        worse than that, which makes it the ceiling every model is measured against.
      </p>
      <p>
        The middle rung uses one fact about the corpus: how often each character occurs
        at all, regardless of what came before. Guessing every next character from that
        one list costs {f4(ladder.unigram_bits)} bits on the held-back text. Knowing that{" "}
        <code>e</code> is common and <code>z</code> is rare is worth{" "}
        {f2(ladder.uniform_bits - ladder.unigram_bits)} bits a character over knowing
        nothing.
      </p>
      <p>
        The bottom rung is the tally, at {f4(ladder.bigram_val_bits)}. Knowing the one
        character before is worth another {f2(ladder.unigram_bits - ladder.bigram_val_bits)}{" "}
        bits. Chapter 1's score said the tally was about{" "}
        {(fav.share / fav.baseline_share).toFixed(1)} times better than always guessing a
        space; the ladder says how much better in a unit that adds up, bits saved per
        character, and every later model's rung is read the same way.
      </p>
      <p>
        Now the same thing written down. The job here is recognition, not derivation:
        these four lines are what the meter did, with the meter's own values beside them.
        Course one drove a number called the loss downhill. This course's loss is the
        third line, and its unit is bits.
      </p>
      <Eq
        tex={`p(b \\mid a) = \\frac{\\text{count}(a, b) + \\alpha}{\\text{total}(a) + \\alpha \\cdot ${row.vocab_size}}`}
        gloss={`The probability of b coming next after a is the pair's count plus alpha, over the row's total plus alpha for each of the ${row.vocab_size} cells. The bar is said "given": b given a. With alpha 0 it is the plain division of the row figure.`}
      />
      <Eq
        tex={"s_i = -\\log_2 p(\\text{ids}_{i+1} \\mid \\text{ids}_i)"}
        gloss="The surprise at step i is minus log2 of the probability the table gave the character at position i plus 1, given the one at position i."
      />
      <Eq
        tex={"\\text{loss} = \\frac{1}{N} \\sum_{i=1}^{N} s_i"}
        gloss="The loss is the average of the surprises over all N steps of the text being scored, in bits per character. It is the number on the ladder."
      />
      <Eq
        tex={`-\\log_2 \\frac{1}{${row.vocab_size}} = \\log_2 ${row.vocab_size} = ${f4(ladder.uniform_bits)}`}
        gloss={`Giving every character probability 1 over ${row.vocab_size} costs log2 of ${row.vocab_size} on every step, which is the ceiling.`}
      />
      <ReceiptsTable />

      <SectionHeader id="c3-exercise" title="Your turn: score the tally" />
      <p>
        One more section of your file. Three short functions turn the tally your{" "}
        <code>count_pairs</code> built into probabilities, charge a stream of ids for what
        came next, and average the charges. The last of them is the number on the ladder,
        and chapter 10's training loop calls the same idea on every step.
      </p>
      <ExerciseCard exercise={avgSurpriseExercise} />

      <Recap
        items={[
          `A row of the tally divided by its total is a row of probabilities: ${row.vocab_size} numbers that sum to 1, ${charLabel(row.entries[0].char)} at ${f4(row.entries[0].count / row.total)} after ${row.char}.`,
          `Surprise is minus log2 of the probability given to what actually came next. A probability of 1 costs 0 bits and every halving adds one: a right guess after a space cost ${f2(hits.open.bits)} bits, a wrong one after h cost ${f2(hits.miss.bits)}.`,
          "The loss is average surprise per character, in bits, over text the model never read. It is this course's unit from here to the last chapter.",
          `${n(unseen.count)} of the held-back text's ${n(unseen.of)} steps are pairs the training text never produced, so an unsmoothed tally scores infinite surprise. Adding ${row.alpha} to every cell keeps every score finite, at a price that falls on small rows.`,
          `The tally scores ${f4(held.train_bits)} bits on the text it counted and ${f4(held.val_bits)} on the tenth it never read. Only the second says what it would do on new text, and the ladder shows only that kind of number.`,
          `The ladder: ${f2(ladder.uniform_bits)} bits for guessing evenly, ${f2(ladder.unigram_bits)} for letter frequency alone, ${f2(ladder.bigram_val_bits)} for the counted tally.`,
        ]}
        deeper='Chris Olah, "Visual Information Theory"'
        href="https://colah.github.io/posts/2015-09-Visual-Information/"
      />
    </article>
  );
}
