// Chapter 4: The learned tally.
//
// Beat plan (CLAUDE.md, the authoring playbook):
//   1 the table without the counting: chapter 3's number, why counting stops
//     scaling, a table of free numbers read by id, and the anatomy figure;
//   2 scores into a guess list: four made-up scores taken to four
//     probabilities by hand, why e to the power, the handover to logits and a
//     distribution, then the playground;
//   3 one step downhill: the hand row scored, the slope at each score logged
//     by nudging FIRST, then the rule that predicts the log with its whole
//     factor (the one bits-to-nats sentence lives here), one step, and the
//     nudge kept as grad_check;
//   4 the table trained live: zeros sit on the ceiling rung, what one step
//     does to a row, the learning rate priced, then the panel (the midpoint);
//   5 learning recovers counting: both tables side by side, the row for h two
//     ways, the floor no table beats on the text it read, where the gap lives,
//     the never-seen pairs, and the ladder's fourth rung;
//   6 the same thing written down, with receipts;
//   7 the exercise: five sections of the one file.
//
// Every number in the prose comes from tools/bench/chapter4.py, or is quoted
// from chapter 3's bench where the chapter quotes chapter 3. The playground
// computes live and its numbers are never quoted. The trainer runs the bench's
// own code path at the bench's own settings, so its default run and the prose
// are one computation (CLAUDE.md, Decisions).
//
// Structure note: the heading and every paragraph are DIRECT children of
// article.module, which is what the stylesheet's measure rules select.

import { useEffect, type ReactNode } from "react";
import { AfterThis, Aside, Figure, ModuleToc, Recap, SectionHeader, fig } from "../components/ModuleBits";
import { Eq } from "../components/Math";
import { ExerciseCard } from "../components/ExerciseCard";
import { softmaxExercise } from "../exercises/softmax";
import { crossEntropyExercise } from "../exercises/cross-entropy";
import { embeddingExercise } from "../exercises/embedding";
import { gradCheckExercise } from "../exercises/grad-check";
import { trainBigramExercise } from "../exercises/train-bigram";
import { SoftmaxPlayground } from "./interactives/SoftmaxPlayground";
import { BigramTrainer } from "./interactives/BigramTrainer";
import { HeatPair } from "./interactives/HeatPair";
import { Ladder } from "./interactives/Ladder";
import { charLabel } from "./interactives/utils";
import bench from "../bench/chapter4.json";
import bench3 from "../bench/chapter3.json";

const hand = bench.hand;
const nudge = bench.nudge;
const step = bench.step;
const init = bench.init;
const training = bench.training;
const row = bench.row;
const rare = bench.rare_row;
const strata = bench.strata;
const unseen = bench.unseen;
const ladder = bench.ladder;
const sweep = bench.sweep;
const tables = bench.tables;
const trainChars = bench3.heldout.train_chars;
const V = init.vocab_size;

const n = (x: number) => x.toLocaleString();
const f4 = (x: number) => x.toFixed(4);
const f3 = (x: number) => x.toFixed(3);
const f2 = (x: number) => x.toFixed(2);
const f1 = (x: number) => x.toFixed(1);
const pct = (x: number) => (x * 100).toFixed(1);
/** A four-decimal number with a real minus sign, and in parentheses when it is
 * negative and follows an operator: "1 × (−1.0939)" rather than "1 × -1.0939". */
const m4 = (x: number) => f4(x).replace("-", "−");
const p4 = (x: number) => (x < 0 ? `(${m4(x)})` : f4(x));
const C = ({ ch }: { ch: string }) => <code>{charLabel(ch)}</code>;

/** "31 to 65" is 35 rows: the count a stratum's label spans. */
function rowCount(label: string): number {
  const [a, b] = label.split(" to ").map(Number);
  return b - a + 1;
}

/** How often the rare row is in a batch: positions per batch times the row's
 * share of the training text. Derived here from bench numbers rather than
 * typed, and the prose says "about one step in N" from it. */
const rareStepsPerVisit = Math.round(1 / ((init.positions * rare.total) / trainChars));

/** The anatomy of the learned tally, box-and-arrow family: the forward path
 * along the top, and one step downhill drawn back along the bottom. */
