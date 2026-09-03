// Chapter 3: Measuring surprise.
//
// Beat plan (CLAUDE.md, the authoring playbook):
//   1 the score, in bits, with two figures carrying it (casebook 32): chapter
//     1's right-or-wrong beside the probability the row gave, on three steps
//     drawn as bars; then four made-up probabilities taken to one number by
//     two routes drawn side by side, multiply-and-root against add-and-divide,
//     with the names (bits, log) arriving after the routes (casebook 31);
//   4 the first eight steps of the held-back text as a log, then the meter;
//   5 the pair the counting never saw, infinite surprise, and smoothing as a
//     labelled choice with its price;
//   6 the same scorer on the text it counted and the text it did not, which
//     is what chapter 1 held the tenth back for;
//   7 the ladder's first three rungs, then the same thing written down with
//     receipts;
//   8 the exercise.
//   (Beats 2 and 3 of the first draft, a paragraph of division and a prose
//   walk through the four made-up steps, were folded into 1 as the two
//   figures; the numbering of the rest is kept.)
//
// Every number in the prose comes from tools/bench/chapter3.py, or is quoted
// from chapter 1's bench where the chapter quotes chapter 1. The meter
// computes live and its numbers are never quoted (CLAUDE.md, two engines).
//
// Structure note: the heading and every paragraph are DIRECT children of
// article.module, which is what the stylesheet's measure rules select.

import { useEffect, type ReactNode } from "react";
import { AfterThis, Aside, Figure, ModuleToc, Recap, SectionHeader, fig } from "../components/ModuleBits";
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

/** The row for a character, split in proportion to its counts. `parts` are the
 * shown followers, `rest` the summed remainder, `next` the character that
 * actually came next in the held-back text, drawn filled. `hidden` is a
 * follower buried inside the remainder (the miss: b after h is 23 counts in a
 * row of 46,390), drawn as a hairline at the bar's end so the figure has a
 * filled piece to point at. Every width is a count over the row's total. */
function RowBar({
  y,
  total,
  parts,
  rest,
  next,
  hidden,
}: {
  y: number;
  total: number;
  parts: { char: string; count: number }[];
  rest: number;
  next: string;
  hidden?: { char: string; count: number };
}) {
  const x0 = 104;
  const width = 228;
  const segs: { label: string; count: number; hit: boolean }[] = parts.map((e) => ({
    label: charLabel(e.char),
    count: e.count,
    hit: e.char === next,
  }));
  if (rest > 0) {
    const rest_shown = hidden ? rest - hidden.count : rest;
    segs.push({ label: "the rest", count: rest_shown, hit: false });
    if (hidden) segs.push({ label: charLabel(hidden.char), count: hidden.count, hit: true });
  }
  let x = x0;
  const out: ReactNode[] = [];
  for (const s of segs) {
    const w = Math.max((width * s.count) / total, 2);
    out.push(
      <rect key={`r${x}`} x={x} y={y - 11} width={w} height={22} className={s.hit ? "fig-box-accent" : "fig-box-fill"} />,
    );
    // A label needs room: one character fits in 16 units, "the rest" in 44.
    if (w > (s.label.length > 1 ? 44 : 16)) {
      out.push(
        <text key={`t${x}`} x={x + w / 2} y={y + 4} className={s.hit ? "fig-label fig-code fig-label-inverse" : "fig-note fig-code"} textAnchor="middle">
          {s.label}
        </text>,
      );
    }
    x += w;
  }
  return <>{out}</>;
}

/** Three steps from the held-back text, each with the tally's row for the
 * character just read drawn as a bar, the character that came next filled in,
 * and the two things a score could keep from it: chapter 1's right or wrong,
 * and this chapter's probability. Grid family: fixed bar width, the value
 * beside the cell. */
