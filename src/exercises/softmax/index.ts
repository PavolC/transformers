import type { Exercise } from "../types";
import skeleton from "./skeleton.py?raw";
import tests from "./tests.py?raw";
import solution from "./solution.py?raw";

export const softmaxExercise: Exercise = {
  id: "softmax",
  title: "Softmax",
  prompt: [
    "One function, and the course reuses it to the last chapter: softmax turns " +
      "a row of scores into a guess list, probabilities that sum to 1, with " +
      "bigger scores getting bigger shares. Each entry is e to the power of " +
      "its score, divided by the total of all such powers in its row.",
    "The contract, precisely: softmax(scores) works on the LAST axis of " +
      "whatever it is given, a bare row (V,) or a whole batch (B, T, V), and " +
      "returns the same shape. Use axis=-1 with keepdims=True for the max " +
      "and the sum, so their results still line up against the rows they " +
      "came from.",
    "Plug the overflow hole before you exponentiate. e to the power of 1000 " +
      "is infinity in float64, and infinity over infinity is nan. Subtract " +
      "each row's own maximum from its scores first: the factor it " +
      "introduces cancels top and bottom, so the answer is unchanged, and " +
      "every exponent lands at or below zero, where e^x cannot overflow. " +
      "One of the tests hands you scores of 1000 to check exactly this.",
    "Once the tests pass, watch what scaling scores does to the guesses. " +
      "Send this to the scratch pad and run it:",
    {
      code:
        "row = np.array([2.0, 0.0, -2.0, 1.0])\n" +
        "for scale in (0.5, 1.0, 2.0):\n" +
        '    print(f"scores x {scale}:", np.round(softmax(row * scale), 3))',
    },
    "Scaling the scores up sharpens the guess list toward its favourite and " +
      "scaling them down flattens it toward even. Chapter 10 names that " +
      "knob temperature and puts it on the scribe's sampler.",
  ],
  skeleton,
  tests,
  solution,
  hints: [
    "Three lines. Take the row-wise max with scores.max(axis=-1, " +
      "keepdims=True) and subtract it. Exponentiate what is left with " +
      "np.exp. Divide by the row-wise sum, again with axis=-1 and " +
      "keepdims=True. No loops: NumPy lines the shapes up for every row at " +
      "once.",
    "The structure, in pseudocode:\n\n" +
      "    softmax(scores):\n" +
      "        m = <row-wise max of scores, keepdims>\n" +
      "        e = np.exp(scores - m)\n" +
      "        return e / <row-wise sum of e, keepdims>",
  ],
};
