// Chapter 3: Measuring surprise.
//
// Beat plan (CLAUDE.md, the authoring playbook):
//   1 the score chapter 1 ended with; a row divided by its total (one
//     paragraph: the reader has probability, the floor says so); the three
//     steps the hit rate cannot tell apart, restated in full as a table;
//   2 one number for the whole text, from the goal to the formula on four
//     made-up probabilities, with no metaphor and no name before its
//     mechanism (casebook 31);
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

/** Three steps from the held-back text, restated in full so nothing has to be
 * remembered from chapter 1: what the hit rate saw at each, and what it did
 * not. Two hits the hit rate counts as equal, and a miss it counts as nothing
 * more than a miss. */
function StepsTable() {
  const rows = [
    { after: hits.certain.row, fav: hits.certain.favourite, next: hits.certain.favourite, p: hits.certain.prob, hit: true },
    { after: hits.open.row, fav: hits.open.favourite, next: hits.open.favourite, p: hits.open.prob, hit: true },
    { after: hits.miss.row, fav: hits.miss.favourite, next: hits.miss.actual, p: hits.miss.prob, hit: false },
  ];
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          Three steps, each a character and the one that came after it in the held-back
          text, with the tally's row for the first character. The hit rate reads only the
          last column. The probability column is what it never looks at: on the first hit
          the row had put everything on <C ch={hits.certain.favourite} />, on the second it
          had put {pct(hits.open.prob)} percent on <C ch={hits.open.favourite} /> and was
          right anyway, and on the miss it had put {(hits.miss.prob * 100).toFixed(2)}{" "}
          percent on <C ch={hits.miss.actual} />, small but not nothing.
        </caption>
        <thead>
          <tr>
            <th scope="col">after</th>
            <th scope="col">the row's favourite</th>
            <th scope="col">what came next</th>
            <th scope="col">probability the row gave it</th>
            <th scope="col">the hit rate says</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.after + r.next}>
              <td>
                <C ch={r.after} />
              </td>
              <td>
                <C ch={r.fav} />
              </td>
              <td>
                <C ch={r.next} />
              </td>
              <td>{f4(r.p)}</td>
              <td>{r.hit ? "hit" : "miss"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The worked example: four made-up probabilities, their product, and the
 * same four written as powers of one half so the exponents add. Every number
 * in it is computed by the bench from the four probabilities. */
function WorkedTable() {
  const ex = bench.example;
  const fraction = (p: number) => (p === 1 ? "1" : `1/${Math.round(1 / p)}`);
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          Four steps with made-up probabilities, chosen so the arithmetic can be done by
          hand. Each probability is written as a power of 1/2, and the exponents are the
          column that adds: {ex.exponents.map((x) => x.toFixed(0)).join(" + ")} ={" "}
          {ex.total_bits.toFixed(0)}, so the product is (1/2)^{ex.total_bits.toFixed(0)},
          which is 1/{ex.product_denominator}.
        </caption>
        <thead>
          <tr>
            <th scope="col">step</th>
            <th scope="col">probability given to what came next</th>
            <th scope="col">as a power of 1/2</th>
            <th scope="col">exponent</th>
          </tr>
        </thead>
        <tbody>
          {ex.probs.map((p, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{fraction(p)}</td>
              <td>(1/2)^{ex.exponents[i].toFixed(0)}</td>
              <td>{ex.exponents[i].toFixed(0)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">all four</th>
            <td>product: 1/{ex.product_denominator}</td>
            <td>(1/2)^{ex.total_bits.toFixed(0)}</td>
            <td>sum: {ex.total_bits.toFixed(0)}</td>
          </tr>
          <tr>
            <th scope="row">per character</th>
            <td>{ex.per_char_prob.toFixed(3)}</td>
            <td>(1/2)^{ex.per_char_bits}</td>
            <td>
              {ex.total_bits.toFixed(0)} / {ex.probs.length} = {ex.per_char_bits}
            </td>
          </tr>
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
        <C ch={hits.open.favourite} /> after a space at {f4(hits.open.prob)} is{" "}
        {f2(hits.open.bits)} bits; <C ch={hits.miss.actual} /> after <C ch={hits.miss.row} />{" "}
        at {f4(hits.miss.prob)} is {f2(hits.miss.bits)}
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
      "guessing evenly is log2 of the vocabulary size on every step, whatever the text",
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
        One step of bookkeeping first. The tally's rows are counts, and dividing a row by
        its total turns the counts into probabilities: the row for <C ch={row.char} />{" "}
        holds {n(row.total)} followers, {n(row.entries[0].count)} of them{" "}
        <C ch={row.entries[0].char} />, so <C ch={row.entries[0].char} /> after{" "}
        <C ch={row.char} /> has probability {f4(row.entries[0].count / row.total)}. Chapter 1
        called these shares and wrote them in percent; from here the word is{" "}
        <b>probability</b>. The division changes nothing the tally knows, and it puts
        every row on one scale, so a probability after <code>q</code>, whose row holds{" "}
        {n(qRow.total)} counts, can be set beside one after a space, whose row holds{" "}
        {n(spaceRow.total)}.
      </p>
      <RowFigure />
      <p>
        The hit rate reads one thing per step: was the row's favourite the character that
        came next. Three steps from the held-back text, restated in full, show what that
        leaves out.
      </p>
      <StepsTable />
      <p>
        On the first hit the row had everything on <C ch={hits.certain.favourite} />, and on
        the second it had {pct(hits.open.prob)} percent on <C ch={hits.open.favourite} /> and
        was right anyway; the hit rate scores those the same. On the miss the row had{" "}
        {(hits.miss.prob * 100).toFixed(2)} percent on <C ch={hits.miss.actual} />, and the
        hit rate scores that the same as a row that had none. So there are two questions,
        and chapter 1 answered the first. How often was the favourite right. And how much
        probability did the row give what actually happened, step after step.
      </p>

      <SectionHeader id="c3-surprise" title="One number for the whole text" />
      <p>
        The raw material of the second question is one probability per step: the one the
        row gave the character that actually came next. The score has to combine{" "}
        {n(bench.example.val_steps)} of them into one number, and that number has to be
        comparable between two guessers. Start with four steps and made-up probabilities,
        small enough to work by hand:{" "}
        {bench.example.probs.map((p) => (p === 1 ? "1" : `1/${Math.round(1 / p)}`)).join(", ")}.
      </p>
      <p>
        The probability the guesser gave to those four characters coming out in that order
        is the product, 1/{bench.example.product_denominator}, the same way the chance of
        four coin flips is the product of four halves. That is the honest combined number,
        and it has two problems. Over the whole tenth it is a product of{" "}
        {n(bench.example.val_steps)} fractions, a decimal with about{" "}
        {n(Math.round(bench.example.val_decimal_digits / 1000) * 1000)} zeros after the
        point, which cannot be printed
        and cannot be compared by eye. And "per character" is awkward for a product: the one
        probability that, repeated on all four steps, gives the same 1/
        {bench.example.product_denominator} is the number whose fourth power is 1/
        {bench.example.product_denominator}, about {bench.example.per_char_prob.toFixed(3)},
        a fourth root. For the tenth it would be a {n(bench.example.val_steps)}th root.
      </p>
      <p>
        Both problems go away if every probability is written as a power of 1/2. 1/2 is
        (1/2)<sup>1</sup>, 1/16 is (1/2)<sup>4</sup> because 2 × 2 × 2 × 2 is 16, and 1 is
        (1/2)<sup>0</sup>, because anything to the power 0 is 1.
      </p>
      <WorkedTable />
      <p>
        Multiplying powers of the same base adds the exponents, so the product of the four
        is (1/2)<sup>{bench.example.total_bits.toFixed(0)}</sup>, which is 1/
        {bench.example.product_denominator}, and four multiplications became one addition:{" "}
        {bench.example.exponents.map((x) => x.toFixed(0)).join(" + ")} ={" "}
        {bench.example.total_bits.toFixed(0)}. Per character, {bench.example.total_bits.toFixed(0)}{" "}
        over {bench.example.probs.length} is {bench.example.per_char_bits}, and (1/2)
        <sup>{bench.example.per_char_bits}</sup> is {bench.example.per_char_prob.toFixed(3)},
        the same fourth root as before, reached by a division. Products became sums and
        roots became divisions, and that is the whole reason for writing probabilities this
        way.
      </p>
      <p>
        A second guesser gives 1/4 on every one of the same four steps. 1/4 is (1/2)
        <sup>2</sup>, so its exponents are{" "}
        {bench.example.second_exponents.map((x) => x.toFixed(0)).join(", ")}, the sum is{" "}
        {bench.example.second_total_bits.toFixed(0)}, and per character it is{" "}
        {bench.example.second_per_char_bits}. The first guesser did better: {bench.example.per_char_bits}{" "}
        is smaller than {bench.example.second_per_char_bits}, because 1/
        {bench.example.product_denominator} is larger than 1/
        {bench.example.second_product_denominator}. Smaller is better, because a smaller
        exponent means the guesser gave the whole text a larger probability.
      </p>
      <p>
        The exponent is what everyone calls <b>bits</b>. A probability of (1/2)<sup>k</sup>{" "}
        is k bits: 1/2 is 1 bit, 1/4 is 2, 1/16 is 4, and 1 is 0 bits. For a probability
        that is not a tidy power of 1/2 the exponent is a fraction: <C ch={row.entries[0].char} />{" "}
        after <C ch={row.char} /> at {f4(row.entries[0].prob)} is {f2(row.entries[0].bits)} bits,
        because (1/2)<sup>{f2(row.entries[0].bits)}</sup> is {f4(row.entries[0].prob)}. Finding
        the exponent for any probability is what the base-2 logarithm does, with the sign
        flipped, because the exponent of a number below 1 comes out negative:
      </p>
      <Eq
        tex={"\\text{surprise} = -\\log_2 p"}
        gloss="The exponent k for which (1/2) to the power k equals p. A probability of 1 is 0 bits, 1/2 is 1 bit, and each halving adds one."
      />
      <p>
        The <code>log</code> is said "log", the small 2 is its base, and <code>p</code> is
        the probability. In code the same line is <code>-np.log2(p)</code>, and the bench
        that produced every number on this page computes it that way.
      </p>
      <p>
        Now the three steps from the table above, in bits. <C ch={hits.certain.favourite} />{" "}
        after <code>q</code> at probability {f4(hits.certain.prob)} is {f2(hits.certain.bits)}{" "}
        bits. <C ch={hits.open.favourite} /> after a space at {f4(hits.open.prob)} is{" "}
        {f2(hits.open.bits)} bits. <C ch={hits.miss.actual} /> after <C ch={hits.miss.row} />{" "}
        at {f4(hits.miss.prob)} is {f2(hits.miss.bits)} bits. The two hits the hit rate
        counted as equal are {f2(hits.certain.bits)} and {f2(hits.open.bits)}, and the miss
        is a large finite number rather than a cross.
      </p>
      <p>
        This course calls a step's bits its <b>surprise</b>. Everyone else calls the same
        number the log loss, or, in information theory, the self-information of the event.
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
        then <C ch={unseen.first_pair[1]} /> gets {f4(unseen.first_prob)}, which is{" "}
        {f2(unseen.first_bits)} bits, large and finite.
      </p>
      <p>
        The 1 is a free design choice, and it is this course's. The field calls the method{" "}
        <b>additive smoothing</b>, or Laplace smoothing, and writes the amount added as{" "}
        <b>alpha</b>. Its price falls on small rows. The <code>q</code> row holds{" "}
        {n(qRow.total)} counts, and giving each of its {row.vocab_size} cells one more takes{" "}
        <C ch={hits.certain.favourite} /> from probability {f4(hits.certain.prob)} to{" "}
        {f4(hits.certain.prob_smoothed)}, so that step is now{" "}
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
          {(unseen.worst_bits / unseen.of).toFixed(5)} bits to the average. An average is forgiving of a few disasters and unforgiving of a small amount
          added on every step, which is why smoothing is judged by what it does to common
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
        {row.vocab_size} characters gets probability 1/{row.vocab_size}, so every step is
        log2({row.vocab_size}), which is {f4(ladder.uniform_bits)} bits, whatever the text
        says. A guesser that spreads its probability evenly cannot do better or
        worse than that, which makes it the ceiling every model is measured against.
      </p>
      <p>
        The middle rung uses one fact about the corpus: how often each character occurs
        at all, regardless of what came before. Guessing every next character from that
        one list scores {f4(ladder.unigram_bits)} bits on the held-back text. Knowing that{" "}
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
        gloss={`Giving every character probability 1 over ${row.vocab_size} is log2 of ${row.vocab_size} bits on every step, which is the ceiling.`}
      />
      <ReceiptsTable />

      <SectionHeader id="c3-exercise" title="Your turn: score the tally" />
      <p>
        One more section of your file. Three short functions turn the tally your{" "}
        <code>count_pairs</code> built into probabilities, turn every step of a stream of
        ids into its bits, and average them. The last of them is the number on the ladder,
        and chapter 10's training loop calls the same idea on every step.
      </p>
      <ExerciseCard exercise={avgSurpriseExercise} />

      <Recap
        items={[
          `A row of the tally divided by its total is a row of probabilities: ${row.vocab_size} numbers that sum to 1, ${charLabel(row.entries[0].char)} at ${f4(row.entries[0].count / row.total)} after ${row.char}.`,
          `A step's surprise is the exponent of the probability given to what actually came next, written as a power of 1/2, which is what minus log2 computes. Exponents add where probabilities multiply, so a whole text's score is a sum divided by its steps. A probability of 1 is 0 bits, 1/2 is 1 bit, and each halving adds one: the right guess after a space was ${f2(hits.open.bits)} bits, the wrong one after h was ${f2(hits.miss.bits)}.`,
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
