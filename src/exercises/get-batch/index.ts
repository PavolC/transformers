import type { Exercise } from "../types";
import bench from "../../bench/chapter2.json";
import skeleton from "./skeleton.py?raw";
import tests from "./tests.py?raw";
import solution from "./solution.py?raw";

export const getBatchExercise: Exercise = {
  id: "get-batch",
  title: "Batches of windows",
  prompt: [
    "The training loop in chapter 10 never sees any text. It holds one long array " +
      "of ids, the one your encode returns, and every step it calls this function to " +
      "get the next handful of examples. get_batch(ids, block_size, batch_size, rng) " +
      "cuts windows out of that array and returns two arrays: the windows, and the " +
      "character that followed each position in them.",
    "The four arguments. ids is the stream, one number per character, and the caller " +
      "passes the training part of it. block_size is how many characters are in one " +
      "window, called T for short. batch_size is how many windows to cut, called B. " +
      "rng is the generator the caller made and passed in, exactly as in chapter 1's " +
      "sample_next, and it is the only randomness you may use.",
    "What to return: (x, y), both int64 arrays of shape (batch_size, block_size). " +
      "Row b of x is one window, block_size characters in a row taken from somewhere " +
      "in the stream. Row b of y is the same window shifted one character left, so " +
      "y[b, t] is the character that actually came after x[b, t] in the text. The axis " +
      "law is the one every array in this course obeys: batch first, time second, and " +
      "time reads left to right.",
    "y is not one answer per window. It is one answer per position, so a window of " +
      `${bench.window.block_size} characters is ${bench.window.block_size} training ` +
      "examples rather than one, and the last of them needs the character just past " +
      "the window's right edge. That is why y has to be sliced out of the stream " +
      "rather than built out of x.",
    "The draw is one line, and it has to be exactly this one: starts = " +
      "rng.integers(0, len(ids) - block_size - 1, size=batch_size). One call for the " +
      "whole batch, not one call per row. A generator hands out its numbers in the " +
      "order it is asked for them, so a loop that draws one start at a time is just as " +
      "random and gives different windows from the same seed, and the batch below would " +
      "stop matching the chapter's.",
    "The top end of that draw is where it is because y needs a character past the " +
      "window, so the last start a full window can have is len(ids) - block_size - 1. " +
      "rng.integers never returns its top end, so passing that number leaves the " +
      "stream's very last character out of the targets: one character in a million, for " +
      "a bound you can check by hand.",
    "Once the tests pass, draw a batch from the corpus and read it. Send this to the " +
      "scratch pad and run it:",
    {
      code:
        "text = load_corpus()\n" +
        "chars, stoi, itos = build_vocab(text)\n" +
        "ids = encode(text, stoi)\n" +
        "\n" +
        "# The same nine tenths chapter 1 counted, so the same windows and the\n" +
        "# same tally to check them against.\n" +
        "train = ids[: len(ids) - len(ids) // 10]\n" +
        "\n" +
        `rng = np.random.default_rng(${bench.batch.seed})\n` +
        `x, y = get_batch(train, ${bench.window.block_size}, ${bench.window.batch_size}, rng)\n` +
        `for b in range(${bench.window.batch_size}):\n` +
        '    print(f"x = {decode(x[b], itos)!r}   y = {decode(y[b], itos)!r}")\n' +
        "\n" +
        "# Every (x, y) cell is a character and the character that followed it,\n" +
        "# so chapter 1's tally has counted every one of them at least once.\n" +
        "tally = count_pairs(train, len(chars))\n" +
        "counted = int((tally[x.ravel(), y.ravel()] > 0).sum())\n" +
        'print(f"pairs the tally already knows: {counted} of {x.size}")',
    },
    `The first row prints x = "${bench.window.x_text}" and y = ` +
      `"${bench.window.y_text}", which is the window this chapter walks through, ` +
      "and the rows below it are three more from the same draw. Change the seed and " +
      "you get four different windows out of the same stream.",
    `The last line prints ${bench.receipt.counted} of ${bench.receipt.of}, and that ` +
      "is the check that the shift is right. Every cell your batch points at is a " +
      "pair of neighbours in the training text, so the tally you built in chapter 1 " +
      "has a count in every one of them. A batch whose y was the same characters as " +
      "x, or shifted the wrong way, would land on cells the tally never counted.",
  ],
  skeleton,
  tests,
  solution,
  hints: [
    "Three lines and a return. Draw the starts with the one call the prompt gives. " +
      "Then build each array with np.stack over a list comprehension: x takes " +
      "ids[s : s + block_size] for each start, and y takes the same slice with both " +
      "ends moved one character to the right.",
    "The structure, in pseudocode:\n\n" +
      "    get_batch(ids, block_size, batch_size, rng):\n" +
      "        starts = rng.integers(0, len(ids) - block_size - 1, size=batch_size)\n" +
      "        x = np.stack([ids[s : s + block_size] for s in starts])\n" +
      "        y = np.stack([ids[s + 1 : s + block_size + 1] for s in starts])\n" +
      "        return x, y\n\n" +
      "    np.stack takes a list of equal-length rows and returns them as one\n" +
      "    (rows, length) array, which is (batch_size, block_size) here.",
  ],
};
