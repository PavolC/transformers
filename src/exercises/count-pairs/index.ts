import type { Exercise } from "../types";
import bench from "../../bench/chapter1.json";
import skeleton from "./skeleton.py?raw";
import tests from "./tests.py?raw";
import solution from "./solution.py?raw";

export const countPairsExercise: Exercise = {
  id: "count-pairs",
  title: "Counting pairs",
  prompt: [
    "You are handed the text; you do not go and fetch it. count_pairs(ids, vocab_size) " +
      "receives a stream of characters that has already been turned into numbers, and " +
      "your job is to count, for every pair of neighbours in it, how often the second " +
      "character followed the first. The tests hand you the line from the top of this " +
      "chapter. The snippet at the end of this prompt hands you the whole corpus. Both " +
      "call the same function you are about to write.",
    "What you are counting, exactly: neighbours. Walk the stream one step at a time and " +
      "look at each character together with the one right after it. \"to be\" holds the " +
      "pairs t-o, o-space, space-b, b-e. That is why a stream of n characters holds " +
      "n - 1 pairs: every character except the last has a character after it.",
    "What the two arguments are. ids is that stream, one number per character, where " +
      "a character's number is its place in the sorted list of characters (the strip " +
      "above the exercises: a space is 0, a comma is 1, b is 2). vocab_size is how many " +
      "characters that list holds, which is how wide and tall your table has to be. You " +
      "get numbers rather than letters because the answer is a NumPy array, and an array " +
      "is indexed by numbers.",
    "What to return: a (vocab_size, vocab_size) array of float64, where entry [a, b] is " +
      "the number of times the character with id b came directly after the character " +
      "with id a. It has a row and a column for every character in the vocabulary, used " +
      "or not, and a row of all zeros is a real answer: it says the text never continued " +
      "that character.",
    "One trap, and a test for it. Vectorizing this with counts[ids[:-1], ids[1:]] " +
      "+= 1 does not accumulate: fancy-index assignment writes each coordinate " +
      "once however often it appears, so every pair that happens more than once " +
      "lands as a 1. np.add.at(counts, (ids[:-1], ids[1:]), 1.0) does accumulate, " +
      "and so does a plain Python loop over the pairs.",
    "Once the tests pass, count the corpus yourself. The first four lines are the " +
      "turning-into-numbers step, done here so you can see it; chapter 2 builds it " +
      "properly. The line after them counts the same nine tenths the chapter counted, " +
      "so the first row printed is the chapter's own and the other three are rows it " +
      "never showed. Send this to the scratch pad and run it:",
    {
      code:
        "text = load_corpus()\n" +
        "chars = sorted(set(text))\n" +
        "stoi = {c: i for i, c in enumerate(chars)}\n" +
        "ids = np.array([stoi[c] for c in text], dtype=np.int64)\n" +
        "\n" +
        "# The chapter counted the first nine tenths and held the last tenth\n" +
        "# back, so count the same characters to get the same numbers.\n" +
        "train = ids[: len(ids) - len(ids) // 10]\n" +
        "counts = count_pairs(train, len(chars))\n" +
        "\n" +
        "for ch in \"q:'j\":\n" +
        "    row = counts[stoi[ch]]\n" +
        "    order = np.argsort(-row)[:4]\n" +
        '    tops = ", ".join(f"{chars[i]!r} {row[i] / row.sum() * 100:.1f}%" for i in order)\n' +
        '    print(f"after {ch!r} ({int(row.sum())} times, {int((row > 0).sum())} ' +
        'of {len(row)} cells filled): {tops}")',
    },
    `The q row is the one the chapter's table shows, ${bench.rows.q.total} times and a ` +
      "u every one of them, so it doubles as a check on your counting. The other three " +
      "the chapter never showed: a colon is followed by a line break almost every time, " +
      "an apostrophe by an s or a d, and a j by a u, an o or an e with no favourite " +
      "among them.",
    "The percentages are shares of one row, not of the table, and the filled-cell " +
      "count in each header says why: a row with only four cells filled has its whole " +
      "story in the four shares printed, and a row with many more does not.",
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