function StepsFigure() {
  const hRow = row.entries.map((e) => ({ char: e.char, count: e.count }));
  const spaceParts = spaceRow.top.map((e) => ({ char: e.char, count: e.count }));
  const spaceRest = spaceRow.total - spaceParts.reduce((a, e) => a + e.count, 0);
  const ys = [56, 116, 176];
  const steps = [
    { y: ys[0], after: hits.certain.row, next: hits.certain.favourite, count: hits.certain.count, total: hits.certain.total, prob: hits.certain.prob, hit: true },
    { y: ys[1], after: hits.open.row, next: hits.open.favourite, count: hits.open.count, total: hits.open.total, prob: hits.open.prob, hit: true },
    { y: ys[2], after: hits.miss.row, next: hits.miss.actual, count: hits.miss.count, total: hits.miss.total, prob: hits.miss.prob, hit: false },
  ];
  return (
    <Figure
      caption={`Three steps from the held-back text. Each bar is the tally's row for the character just read, split in proportion to its counts, with the character that actually came next filled in. The filled piece's width is that character's count over the row's total: ${n(hits.open.count)} of ${n(hits.open.total)} after a space is ${f4(hits.open.prob)}. Chapter 1 called the fraction a share and wrote it in percent; from here the word is probability. Chapter 1 kept the right-or-wrong column. This chapter keeps the last one.`}
    >
      <svg {...fig(0, 0, 600, 222)} className="c3-steps" role="img" aria-label="Three steps, each with the tally's row drawn as a bar and the character that came next filled in; chapter 1 recorded right or wrong, this chapter records the filled piece's width as a probability.">
        <text x="0" y="14" className="fig-note">
          the step
        </text>
        <text x="104" y="14" className="fig-note">
          the row for the character just read, by count
        </text>
        <text x="372" y="14" className="fig-note">
          chapter 1 wrote
        </text>
        <text x="462" y="14" className="fig-note">
          this chapter writes
        </text>
        <line x1="0" y1="22" x2="600" y2="22" className="fig-arrow" />
        <RowBar y={ys[0]} total={hits.certain.total} parts={[{ char: hits.certain.favourite, count: hits.certain.count }]} rest={0} next={hits.certain.favourite} />
        <RowBar y={ys[1]} total={spaceRow.total} parts={spaceParts} rest={spaceRest} next={hits.open.favourite} />
        <RowBar y={ys[2]} total={row.total} parts={hRow} rest={row.rest_count} next={hits.miss.actual} hidden={{ char: hits.miss.actual, count: hits.miss.count }} />
        {steps.map((s) => (
          <g key={s.after + s.next}>
            <text x="0" y={s.y + 4} className="fig-label fig-code">
              {charLabel(s.after)} then {charLabel(s.next)}
            </text>
            <text x="372" y={s.y + 4} className={s.hit ? "fig-label" : "fig-label fig-label-loss"}>
              {s.hit ? "right" : "wrong"}
            </text>
            <text x="462" y={s.y - 3} className="fig-note fig-code">
              {n(s.count)} / {n(s.total)}
            </text>
            <text x="462" y={s.y + 13} className="fig-label fig-code fig-label-accent">
              = {f4(s.prob)}
            </text>
          </g>
        ))}
        <text x="104" y="203" className="fig-note">
          filled: the character that came next, as wide as its count over the row total.
        </text>
        <text x="104" y="217" className="fig-note">
          After h, b is the hairline at the end of the bar.
        </text>
      </svg>
    </Figure>
  );
}

/** Four made-up per-step probabilities taken to one number per character by
 * two routes: multiply and take a root, or write each as a power of 1/2, add
 * the exponents and divide. Box-and-arrow family. Every number is the bench's. */
