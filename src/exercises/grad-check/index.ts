import type { Exercise } from "../types";
import bench from "../../bench/chapter4.json";
import skeleton from "./skeleton.py?raw";
import tests from "./tests.py?raw";
import solution from "./solution.py?raw";

const gc = bench.gradcheck;

export const gradCheckExercise: Exercise = {
  id: "grad-check",
  title: "The gradient check",
  prompt: [
    "The check the chapter ran on the hand row, as a tool you keep: nudge every " +
      "number, watch the loss, and compare the slope you measured with the slope a " +
      "formula claimed. The caller hands in f, a function that takes one array and " +
      "returns one float (a loss), and x, the array to measure at, of any shape. " +
      "numeric_grad(f, x, eps) returns an array the shape of x holding, for each " +
      "element, the slope of f there: raise that one element by eps, evaluate f, " +
      "lower it by eps, evaluate f, and divide the difference by 2 times eps. Nudge " +
      "in place through x.flat[i], which reaches element i of any shape as if the " +
      "array were one long row, and put the element back before moving on, so x is " +
      "unchanged when you return. eps defaults to 1e-5.",
    "grad_check(f, x, claimed, eps) takes the same f and x plus claimed, the " +
      "gradient a formula produced, and returns one float: the largest relative " +
      "error over every element, |numeric minus claimed| divided by |numeric| plus " +
      "|claimed| plus 1e-12. The 1e-12 keeps an element where both are 0 from " +
      "dividing by 0. A correct formula lands far below 1e-6 in float64; the ln 2 " +
      "mistake lands at 0.1812 on every element it touches.",
    "Two evaluations of f per element makes this slow, which is the point: it is how " +
      "a formula is checked, never how a model is trained. Once the tests pass, check " +
      "your own cross_entropy_backward and embedding_backward together, on a real " +
      "batch of the corpus and a random table. Send this to the scratch pad and run it:",
    {
      code:
        "text = load_corpus()\n" +
        "chars, stoi, itos = build_vocab(text)\n" +
        "ids = encode(text, stoi)\n" +
        "n_val = len(ids) // 10\n" +
        "train = ids[: len(ids) - n_val]\n" +
        "\n" +
        "# A random table of scores and a small batch, so the check runs in seconds.\n" +
        `table = np.random.default_rng(${bench.gradcheck.seed}).normal(size=(len(chars), len(chars)))\n` +
        `x, y = get_batch(train, ${bench.gradcheck.block_size}, ${bench.gradcheck.batch_size}, np.random.default_rng(${bench.gradcheck.seed}))\n` +
        "\n" +
        "def loss_of(table):\n" +
        "    logits, _ = embedding_forward(table, x)\n" +
        "    return cross_entropy(logits, y)[0]\n" +
        "\n" +
        "# The formulas' gradient: the loss's slope per score, then back into the table.\n" +
        "logits, e_cache = embedding_forward(table, x)\n" +
        "loss, c_cache = cross_entropy(logits, y)\n" +
        "claimed = embedding_backward(cross_entropy_backward(c_cache), e_cache)\n" +
        "\n" +
        "err = grad_check(loss_of, table, claimed)\n" +
        'print("the formula passes" if err < 1e-6 else "the formula FAILS", f"(largest relative error {err:.0e})")\n' +
        "err = grad_check(loss_of, table, claimed * np.log(2.0))\n" +
        'print(f"without the ln 2 it fails at {err:.4f}")',
    },
    "The first line says the two backward passes you wrote agree with the nudged " +
      `slopes at every one of the ${bench.init.cells.toLocaleString()} entries of the ` +
      `table. The second is the same gradient with its ln 2 removed, failing at ` +
      `${gc.err_without_ln2_text}, which is (1.4427 minus 1) over (1.4427 plus 1). ` +
      "Every backward pass you write from here gets this check, and chapter 11 puts " +
      "the whole scribe through it.",
  ],
  skeleton,
  tests,
  solution,
  hints: [
    "numeric_grad: g = np.zeros_like(x, dtype=np.float64); for i in range(x.size): " +
      "old = x.flat[i]; set x.flat[i] = old + eps and call f(x); set x.flat[i] = old - " +
      "eps and call f(x); restore x.flat[i] = old; g.flat[i] = (up - down) / (2 * eps). " +
      "grad_check: numeric = numeric_grad(f, x, eps); return float(np.max(np.abs(numeric " +
      "- claimed) / (np.abs(numeric) + np.abs(claimed) + 1e-12))).",
    "The structure, in pseudocode:\n\n" +
      "    numeric_grad(f, x, eps):\n" +
      "        g = np.zeros_like(x, dtype=np.float64)\n" +
      "        for i in range(x.size):\n" +
      "            old = x.flat[i]\n" +
      "            x.flat[i] = old + eps;  up = f(x)\n" +
      "            x.flat[i] = old - eps;  down = f(x)\n" +
      "            x.flat[i] = old\n" +
      "            g.flat[i] = (up - down) / (2 * eps)\n" +
      "        return g\n\n" +
      "    grad_check(f, x, claimed, eps):\n" +
      "        numeric = numeric_grad(f, x, eps)\n" +
      "        return float(np.max(np.abs(numeric - claimed) /\n" +
      "                            (np.abs(numeric) + np.abs(claimed) + 1e-12)))",
  ],
};
