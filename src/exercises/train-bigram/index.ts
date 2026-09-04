import type { Exercise } from "../types";
import bench from "../../bench/chapter4.json";
import skeleton from "./skeleton.py?raw";
import tests from "./tests.py?raw";
import solution from "./solution.py?raw";

const receipt = bench.receipt;

export const trainBigramExercise: Exercise = {
  id: "train-bigram",
  title: "The learned tally",
  prompt: [
    "Chapter 1's table, found by training instead of counting. Four small " +
      "functions make the model, and the course's train_driver, the loop the panel " +
      "above ran, drives them. init_bigram(vocab_size) makes the parameters: a dict " +
      "with one entry, \"table\", a (vocab_size, vocab_size) array of zeros, one row " +
      "of scores per character. Zeros, because a row of equal scores is an even " +
      "guess and the untrained model should start on the ceiling rung.",
    "bigram_forward(params, x) takes that dict and a (B, T) batch of ids, chapter " +
      "2's x, and returns (logits, cache): the (B, T, V) array holding the table's row " +
      "for the character at every position, which is exactly embedding_forward's job, " +
      "and the cache it hands back. bigram_backward(d_logits, cache, params) takes the " +
      "(B, T, V) slopes cross_entropy_backward produced and returns a dict of " +
      "gradients mirroring params key for key, so {\"table\": the (V, V) array " +
      "embedding_backward produces}. sgd_step(params, grads, lr) moves every parameter " +
      "against its gradient: for each name, params[name] becomes params[name] minus " +
      "lr times grads[name]. It changes the dict in place and returns it.",
    "The dict is the seam. Every model after this one is a dict of arrays with a " +
      "forward, a backward and the same sgd_step, so the driver never changes; only " +
      "the functions handed to it do. Once the tests pass, train the table at the " +
      "panel's settings and put your own rung on the ladder. Send this to the scratch " +
      "pad and run it (a few thousand steps take a little while in the tab):",
    {
      code:
        "text = load_corpus()\n" +
        "chars, stoi, itos = build_vocab(text)\n" +
        "ids = encode(text, stoi)\n" +
        "n_val = len(ids) // 10\n" +
        "train, val = ids[: len(ids) - n_val], ids[len(ids) - n_val :]\n" +
        "\n" +
        "params = init_bigram(len(chars))\n" +
        "losses = train_driver(\n" +
        "    params, train,\n" +
        "    forward_fn=bigram_forward, backward_fn=bigram_backward,\n" +
        "    loss_fn=cross_entropy, loss_backward_fn=cross_entropy_backward, step_fn=sgd_step,\n" +
        `    steps=${bench.init.steps}, batch_size=${bench.init.batch_size}, block_size=${bench.init.block_size}, lr=${bench.init.lr_text}, rng=np.random.default_rng(${bench.init.seed}),\n` +
        ")\n" +
        'print(f"first batch {losses[0]:.4f} bits, last 50 steps average {np.mean(losses[-50:]):.4f}")\n' +
        "\n" +
        "learned = eval_driver(params, val, forward_fn=bigram_forward, loss_fn=cross_entropy, block_size=32)\n" +
        "counted = avg_surprise(probs_from_tally(count_pairs(train, len(chars)), alpha=1.0), val)\n" +
        'print(f"{learned:.4f} bits per character on the held-back tenth, learned")\n' +
        'print(f"{counted:.4f} bits per character on the held-back tenth, counted")',
    },
    `The first batch scores ${receipt.first_batch_text} bits, the ceiling, because ` +
      `a table of zeros guesses evenly. The last 50 steps average ${receipt.last50_text}. ` +
      `Scored on every step of the held-back tenth, the learned table gets ` +
      `${receipt.learned_val_text} bits against the counted tally's ` +
      `${receipt.counted_val_text}: the same seed and the same settings as the panel, ` +
      "so the same numbers, now from four functions of yours.",
  ],
  skeleton,
  tests,
  solution,
  hints: [
    "init_bigram: return {\"table\": np.zeros((vocab_size, vocab_size))}. " +
      "bigram_forward: return embedding_forward(params[\"table\"], x). bigram_backward: " +
      "return {\"table\": embedding_backward(d_logits, cache)}. sgd_step: loop over " +
      "params, params[name] = params[name] - lr * grads[name], then return params.",
    "The structure, in pseudocode:\n\n" +
      "    init_bigram(vocab_size):\n" +
      "        return {\"table\": np.zeros((vocab_size, vocab_size))}\n\n" +
      "    bigram_forward(params, x):\n" +
      "        return embedding_forward(params[\"table\"], x)\n\n" +
      "    bigram_backward(d_logits, cache, params):\n" +
      "        return {\"table\": embedding_backward(d_logits, cache)}\n\n" +
      "    sgd_step(params, grads, lr):\n" +
      "        for name in params:\n" +
      "            params[name] = params[name] - lr * grads[name]\n" +
      "        return params",
  ],
};