function RoutesFigure() {
  const ex = bench.example;
  const fraction = (p: number) => (p === 1 ? "1" : `1/${Math.round(1 / p)}`);
  const L = 0;
  const R = 290;
  const rowY = (i: number) => 52 + i * 22;
  const arrow = (x: number, y1: number, y2: number, label: string) => (
    <>
      <path d={`M${x} ${y1} V${y2}`} className="fig-arrow" markerEnd="url(#c3-arrow)" />
      <text x={x + 10} y={(y1 + y2) / 2 + 4} className="fig-note">
        {label}
      </text>
    </>
  );
  return (
    <Figure
      caption={`Two routes from four per-step probabilities to one number per character. Left: multiply them, then take the fourth root. Right: write each as a power of 1/2, add the exponents, then divide by four. Both land on ${ex.per_char_prob.toFixed(3)}, because (1/2) to the power ${ex.per_char_bits} is ${ex.per_char_prob.toFixed(3)}. The exponent column is the one this course keeps.`}
    >
      <svg {...fig(0, 0, 600, 268)} className="c3-routes" role="img" aria-label="Four probabilities combined two ways: multiplied and rooted on the left, written as powers of one half with the exponents added and divided on the right, reaching the same number per character.">
        <text x={L} y="14" className="fig-note">
          multiply the probabilities
        </text>
        <text x={R} y="14" className="fig-note">
          add the exponents of 1/2
        </text>
        <line x1="0" y1="22" x2="600" y2="22" className="fig-arrow" />
        {ex.probs.map((p, i) => (
          <g key={i}>
            <text x={L} y={rowY(i)} className="fig-note">
              step {i + 1}
            </text>
            <text x={L + 80} y={rowY(i)} className="fig-label fig-code">
              {fraction(p)}
            </text>
            <text x={R} y={rowY(i)} className="fig-note">
              step {i + 1}
            </text>
            <text x={R + 80} y={rowY(i)} className="fig-label fig-code">
              (1/2)^{ex.exponents[i].toFixed(0)}
            </text>
            <text x={R + 170} y={rowY(i)} className="fig-label fig-code fig-label-accent">
              {ex.exponents[i].toFixed(0)}
            </text>
          </g>
        ))}
        {arrow(L + 90, 142, 172, "multiply")}
        {arrow(R + 180, 142, 172, "add")}
        <text x={L} y="192" className="fig-note">
          all four
        </text>
        <text x={L + 80} y="192" className="fig-label fig-code">
          1/{ex.product_denominator}
        </text>
        <text x={R} y="192" className="fig-note">
          all four
        </text>
        <text x={R + 80} y="192" className="fig-label fig-code">
          (1/2)^{ex.total_bits.toFixed(0)}
        </text>
        <text x={R + 170} y="192" className="fig-label fig-code fig-label-accent">
          {ex.exponents.map((x) => x.toFixed(0)).join(" + ")} = {ex.total_bits.toFixed(0)}
        </text>
        {arrow(L + 90, 200, 230, "fourth root")}
        {arrow(R + 180, 200, 230, `divide by ${ex.probs.length}`)}
        <text x={L} y="252" className="fig-note">
          per character
        </text>
        <text x={L + 80} y="252" className="fig-label fig-code">
          {ex.per_char_prob.toFixed(3)}
        </text>
        <text x={R} y="252" className="fig-note">
          per character
        </text>
        <text x={R + 80} y="252" className="fig-label fig-code">
          (1/2)^{ex.per_char_bits}
        </text>
        <text x={R + 170} y="252" className="fig-label fig-code fig-label-accent">
          {ex.total_bits.toFixed(0)} / {ex.probs.length} = {ex.per_char_bits} bits
        </text>
        <path d={`M${L + 140} 248 H${R - 12}`} className="fig-arrow fig-arrow-dashed" />
        <text x={(L + 140 + R - 12) / 2} y="242" className="fig-note" textAnchor="middle">
          the same number
        </text>
        <defs>
          <marker id="c3-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" className="fig-arrow-head" />
          </marker>
        </defs>
      </svg>
    </Figure>
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
        after a space, <C ch={hits.open.favourite} /> is {n(hits.open.count)} of{" "}
        {n(hits.open.total)}, which is {f4(hits.open.prob)}
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

      <SectionHeader id="c3-score" title="The score, in bits" />
      <p>
        Chapter 1 ended with a score. On the tenth of the corpus the counting never read,
        the row's biggest count was the character that came next {n(fav.hits)} times out
        of {n(fav.of)}, {pct(fav.share)} percent, against {pct(fav.baseline_share)} percent
        for always answering a space. That score keeps one thing per step, right or wrong.
        The row holds more than that.
      </p>
      <StepsFigure />
      <p>
        The two hits chapter 1 counted as equal are {f4(hits.certain.prob)} and{" "}
        {f4(hits.open.prob)}. The miss is {f4(hits.miss.prob)}, small and not nothing. One{" "}
        <b>probability</b> per step, the one the row gave to what actually came next, is
        what the rest of this chapter turns into a score.
      </p>
      <p>
        The held-back tenth has {n(bench.example.val_steps)} such steps, and they have to
        become one number that can be compared between two guessers. Four steps with
        made-up probabilities, {bench.example.probs.map((p) => (p === 1 ? "1" : `1/${Math.round(1 / p)}`)).join(", ")},
        are small enough to show both ways of doing it.
      </p>
      <RoutesFigure />
      <p>
        Powers of one base multiply by adding their exponents, which is why the right
        route works: {bench.example.exponents.map((x) => x.toFixed(0)).join(" + ")} is{" "}
        {bench.example.total_bits.toFixed(0)}, and (1/2)<sup>{bench.example.total_bits.toFixed(0)}</sup>{" "}
        is 1/{bench.example.product_denominator}. On the real tenth the left route is a
        product of {n(bench.example.val_steps)} fractions, a decimal with about{" "}
        {n(Math.round(bench.example.val_decimal_digits / 1000) * 1000)} zeros after the
        point, and then a {n(bench.example.val_steps)}th root. The right route is a sum and
        one division.
      </p>
      <p>
        The exponent is what everyone calls <b>bits</b>: 1/2 is 1 bit, 1/4 is 2, 1/16 is 4,
        and 1 is 0 bits. A second guesser that gives 1/4 on every one of the four steps
        scores {bench.example.second_exponents.map((x) => x.toFixed(0)).join(" + ")} over{" "}
        {bench.example.second_probs.length}, which is {bench.example.second_per_char_bits} bits
        per character, worse than {bench.example.per_char_bits}. A larger exponent means the
        guesser gave the whole text a smaller probability, so lower is better. For a
        probability that is not a tidy power of 1/2 the exponent is a fraction, and finding
        it is what the base-2 logarithm does, with the sign flipped, because the exponent of
        a number below 1 comes out negative:
      </p>
      <Eq
        tex={"\\text{surprise} = -\\log_2 p"}
        gloss="The exponent k for which (1/2) to the power k equals p. A probability of 1 is 0 bits, 1/2 is 1 bit, and each halving adds one."
      />
      <p>
        The <code>log</code> is said "log", the small 2 is its base, and <code>p</code> is
        the probability. In code the same line is <code>-np.log2(p)</code>. The three steps
        of the first figure, in bits: <C ch={hits.certain.favourite} /> after <code>q</code>{" "}
        at {f4(hits.certain.prob)} is {f2(hits.certain.bits)}, <C ch={hits.open.favourite} />{" "}
        after a space at {f4(hits.open.prob)} is {f2(hits.open.bits)}, and{" "}
        <C ch={hits.miss.actual} /> after <C ch={hits.miss.row} /> at {f4(hits.miss.prob)} is{" "}
        {f2(hits.miss.bits)}. The two hits chapter 1 scored the same are{" "}
        {f2(hits.certain.bits)} and {f2(hits.open.bits)} bits, and the miss is a large finite
        number rather than a wrong.
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
        gloss={`The probability of b coming next after a is the pair's count plus alpha, over the row's total plus alpha for each of the ${row.vocab_size} cells. The bar is said "given": b given a. With alpha 0 it is the plain count over the row total of the first figure.`}
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
          `A row of the tally divided by its total is a row of probabilities: ${row.vocab_size} numbers that sum to 1, ${charLabel(hits.open.favourite)} at ${f4(hits.open.prob)} after a space.`,
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