function Anatomy() {
  const boxes = [
    { x: 0, w: 96, lines: ["the character", "just read", "(its id)"] },
    { x: 130, w: 118, lines: ["the table", `${V} rows of`, `${V} scores`] },
    { x: 282, w: 88, lines: ["softmax"] },
    { x: 404, w: 196, lines: ["the loss:", "minus log2 of the probability", "given to the real next one"] },
  ];
  const yTop = 22;
  const h = 58;
  const mid = yTop + h / 2;
  const arrows: [number, number, string][] = [
    [boxes[0].x + boxes[0].w, boxes[1].x, "picks its row"],
    [boxes[1].x + boxes[1].w, boxes[2].x, `${V} scores`],
    [boxes[2].x + boxes[2].w, boxes[3].x, `${V} probabilities`],
  ];
  return (
    <Figure
      caption={`The learned tally, read left to right: the character just read picks its row of the table, softmax turns the row's ${V} scores into ${V} probabilities, and the loss reads off the one given to the character that really came next. The dashed arrow is one step of training: the slope of the loss travels back and moves the scores in the row that was read. The table is the object of study; the other three boxes are the same machinery every later model runs.`}
    >
      <svg {...fig(0, 0, 600, 150)} className="c4-anatomy" role="img" aria-label="Box and arrow diagram: id, table, softmax, loss, with a dashed arrow from the loss back to the table.">
        <defs>
          <marker id="c4-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" className="fig-arrow-head" />
          </marker>
        </defs>
        {boxes.map((b, i) => (
          <g key={i}>
            <rect x={b.x + 0.5} y={yTop} width={b.w - 1} height={h} rx={3} className={i === 1 ? "fig-box-accent" : "fig-box-fill"} />
            {b.lines.map((t, k) => (
              <text
                key={k}
                x={b.x + b.w / 2}
                y={mid + (k - (b.lines.length - 1) / 2) * 13 + 4}
                textAnchor="middle"
                className={i === 1 ? "fig-label fig-label-inverse" : "fig-label"}
              >
                {t}
              </text>
            ))}
          </g>
        ))}
        {arrows.map(([x1, x2, label], i) => (
          <g key={i}>
            <path d={`M${x1 + 2} ${mid} H${x2 - 3}`} className="fig-arrow" markerEnd="url(#c4-arrow)" />
            <text x={(x1 + x2) / 2} y={yTop - 8} textAnchor="middle" className="fig-note">
              {label}
            </text>
          </g>
        ))}
        <path
          d={`M${boxes[3].x + boxes[3].w / 2} ${yTop + h + 2} V${yTop + h + 40} H${boxes[1].x + boxes[1].w / 2} V${yTop + h + 6}`}
          className="fig-arrow fig-arrow-dashed"
          markerEnd="url(#c4-arrow)"
        />
        <text x={(boxes[1].x + boxes[3].x + boxes[3].w) / 2} y={yTop + h + 54} textAnchor="middle" className="fig-note">
          one step downhill: the slope of the loss comes back and moves the row that was read
        </text>
      </svg>
    </Figure>
  );
}

