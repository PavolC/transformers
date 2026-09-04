import type { Exercise } from "../types";
import bench from "../../bench/chapter4.json";
import skeleton from "./skeleton.py?raw";
import tests from "./tests.py?raw";
import solution from "./solution.py?raw";

const hand = bench.hand;
const step = bench.step;

export const crossEntropyExercise: Exercise = {
  id: "cross-entropy",
  title: "The loss and its gradient",
  prompt: [
    "Chapter 3's score, written for a model that hands over scores instead of " +
      "counts, and the slope that says which way each score should move. The " +
      "model has already run: it produced logits, a (B, T, V) array holding one row " +
      "of V scores at every position of every window in the batch, and the batch's " +
      "targets, the (B, T) array of ids that actually came next, are chapter 2's y. " +
      "cross_entropy(logits, targets) turns each row into probabilities with your " +
      "softmax, reads off the probability the row gave the real next character, " +
      "takes minus log2 of it, and averages over all B times T positions. That " +
      "average is the loss, one plain float in bits per character, and it is the " +
      "same number chapter 3's avg_surprise produced for the tally.",
    "Return the loss together with a cache: whatever the backward pass will need, " +
      "which is the probabilities and the targets. The tests never look inside the " +
      "cache; they only hand it back to cross_entropy_backward(cache), which returns " +
      "one slope per score, a (B, T, V) array: the probabilities minus the one-hot of " +
      "the target (a row of zeros with a 1 at the real next character), divided by " +
      "B times T because the loss is a mean, and by ln 2 because the loss is in bits. " +
      "np.log(2.0) is ln 2. Leave it out and every slope is 1.4427 times too small, " +
      "and the tests say so.",
    "Reading one probability per position out of a (B, T, V) array takes two index " +
      "arrays that line up with targets: bi = np.arange(B)[:, None] and " +
      "ti = np.arange(T)[None, :], so probs[bi, ti, targets] is (B, T). The same " +
      "three indices write the one-hot: onehot[bi, ti, targets] = 1.0.",
    "Once the tests pass, reproduce the chapter's hand row, and then score chapter " +
      "3's tally through the new function. Send this to the scratch pad and run it:",
    {
      code:
        "# The chapter's hand row as a batch of one window of one position: (B, T, V)\n" +
        "# is (1, 1, 4), and the real next character is the fourth (id 3).\n" +
        `logits = np.array([[[${bench.hand.scores_text}]]])\n` +
        `targets = np.array([[${bench.hand.next}]])\n` +
        "loss, cache = cross_entropy(logits, targets)\n" +
        'print(f"{loss:.4f} bits for the hand row")\n' +
        "d = cross_entropy_backward(cache)\n" +
        'print("its gradient:", ", ".join(f"{g:.4f}" for g in d[0, 0]))\n' +
        "\n" +
        "# Chapter 3's counted tally, scored through the new loss. A table of\n" +
        "# probabilities is a table of scores once you take its log: softmax undoes\n" +
        "# the log and gives the probabilities back.\n" +
        "text = load_corpus()\n" +
        "chars, stoi, itos = build_vocab(text)\n" +
        "ids = encode(text, stoi)\n" +
        "n_val = len(ids) // 10\n" +
        "train, val = ids[: len(ids) - n_val], ids[len(ids) - n_val :]\n" +
        "scores = np.log(probs_from_tally(count_pairs(train, len(chars)), alpha=1.0))\n" +
        "bits = eval_driver({}, val, forward_fn=lambda params, x: (scores[x], None),\n" +
        "                   loss_fn=cross_entropy, block_size=32)\n" +
        'print(f"{bits:.4f} bits per character: the counted tally, through cross_entropy")',
    },
    `The first line is the hand row's ${bench.receipt.hand_bits_text} bits, and the ` +
      `gradient is the chapter's slope table: every wrong character pushed up, the real ` +
      `one pulled down by ${Math.abs(step.moves[hand.next]).toFixed(4)}. The last line is ` +
      `chapter 3's rung, ${bench.receipt.counted_val_text}, reached through the new ` +
      "function: the score did not change, only the machine that computes it.",
  ],
  skeleton,
  tests,
  solution,
  hints: [
    "Forward: probs = softmax(logits); B, T, V = logits.shape; build bi and ti; " +
      "picked = probs[bi, ti, targets]; the loss is float(-np.log2(picked).mean()); " +
      "return it with (probs, targets). Backward: unpack the cache, make " +
      "onehot = np.zeros_like(probs), set onehot[bi, ti, targets] = 1.0, and return " +
      "(probs - onehot) / (B * T * np.log(2.0)).",
    "The structure, in pseudocode:\n\n" +
      "    cross_entropy(logits, targets):\n" +
      "        probs = softmax(logits)\n" +
      "        B, T, V = logits.shape\n" +
      "        bi = np.arange(B)[:, None]\n" +
      "        ti = np.arange(T)[None, :]\n" +
      "        picked = probs[bi, ti, targets]\n" +
      "        return float(-np.log2(picked).mean()), (probs, targets)\n\n" +
      "    cross_entropy_backward(cache):\n" +
      "        probs, targets = cache\n" +
      "        B, T, V = probs.shape\n" +
      "        onehot = np.zeros_like(probs)\n" +
      "        onehot[<the same bi, ti, targets>] = 1.0\n" +
      "        return (probs - onehot) / (B * T * np.log(2.0))",
  ],
};
