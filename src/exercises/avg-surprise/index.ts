import type { Exercise } from "../types";
import bench from "../../bench/chapter3.json";
import skeleton from "./skeleton.py?raw";
import tests from "./tests.py?raw";
import solution from "./solution.py?raw";

export const avgSurpriseExercise: Exercise = {
  id: "avg-surprise",
  title: "Scoring the tally in bits",
  prompt: [
    "Everything this chapter measured, you now write. Three small functions, and " +
      "the tally and the text are both handed to them: nothing here opens the corpus " +
      "or counts a pair. probs_from_tally(counts, alpha) takes the tally your " +
      "count_pairs built and turns its counts into probabilities. surprise_bits(probs, " +
      "ids) reads a stream of ids and charges, at every step, for how much probability " +
      "the table gave the character that actually came next. avg_surprise(probs, ids) " +
      "is the mean of those charges, and it is the number on the ladder.",
    "The probabilities first. counts is a (vocab_size, vocab_size) array, row a " +
      "being what followed a. Add alpha to every cell, then divide each row by its own " +
      "total, so every row sums to 1. alpha is the smoothing from the chapter: 1.0 by " +
      "default, and 0.0 means the raw counts. The total is taken after the adding, so " +
      `a row of ${bench.row.total.toLocaleString()} counts totals ` +
      `${bench.row.smoothed_total.toLocaleString()} once the ` +
      `${bench.row.vocab_size} cells each carry one more.`,
    "The surprise. For a stream of ids, step i is ids[i] followed by ids[i + 1], and " +
      "the table's opinion of that step is probs[ids[i], ids[i + 1]]: row from the " +
      "character before, column from the character after, the same way the tally was " +
      "built. One indexing expression does every step at once: probs[ids[:-1], ids[1:]] " +
      "hands NumPy two arrays of the same length and gets back one probability per pair " +
      "of them. Minus np.log2 of that array is the surprise, in bits, one per step, so " +
      "the result has one fewer entry than ids has characters. Leave a probability of 0 " +
      "alone: np.log2(0) is -inf, and infinite surprise is the right answer for a pair " +
      "the table said could not happen.",
    "The average is the mean of that array, returned as a plain float. It is a mean " +
      "over steps, so it divides by the number of steps, which is one less than the " +
      "number of characters.",
    "Once the tests pass, score the tally on the tenth of the corpus it never read. " +
      "Send this to the scratch pad and run it:",
    {
      code:
        "text = load_corpus()\n" +
        "chars, stoi, itos = build_vocab(text)\n" +
        "ids = encode(text, stoi)\n" +
        "\n" +
        "# The same split as chapter 1: nine tenths counted, the last tenth held back.\n" +
        "n_val = len(ids) // 10\n" +
        "train, val = ids[: len(ids) - n_val], ids[len(ids) - n_val :]\n" +
        "\n" +
        "counts = count_pairs(train, len(chars))\n" +
        "probs = probs_from_tally(counts, alpha=1.0)\n" +
        'print(f"{avg_surprise(probs, val):.4f} bits per character on the held-back tenth")\n' +
        'print(f"{avg_surprise(probs, train):.4f} bits per character on the text it counted")\n' +
        "\n" +
        "# The pairs the counting never saw, and what the worst one cost.\n" +
        "unseen = int((counts[val[:-1], val[1:]] == 0).sum())\n" +
        'print(f"{unseen} of {len(val) - 1} held-back pairs never occurred in the training text")\n' +
        "s = surprise_bits(probs, val)\n" +
        'print(f"the single most expensive character cost {s.max():.2f} bits")',
    },
    `The first line is the ladder's rung, ${bench.ladder.bigram_val_text} bits, and it ` +
      "is now a number your own three functions produced. The second is the same tally " +
      "scoring the text it was built from, and the gap between them is what the tenth " +
      `was held back to reveal. The third counts the ${bench.unseen.count} pairs the ` +
      "smoothing exists for, and the last is what the worst of them cost once it did.",
  ],
  skeleton,
  tests,
  solution,
  hints: [
    "probs_from_tally is two lines: add alpha to the whole array, then divide by " +
      "sum(axis=1, keepdims=True). surprise_bits is two lines: index the table with " +
      "probs[ids[:-1], ids[1:]], then -np.log2 of it. avg_surprise is float(...) of a " +
      ".mean().",
    "The structure, in pseudocode:\n\n" +
      "    probs_from_tally(counts, alpha):\n" +
      "        smoothed = counts + alpha\n" +
      "        return smoothed / smoothed.sum(axis=1, keepdims=True)\n\n" +
      "    surprise_bits(probs, ids):\n" +
      "        p = probs[ids[:-1], ids[1:]]\n" +
      "        return -np.log2(p)\n\n" +
      "    avg_surprise(probs, ids):\n" +
      "        return float(surprise_bits(probs, ids).mean())\n\n" +
      "    keepdims=True keeps the row totals as a column, (V, 1), so the division\n" +
      "    lines each total up with its own row. A NumPy warning about log2 of\n" +
      "    zero is expected wherever a probability is 0.",
  ],
};
