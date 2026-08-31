import type { Exercise } from "../types";
import skeleton from "./skeleton.py?raw";
import tests from "./tests.py?raw";
import solution from "./solution.py?raw";

export const countPairsExercise: Exercise = {
  id: "count-pairs",
  title: "Counting pairs",
  prompt: [
    "The tally you built by hand on one line, now over any stream of characters. " +
      "count_pairs(ids, vocab_size) returns a (vocab_size, vocab_size) table of " +
      "float64 where entry [a, b] is the number of times character b came " +
      "directly after character a.",
    "The ids are indices into the vocabulary, so the table has a row and a column " +
      "for every character the vocabulary knows, whether or not this particular " +
      "stream uses it. A row of all zeros is a real answer: it says the text " +
      "never continued that character.",
    "Read the ids as overlapping pairs, (ids[0], ids[1]) then (ids[1], ids[2]) " +
      "and so on, which is why n ids hold n - 1 pairs. Every id except the first " +
      "and the last belongs to two of them, once as the character before and once " +
      "as the character after.",
    "One trap, and a test for it. Vectorizing this with counts[ids[:-1], ids[1:]] " +
      "+= 1 does not accumulate: fancy-index assignment writes each coordinate " +
      "once however often it appears, so every pair that happens more than once " +
      "lands as a 1. np.add.at(counts, (ids[:-1], ids[1:]), 1.0) does accumulate, " +
      "and so does a plain Python loop over the pairs.",
    "Once the tests pass, run your own counting over the whole corpus and look up " +
      "a row the chapter did not show you. Send this to the scratch pad and run it:",
    {
      code:
        "text = load_corpus()\n" +
        "chars = sorted(set(text))\n" +
        "stoi = {c: i for i, c in enumerate(chars)}\n" +
        "ids = np.array([stoi[c] for c in text], dtype=np.int64)\n" +
        "counts = count_pairs(ids, len(chars))\n" +
        "\n" +
        'for ch in "qhz ":\n' +
        "    row = counts[stoi[ch]]\n" +
        "    order = np.argsort(-row)[:4]\n" +
        '    tops = ", ".join(f"{chars[i]!r} {row[i] / row.sum() * 100:.1f}%" for i in order)\n' +
        '    print(f"after {ch!r} ({int(row.sum())} times): {tops}")',
    },
    "Those percentages are shares of a row, not of the table: the four numbers " +
      "after a space do not add up to 100 because a space is followed by more " +
      "than four different characters.",
  ],
  skeleton,
  tests,
  solution,
  hints: [
    "Two lines plus a return. np.zeros((vocab_size, vocab_size)) makes the empty " +
      "table. ids[:-1] is every character that has something after it, and " +
      "ids[1:] is what came after each one, so the two arrays line up pair by " +
      "pair. Then add 1 at each of those (row, column) coordinates, remembering " +
      "that repeated coordinates have to add up rather than overwrite.",
    "The structure, in pseudocode:\n\n" +
      "    count_pairs(ids, vocab_size):\n" +
      "        counts = np.zeros((vocab_size, vocab_size))\n" +
      "        np.add.at(counts, (ids[:-1], ids[1:]), 1.0)\n" +
      "        return counts\n\n" +
      "    Or the loop, which is just as correct and easier to read once:\n\n" +
      "    for before, after in zip(ids[:-1], ids[1:]):\n" +
      "        counts[before, after] += 1.0",
  ],
};