/** The hand row, taken from scores to a guess list, one column per operation. */
function HandTable() {
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          Four made-up scores for four characters that might follow <code>h</code>, taken to
          probabilities: e to the power of each score, then each power over the total of the
          four. The scores are hand-placed and the rest is arithmetic on them.
        </caption>
        <thead>
          <tr>
            <th scope="col">character</th>
            <th scope="col">score</th>
            <th scope="col">e to the score</th>
            <th scope="col">over the total, {f3(hand.sum)}</th>
          </tr>
        </thead>
        <tbody>
          {hand.chars.map((ch, i) => (
            <tr key={ch}>
              <td>
                <code>{ch}</code>
              </td>
              <td>{f1(hand.scores[i])}</td>
              <td>{f3(hand.exps[i])}</td>
              <td>{f4(hand.probs[i])}</td>
            </tr>
          ))}
          <tr>
            <td>total</td>
            <td />
            <td>{f3(hand.sum)}</td>
            <td>{f4(hand.prob_sum)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** The log of the nudges: what the loss did when each score moved, and the
 * slope that follows. Log first; the rule that predicts it comes after. */
function NudgeTable() {
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          {`Each score of the hand row nudged up by ${nudge.eps} and down by ${nudge.eps}, with the loss recomputed both times. The slope is the difference over ${2 * nudge.eps}. The real next character is `}
          <code>{hand.next_char}</code>
          {`, whose loss before any nudge is ${f4(hand.bits)} bits.`}
        </caption>
        <thead>
          <tr>
            <th scope="col">score for</th>
            <th scope="col">probability</th>
            <th scope="col">loss, score up</th>
            <th scope="col">loss, score down</th>
            <th scope="col">slope, nudged</th>
          </tr>
        </thead>
        <tbody>
          {nudge.rows.map((r) => (
            <tr key={r.char}>
              <td>
                <code>{r.char}</code>
              </td>
              <td>{f4(r.prob)}</td>
              <td>{r.loss_up.toFixed(6)}</td>
              <td>{r.loss_down.toFixed(6)}</td>
              <td>{m4(r.slope_nudged)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The rule against the log, then the step it produces. */
function StepTable() {
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          {`The rule beside the log, and one step at learning rate ${step.lr}: each score moves by minus the learning rate times its slope. The real next character, `}
          <code>{hand.next_char}</code>
          {`, is the one row where the one-hot is 1.`}
        </caption>
        <thead>
          <tr>
            <th scope="col">score for</th>
            <th scope="col">probability minus one-hot</th>
            <th scope="col">over ln 2: the rule</th>
            <th scope="col">slope, nudged</th>
            <th scope="col">new score</th>
            <th scope="col">new probability</th>
          </tr>
        </thead>
        <tbody>
          {nudge.rows.map((r, i) => (
            <tr key={r.char}>
              <td>
                <code>{r.char}</code>
              </td>
              <td>
                {f4(r.prob)} − {r.onehot} = {m4(r.diff_nats)}
              </td>
              <td>{m4(r.slope_formula)}</td>
              <td>{m4(r.slope_nudged)}</td>
              <td>
                {f1(r.score)} − {step.lr} × {p4(r.slope_formula)} = {m4(step.new_scores[i])}
              </td>
              <td>{f4(step.new_probs[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The learning rate priced: the same run at four rates. */
function SweepTable() {
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          {`The same ${n(init.steps)} steps from the same seed at four learning rates. The last column is the worst single batch after step 100, which is where a rate that is too large shows.`}
        </caption>
        <thead>
          <tr>
            <th scope="col">learning rate</th>
            <th scope="col">last 50 steps, average</th>
            <th scope="col">held-back tenth</th>
            <th scope="col">worst batch after step 100</th>
          </tr>
        </thead>
        <tbody>
          {sweep.map((r) => (
            <tr key={r.lr}>
              <td>{r.lr}{r.lr === init.lr ? " (the panel's)" : ""}</td>
              <td>{f4(r.last50_bits)}</td>
              <td>{f4(r.val_bits)}</td>
              <td>{f2(r.worst_after_100_bits)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One row of the table two ways: counted, and learned. */
function RowTable({ r, title }: { r: typeof row; title: string }) {
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">follows {r.char === " " ? "a space" : <code>{r.char}</code>}</th>
            <th scope="col">count</th>
            <th scope="col">counted</th>
            <th scope="col">learned</th>
            <th scope="col">learned score</th>
          </tr>
        </thead>
        <tbody>
          {r.entries.map((e) => (
            <tr key={e.char}>
              <td>
                <C ch={e.char} />
              </td>
              <td>{n(e.count)}</td>
              <td>{f4(e.counted)}</td>
              <td>{f4(e.learned)}</td>
              <td>{f2(e.score).replace("-", "−")}</td>
            </tr>
          ))}
          <tr>
            <td>the other {V - r.entries.length} together</td>
            <td>{n(r.rest_count)}</td>
            <td>{f4(r.rest_counted)}</td>
            <td>{f4(r.rest_learned)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Where the gap between the two tables lives, by how often the row was read. */
function StrataTable() {
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>
          {`The ${V} rows ranked by how many times the training text read them, in three groups, and each table's bits per character on the held-back steps whose row falls in that group. The gap is the learned column minus the counted one.`}
        </caption>
        <thead>
          <tr>
            <th scope="col">rows, by rank</th>
            <th scope="col">row totals</th>
            <th scope="col">share of held-back steps</th>
            <th scope="col">counted</th>
            <th scope="col">learned</th>
            <th scope="col">gap</th>
          </tr>
        </thead>
        <tbody>
          {strata.map((s) => (
            <tr key={s.rows}>
              <td>{s.rows}</td>
              <td>
                {n(s.max_row_total)} down to {n(s.min_row_total)}
              </td>
              <td>{pct(s.share)}%</td>
              <td>{f4(s.counted_bits)}</td>
              <td>{f4(s.learned_bits)}</td>
              <td>{f4(s.learned_bits - s.counted_bits)}</td>
            </tr>
          ))}
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
      "softmax: e to each score, over the total of the powers",
      <>
        the hand row {hand.scores.map(f1).join(", ")} became {hand.probs.map(f4).join(", ")},
        total {f3(hand.sum)} under the line
      </>,
    ],
    [
      "the loss: minus log2 of the probability given to the real next character, averaged over positions",
      <>
        <code>{hand.next_char}</code> at {f4(hand.prob_next)} cost {f4(hand.bits)} bits; the
        first batch of zeros cost log2({V}) = {f4(init.first_batch_bits)}
      </>,
    ],
    [
      "the gradient: probability minus one-hot, over the position count and ln 2",
      <>
        for <code>{hand.next_char}</code>, ({f4(hand.prob_next)} − 1) / {f4(nudge.ln2)} ={" "}
        {m4(nudge.rows[hand.next].slope_formula)}, and the nudge measured{" "}
        {m4(nudge.rows[hand.next].slope_nudged)}
      </>,
    ],
    [
      "the step: score minus learning rate times slope",
      <>
        {f1(hand.scores[hand.next])} − {step.lr} × {p4(nudge.rows[hand.next].slope_formula)} ={" "}
        {f4(step.new_scores[hand.next])}, and the loss fell from {f4(hand.bits)} to{" "}
        {f4(step.new_bits)}
      </>,
    ],
    [
      "the table's gradient: each position's slopes added into the row it read",
      <>
        the row for <code>{rare.char}</code> is in a batch about one step in {rareStepsPerVisit},
        which is why it ends {f4(rare.max_gap)} from its counted row
      </>,
    ],
  ];
  return (
    <div className="table-scroll scroll-x" tabIndex={0}>
      <table className="truth-table">
        <caption>Each statement, beside the number you have already watched come out of it.</caption>
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

export function Chapter4() {
  useEffect(() => {
    document.title = "The learned tally · Transformers · Moving Parts";
  }, []);

  const curveAt = (s: number) => training.curve.find((c) => c.step === s)!.bits;

  return (
    <article className="module">
      <h2>Chapter 4: The learned tally</h2>
      <AfterThis
        items={[
          "Turn a row of scores into a guess list with softmax, and say why the scores are raised to a power rather than divided by their sum.",
          "Write the loss for a model that gives scores, its slope with every factor in it, and check that slope by nudging.",
          `Train a ${V} by ${V} table of zeros to within a few hundredths of chapter 3's rung, and say which rows the gap that remains lives in.`,
        ]}
      />
      <ModuleToc />

      <SectionHeader id="c4-table" title="The table, without the counting" />
      <p>
        Chapter 3 ended on one number. The counted tally, one row per character and in each
        cell how often the column's character followed the row's, scores{" "}
        {f4(training.counted_val_bits)} bits per character on the tenth of the corpus it never
        read. Every one of its {n(init.cells)} cells came from a count divided by a row total.
        This chapter reaches {f4(training.learned_val_bits)} on the same tenth with a table
        that never counted anything.
      </p>
      <p>
        Counting works because there is a row to count into. One character before and{" "}
        {V} possible characters after is {n(init.cells)} cells, and a million characters of
        text fill most of them. A model that reads the three characters before would need a
        row for every way three characters can come in order, which is {V} times {V} times{" "}
        {V}, or {n(V ** 3)} rows of {V} cells, and the same million characters would leave
        nearly all of them empty. The method that replaces counting is the one course one
        taught: a loss that says how wrong the guess was, and a step downhill for every
        number in the model. This chapter runs that method on the one model where the
        counted answer is known, so every step of it can be checked against a table you
        already hold.
      </p>
      <p>
        The learned tally is a table of {V} rows of {V} numbers, and to begin with every
        number is 0. The character just read picks out its row, the same way it picked a row
        of the counted tally: a character indexes a row, and the table owns its rows. The
        numbers in a row are that character's <b>scores</b> for what comes next, one score per
        character in the vocabulary. A score is a free number. It can be negative, and a row
        of scores does not sum to anything in particular, so a row is not yet a guess list.
        The next section builds the machine that turns it into one. The numbers training
        moves are the model's <b>parameters</b>, and the learned tally has {n(init.cells)} of
        them, one per cell.
      </p>
      <p>
        The field calls a table with one row per character, read by id, an <b>embedding
        table</b>, and a row of it that character's embedding. Both words are in play from
        here. This chapter's table is square because a row is a row of scores; chapter 5
        keeps the table and makes its rows shorter.
      </p>
      <Anatomy />

      <SectionHeader id="c4-softmax" title="Scores into a guess list" />
      <p>
        Take four made-up scores for four characters that might follow <code>h</code>:{" "}
        {hand.chars.map((ch, i) => (
          <span key={ch}>
            <code>{ch}</code> {f1(hand.scores[i])}
            {i < hand.chars.length - 1 ? ", " : "."}
          </span>
        ))}{" "}
        The real row has {V} entries, and these four are placed by hand so the arithmetic
        fits in a table. To turn them into probabilities, raise e, the number{" "}
        {Math.E.toFixed(3)}, to the power of each score, add the four results, and divide
        each by the total.
      </p>
      <HandTable />
      <p>
        Two things a guess list needs, the division buys one of and the powers buy the
        other. Dividing by the total makes the four numbers sum to 1. Raising e to the
        score makes each of them positive, whatever the score was, where dividing the raw
        scores by their sum would hand <code>i</code> a negative share. The powers also keep
        the order: a bigger score is a bigger share. And a step of 1 in any score multiplies
        its power by e, so what a score means is fixed by its distance from the other
        scores in the row, not by its size. Adding the same amount to all four changes
        nothing below the line.
      </p>
      <p>
        This course calls the row a model gives its scores and the row that comes out its
        guess list. The field calls the scores <b>logits</b> and the guess list a{" "}
        <b>probability distribution</b> over the vocabulary, and calls the machine between
        them <b>softmax</b>, which is the name the code uses. The equations and the
        exercises say logits and distribution from here; the prose keeps saying scores and
        guess list where the plain words carry the idea.
      </p>
      <SoftmaxPlayground />
      <p>
        Drag one score and its share moves at the expense of the other three, because the
        four shares always total 1. Drag the scale and every score moves together: at 4 the
        list piles onto its favourite, at 0.25 it flattens toward a quarter each, and the
        order never changes. That one knob does the same thing on the scribe's sampler in
        chapter 10, which names it.
      </p>

      <SectionHeader id="c4-downhill" title="One step downhill" />
      <p>
        Score the hand row the way chapter 3 scored the tally. The real next character in
        this made-up step is <code>{hand.next_char}</code>, the guess list gives it{" "}
        {f4(hand.prob_next)}, and minus log2 of that is {f4(hand.bits)} bits. To make that
        number smaller, course one's method asks one question of each score: if this score
        moved a little, how much would the loss move? That ratio is the score's{" "}
        <b>slope</b>, and the plain way to measure it is to move the score and look. Raise
        the score for <code>e</code> by {nudge.eps} and recompute the loss. Lower it by{" "}
        {nudge.eps} and recompute. The difference between the two losses, over the{" "}
        {2 * nudge.eps} the score travelled, is the slope at <code>e</code>. The table below
        does this for all four.
      </p>
      <NudgeTable />
      <p>
        Read the sign first. Three slopes are positive: raising the score for a wrong
        character raises the loss, so its score should fall. The slope for{" "}
        <code>{hand.next_char}</code> is negative: raising the real next character's score
        lowers the loss, so its score should rise. Read the sizes next. The slope for{" "}
        <code>e</code> is the largest of the three positive ones, and <code>e</code> is the
        wrong character with the biggest share. The slope for <code>i</code>, at share{" "}
        {f4(nudge.rows[2].prob)}, is nearly zero, because a character the list already
        dismisses has little left to lose.
      </p>
      <p>
        One rule predicts every number in the slope column. Write the real next character
        as a row of its own, zeros everywhere and a 1 at <code>{hand.next_char}</code>: the
        field calls that row the <b>one-hot</b>. Subtract it from the row of probabilities.
        Divide by ln 2, the natural logarithm of 2, which is {f4(nudge.ln2)}. The result
        matches the nudged slopes to every decimal the table shows, and the largest gap
        between the two columns across the four scores is {nudge.max_gap.toExponential(1)}.
      </p>
      <StepTable />
      <p>
        The ln 2 is the one place this course's unit meets the field's. The natural
        logarithm's slope at a probability p is 1 over p, and log2 of p is the natural
        logarithm of p divided by ln 2, so every slope of a loss in bits is the slope of
        the same loss in nats divided by {f4(nudge.ln2)}. The field measures this loss in
        nats and calls it <b>cross-entropy</b>; this course keeps bits, the code carries the
        ln 2, and both words are in play from here. Drop the factor and every slope is{" "}
        {f4(nudge.one_over_ln2)} times too small, which the check below catches at once.
      </p>
      <p>
        The step itself is course one's: each score moves against its slope by a fixed
        multiple, the <b>learning rate</b>. At learning rate {step.lr} the new scores are the
        last two columns of the table. <code>{hand.next_char}</code> rises from{" "}
        {f4(hand.prob_next)} to {f4(step.new_prob_next)}, and the step now costs{" "}
        {f4(step.new_bits)} bits instead of {f4(hand.bits)}, which is {f4(step.bits_saved)}{" "}
        fewer. The learning rate is a free choice. {step.lr} keeps the hand numbers
        readable; a larger one would overshoot on a step this steep, a smaller one would
        crawl, and the training panel below has a knob for it.
      </p>
      <Aside>
        <p>
          Where probability minus one-hot comes from, for the curious. The loss of one
          position is minus the natural log of p for the real next character, times 1 over
          ln 2. That p is e to its score over the total of the powers. The derivative of
          minus the natural log of it with respect to any score is the score's own share of
          the total, minus 1 if the score belongs to the real next character. That is the
          probability minus the one-hot, and the 1 over ln 2 rides along. Nothing in the
          course depends on this derivation; the nudge table is the evidence, and the
          gradient check is how the evidence is collected for every formula after this one.
        </p>
      </Aside>
      <p>
        Nudging is slow. Two losses per number, for the {n(init.cells)} numbers of the table,
        is {n(2 * init.cells)} evaluations for one slope table, where the rule is one
        subtraction and one division. So training uses the rule, and the nudge is kept as
        the check on it. Course one ran this check on every gradient it wrote. The exercise
        rebuilds it as <code>grad_check</code>, and every backward pass in the rest of the
        course goes through it, up to the whole scribe in chapter 11. The check visits every
        element of an array of any shape, and NumPy names element i of any array{" "}
        <code>x.flat[i]</code>, counted along the rows, so one loop covers a row, a table or
        a batch.
      </p>

      <SectionHeader id="c4-train" title="Training the table, live" />
      <p>
        The table starts as {V} rows of {V} zeros. A row of equal scores is an even guess,
        1 over {V} for every character, which is {f4(init.uniform_prob)}, and minus log2 of
        that is log2({V}) = {f4(init.uniform_bits)} bits on every step whatever the text
        says. The first batch scores exactly {f4(init.first_batch_bits)}. Training starts on
        the ladder's top rung.
      </p>
      <p>
        One step is the hand step, done for {n(init.positions)} positions at once. A batch is{" "}
        {init.batch_size} windows of {init.block_size} characters, chapter 2's shape, so{" "}
        {init.batch_size} times {init.block_size} = {n(init.positions)} positions, each with
        a real next character. Every position reads its row, gets its guess list, and is
        scored. The loss is the mean over the {n(init.positions)} positions, so each
        position's slopes are divided by {n(init.positions)} as well as by ln 2. Then the
        slopes go back into the table: each position's row of {V} slopes is added into the
        row that position read, and a row read at several positions collects all of them,
        which is chapter 1's <code>np.add.at</code> again, adding where an index repeats.
        The (B, T) ids and the (B, T, {V}) slopes are flattened to {n(init.positions)} ids
        beside {n(init.positions)} rows first, with <code>reshape(-1)</code> and{" "}
        <code>reshape(-1, {V})</code>, which is the shape that call pairs up. Rows no
        position read do not move.
      </p>
      <p>
        The division by {n(init.positions)} is why the learning rate here is {init.lr} where
        the hand step used {step.lr}. One position's vote moves its row's scores by at most{" "}
        {init.lr} over {n(init.positions)} times ln 2, which is {f4(init.push_per_vote)}, and
        a row that appears at a hundred positions in the batch collects a hundred such votes.
        The rate is a free choice, and the table prices it. Of the four rates tried,{" "}
        {init.lr} ends lowest on the held-back tenth; {sweep[0].lr} ends higher after the same
        steps; {sweep[2].lr} bounces higher and ends worse; and {sweep[3].lr} ends above the
        ceiling it started from.
      </p>
      <SweepTable />
      <BigramTrainer />
      <p>
        The curve bounces. Each step scores a different {n(init.positions)} positions, so a
        batch's own loss wanders around the trend: at the panel's settings it reads{" "}
        {f4(curveAt(500))} at step 500, {f4(curveAt(1000))} at step 1,000 and{" "}
        {f4(curveAt(2000))} at step 2,000. The number to read is the average over the last
        50 steps, {f4(training.last50_bits)}. The number to put on the ladder is the one the
        panel ends on: every step of the held-back tenth, scored with the answer key open,
        the same walk chapter 3 took. That is {f4(training.learned_val_bits)} bits, against
        the counted tally's {f4(training.counted_val_bits)}.
      </p>

      <SectionHeader id="c4-recovers" title="Learning recovers counting" />
      <p>
        The two tables, whole, on one colour scale.
      </p>
      <Figure
        caption={`The counted tally and the learned table, ${V} rows by ${V} columns each, row = the character just read, column = the character that might follow, darker where the probability is higher, on one colour scale. Hover a cell to read both probabilities. The counted table is chapter 3's, unsmoothed; the learned one is the panel's default run after ${n(init.steps)} steps.`}
      >
        <HeatPair
          chars={tables.chars}
          left={{ title: "counted", probs: tables.counted }}
          right={{ title: "learned", probs: tables.learned }}
          idleText="Hover a cell to read the counted and the learned probability for that pair."
        />
      </Figure>
      <p>
        The same picture. Row by row the numbers say how close: after <code>{row.char}</code>,
        chapter 3's row, counting gave <C ch={row.entries[0].char} /> {f4(row.entries[0].counted)}{" "}
        and training gave it {f4(row.entries[0].learned)}, and the largest gap anywhere in the
        row is {f4(row.max_gap)}.
      </p>
      <RowTable
        r={row}
        title={`The row for ${row.char}, ${n(row.total)} counts, two ways: the counted probability (count over the row total, no alpha) and the learned one (softmax of the learned row). The last column is the learned score itself, the number training moved.`}
      />
      <p>
        On the text it trained on, the learned table scores {f4(training.learned_train_bits)}{" "}
        bits and the counted table, unsmoothed, scores {f4(training.counted_train_raw_bits)}.
        No table of scores can go below that second number on that text. The slope of a row
        is the sum, over every position that read the row, of probability minus one-hot,
        and that sum is zero exactly when the row's probabilities are the row's frequencies:
        the pushes on the wrong characters, one probability each, cancel the pulls on the
        real ones, one per occurrence, only when the probabilities are the counts over the
        total. Training walks toward the counted table because the counted table is where
        the slopes vanish. Learning recovers counting when counting is all there is to know.
      </p>
      <p>
        The gap on the held-back tenth, {f4(training.learned_val_bits)} against{" "}
        {f4(training.counted_val_bits)}, has an address. Rank the {V} rows by how many times
        the training text read them and split them into three groups.
      </p>
      <StrataTable />
      <p>
        The ten most-read rows carry {pct(strata[0].share)} percent of the held-back steps and
        end {f4(strata[0].learned_bits - strata[0].counted_bits)} bits from their counted
        rows. The {rowCount(strata[2].rows)} least-read rows carry{" "}
        {pct(strata[2].share)} percent of the steps and end{" "}
        {f4(strata[2].learned_bits - strata[2].counted_bits)} away. A row moves only when its
        character is in the batch. The row for <code>{rare.char}</code> was read{" "}
        {n(rare.total)} times in the {n(trainChars)} training characters, so a batch of{" "}
        {n(init.positions)} positions holds it about one step in {rareStepsPerVisit}, and
        after {n(init.steps)} steps it has had a few hundred votes where the row for a space
        has had hundreds of thousands. Its favourite, <C ch={rare.entries[0].char} />, sits at{" "}
        {f4(rare.entries[0].learned)} learned against {f4(rare.entries[0].counted)} counted.
      </p>
      <RowTable
        r={rare}
        title={`The row for ${rare.char}, ${n(rare.total)} counts, two ways. A rarely read row is a rarely moved row, and its learned probabilities are the furthest from their counted ones.`}
      />
      <p>
        One part of the gap runs the other way. Chapter 3 found {n(unseen.count)} steps in the
        held-back tenth whose pair the training text never produced, and gave every cell
        one extra count so those steps would cost something finite: they cost the smoothed
        tally {f2(unseen.counted_bits)} bits each. The learned table has no alpha anywhere in
        it and pays {f2(unseen.learned_bits)} bits on the same steps, at worst{" "}
        {f2(unseen.learned_max_bits)}. A score for a pair that never occurs is only ever
        pushed down, by a little, on the steps its row is in the batch, so after{" "}
        {n(init.steps)} steps it is low and finite rather than minus infinity. In the row for{" "}
        <code>{row.char}</code>, the {row.zero_cells} cells the counting never saw hold{" "}
        {f4(row.learned_on_zero)} of the learned row's probability between them. Smoothing
        was a choice chapter 3 had to make by hand; here, stopping after a finite number of
        steps makes it.
      </p>
      <Figure
        caption={`The ladder, with its fourth rung: bits per character on the held-back tenth, lower is better. The learned tally sits ${f4(ladder.learned_val_bits - ladder.bigram_val_bits)} above the counted one. Every rung is the same measurement on the same ${n(bench3.heldout.val_chars)} characters.`}
      >
        <Ladder rungs={ladder.rungs} />
      </Figure>
      <p>
        From here every rung is a trained model, and the counted tally is the mark each one
        has to pass. A model that reads more than one character and cannot get below{" "}
        {f2(ladder.bigram_val_bits)} has learned less than counting did.
      </p>

      <SectionHeader id="c4-formal" title="The same thing written down" />
      <p>
        Recognition, not derivation: these four lines are what the hand tables did, with
        the hand row's own values beside them. The row of scores is written s with one
        entry per character, and the real next character's id is written y.
      </p>
      <Eq
        tex={"p_i = \\frac{e^{s_i}}{\\sum_{j} e^{s_j}}"}
        gloss={`Softmax: the probability of character i is e to its score, over the total of e to every score in the row. On the hand row the total was ${f3(hand.sum)}.`}
      />
      <Eq
        tex={"\\text{loss} = -\\frac{1}{N} \\sum_{\\text{positions}} \\log_2 p_{y}"}
        gloss={`The loss is minus log2 of the probability given to the real next character, averaged over the N positions in the batch. It is chapter 3's average surprise, in bits, computed from a row of scores instead of a row of counts.`}
      />
      <Eq
        tex={"\\frac{\\partial\\, \\text{loss}}{\\partial s_j} = \\frac{p_j - [j = y]}{N \\ln 2}"}
        gloss={`The slope of the loss with respect to score j is the probability of j minus 1 if j is the real next character and minus 0 otherwise (the one-hot), over the position count N and ln 2. The curly d is said "partial": the slope along one score with the others held still.`}
      />
      <Eq
        tex={"s_j \\leftarrow s_j - \\text{lr} \\cdot \\frac{\\partial\\, \\text{loss}}{\\partial s_j}"}
        gloss={`One step: every score moves against its slope by the learning rate times the slope. The arrow is said "becomes". The same line, run on the whole table at once, is sgd_step.`}
      />
      <ReceiptsTable />

      <SectionHeader id="c4-exercise" title="Your turn: build the learned tally" />
      <p>
        Five sections of your file, in the order the chapter met them. Softmax turns a row
        of scores into a guess list. The loss scores a batch of guess lists in bits and hands
        back its slopes. The embedding table reads its rows by id and collects the slopes
        back into them. The gradient check is the nudge, kept as a tool. The last section is
        the model itself, four short functions, and the course's training loop runs them at
        the panel's own settings to put your rung on the ladder.
      </p>
      <p>
        Two moves the sections lean on. Reading one probability per position out of a
        (B, T, {V}) array takes two index arrays that line up with the targets:{" "}
        <code>np.arange(B)[:, None]</code> counts the windows down the batch and{" "}
        <code>np.arange(T)[None, :]</code> counts the positions across a window, and{" "}
        <code>probs[bi, ti, targets]</code> hands back the (B, T) probabilities the targets
        received. The same three indices set the one-hot's ones. And a function that
        returns two things returns them as a pair, <code>return out, cache</code>, which the
        caller takes apart as <code>out, cache = ...</code>: every module in the course is a
        forward that hands back a cache and a backward that takes it.
      </p>
      <ExerciseCard exercise={softmaxExercise} />
      <ExerciseCard exercise={crossEntropyExercise} />
      <ExerciseCard exercise={embeddingExercise} />
      <ExerciseCard exercise={gradCheckExercise} />
      <ExerciseCard exercise={trainBigramExercise} />

      <Recap
        items={[
          `A row of scores becomes a guess list by raising e to each score and dividing by the total: the hand row ${hand.scores.map(f1).join(", ")} became ${hand.probs.map(f4).join(", ")}. The field says logits, a distribution, and softmax.`,
          `The loss for a model that gives scores is chapter 3's average surprise: minus log2 of the probability given to the real next character, averaged over positions. The field calls it cross-entropy and measures it in nats; one nat is ${f4(nudge.one_over_ln2)} bits.`,
          `Its slope with respect to each score is the probability minus the one-hot, over the position count and ln 2. The nudge measured ${f4(nudge.rows[hand.next].slope_nudged)} for the real next character and the rule said ${f4(nudge.rows[hand.next].slope_formula)}; grad_check is that comparison, kept.`,
          `A table of zeros guesses evenly and scores log2(${V}) = ${f4(init.uniform_bits)} bits, the ceiling. ${n(init.steps)} steps at learning rate ${init.lr} bring it to ${f4(training.learned_val_bits)} on the held-back tenth, against the counted tally's ${f4(training.counted_val_bits)}.`,
          `The slopes of a row vanish exactly where its probabilities are its frequencies, so training walks toward the counted table. The gap that remains lives in the rows the text rarely reads, and the pairs it never produced cost the learned table less than they cost the smoothed one.`,
          `The ladder: ${f2(ladder.uniform_bits)} evenly, ${f2(ladder.unigram_bits)} for letter frequency, ${f2(ladder.bigram_val_bits)} counted, ${f2(ladder.learned_val_bits)} learned.`,
        ]}
        deeper='Andrej Karpathy, "The spelled-out intro to language modeling: building makemore"'
        href="https://www.youtube.com/watch?v=PaCmpygFfXo"
      />
    </article>
  );
}
