import type { Exercise } from "../types";
import skeleton from "./skeleton.py?raw";
import tests from "./tests.py?raw";
import solution from "./solution.py?raw";

export const sampleNextExercise: Exercise = {
  id: "sample-next",
  title: "Sampling the next character",
  prompt: [
    "The tally says what tends to follow what. This function is the part that " +
      "acts on it, and everything it needs is handed to it: sample_next(counts, " +
      "current, rng) returns the id of the next character, drawn in proportion to " +
      "row current. A successor counted 30 times comes up ten times as often as " +
      "one counted 3 times, and one counted 0 times never comes up.",
    "The three arguments. counts is a tally like the one your count_pairs " +
      "returns, so row a, column b holds how often b followed a. current is the " +
      "id of the character just written, which picks the row: an id is a " +
      "character's place in the sorted vocabulary, the numbering the strip above " +
      "the exercises shows. rng is a random generator the caller made and passed " +
      "in, and it is the only randomness you may use.",
    "The row holds counts and a draw needs shares, so divide the row by its own " +
      "total. rng.choice(len(row), p=shares) makes the draw, and it insists the " +
      "shares sum to 1, which they do once you have divided.",
    "Plug the empty-row hole. A character the text never continued has a row of " +
      "all zeros, its total is 0, and dividing by that gives nan, which makes the " +
      "draw raise. Check the total first, and when it is 0 fall back to an even " +
      "choice over the vocabulary with rng.integers(0, len(row)). One test hands " +
      "you exactly that row.",
    "The generator is an argument, and that is the whole point of it. Never call " +
      "np.random.seed or build a generator inside the function: the caller owns " +
      "the randomness, which is what makes a generated passage repeatable, and " +
      "one test checks that two generators made from the same seed agree.",
    "Once the tests pass, write with it. This is the loop that makes a tally into " +
      "a writer: draw a character, feed it back in as the current one, repeat. " +
      "Send this to the scratch pad and run it:",
    {
      code:
        "text = load_corpus()\n" +
        "chars = sorted(set(text))\n" +
        "stoi = {c: i for i, c in enumerate(chars)}\n" +
        "ids = np.array([stoi[c] for c in text], dtype=np.int64)\n" +
        "counts = count_pairs(ids, len(chars))\n" +
        "\n" +
        "rng = np.random.default_rng(7)\n" +
        'current = stoi["\\n"]\n' +
        "out = []\n" +
        "for _ in range(220):\n" +
        "    current = sample_next(counts, current, rng)\n" +
        "    out.append(chars[current])\n" +
        'print("".join(out))\n' +
        "\n" +
        "# And the same walk taking the row's favourite every time instead.\n" +
        'current = stoi["t"]\n' +
        "greedy = []\n" +
        "for _ in range(24):\n" +
        "    current = int(counts[current].argmax())\n" +
        "    greedy.append(chars[current])\n" +
        'print("".join(greedy))',
    },
    "The sampled passage is the same shape of text the chapter showed, and the " +
      "second line is why the draw has to be random: taking the favourite every " +
      "time from a 't' gives \"he the the the\" and never stops.",
  ],
  skeleton,
  tests,
  solution,
  hints: [
    "Four lines. Pull out row = counts[current]. Take total = row.sum(). If the " +
      "total is not positive, return int(rng.integers(0, len(row))). Otherwise " +
      "return int(rng.choice(len(row), p=row / total)).",
    "The structure, in pseudocode:\n\n" +
      "    sample_next(counts, current, rng):\n" +
      "        row = counts[current]\n" +
      "        total = row.sum()\n" +
      "        if total <= 0:\n" +
      "            return int(rng.integers(0, len(row)))\n" +
      "        return int(rng.choice(len(row), p=row / total))\n\n" +
      "    len(row) is the vocabulary size, and rng.choice(n, p=...) draws an\n" +
      "    index from 0 to n - 1 with those shares.",
  ],
};
