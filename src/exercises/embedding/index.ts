import type { Exercise } from "../types";
import bench from "../../bench/chapter4.json";
import skeleton from "./skeleton.py?raw";
import tests from "./tests.py?raw";
import solution from "./solution.py?raw";

const walk = bench.walk;

export const embeddingExercise: Exercise = {
  id: "embedding",
  title: "The embedding table",
  prompt: [
    "The table with one row per character, read by id, and the gradient's way " +
      "back into it. The caller hands in the table, a (V, C) array with a row for " +
      "each of the V characters and C numbers in each row (in this chapter C is V " +
      "and a row is a row of scores; chapter 5 makes C smaller), and ids, a (B, T) " +
      "array of character ids, chapter 2's x. embedding_forward(table, ids) returns " +
      "out, the (B, T, C) array holding, at every position, the row of the character " +
      "that sits there: out[b, t] is table[ids[b, t]], and table[ids] with the whole " +
      "ids array does every position at once. Return it with a cache holding the ids " +
      "and the table's shape.",
    "embedding_backward(d_out, cache) takes d_out, a (B, T, C) array of slopes, one " +
      "for every number the forward pass produced, and returns the slope of the loss " +
      "with respect to every entry of the table, a (V, C) array. The row a position " +
      "read is the row its slopes belong to. When the same character sits at several " +
      "positions, its row was read several times and collects all of their slopes " +
      "added together; a row no position read gets zeros. That is chapter 1's " +
      "accumulate-on-repeat again: np.add.at(d_table, ids.reshape(-1), " +
      "d_out.reshape(-1, C)) adds every position's slopes into its row, where a plain " +
      "d_table[ids] = d_out would keep one and drop the rest. reshape(-1) flattens " +
      "the (B, T) ids to one list of B times T ids, and reshape(-1, C) flattens " +
      "d_out to the matching list of rows.",
    "Once the tests pass, read chapter 3's first eight steps of the held-back text " +
      "through the counted table as a lookup, and count the reads with the backward " +
      "pass. Send this to the scratch pad and run it:",
    {
      code:
        "text = load_corpus()\n" +
        "chars, stoi, itos = build_vocab(text)\n" +
        "ids = encode(text, stoi)\n" +
        "n_val = len(ids) // 10\n" +
        "train, val = ids[: len(ids) - n_val], ids[len(ids) - n_val :]\n" +
        "\n" +
        "# Chapter 3's unsmoothed table, as the thing being looked up.\n" +
        "table = probs_from_tally(count_pairs(train, len(chars)), alpha=0.0)\n" +
        `x = val[:${bench.walk.steps}][None, :]          # one window of the first ${bench.walk.steps} held-back characters\n` +
        "out, cache = embedding_forward(table, x)\n" +
        'print("out is", out.shape)\n' +
        "# At each step, the row's probability for the character that really came next.\n" +
        `steps = [out[0, t, val[t + 1]] for t in range(${bench.walk.steps})]\n` +
        'print(", ".join(f"{p:.4f}" for p in steps))\n' +
        "\n" +
        "# A gradient of all ones, sent back: every row collects 1 per time it was read.\n" +
        "reads = embedding_backward(np.ones_like(out), cache)[:, 0]\n" +
        "seen = []\n" +
        `for i in val[:${bench.walk.steps}]:\n` +
        "    if i not in seen:\n" +
        "        seen.append(i)\n" +
        "label = {\" \": \"space\", \"\\n\": \"newline\"}\n" +
        'print(", ".join(f"{label.get(chars[i], chars[i])} x{int(reads[i])}" for i in seen))',
    },
    `The probabilities are the surprise meter's first ${walk.steps} steps, ` +
      `${walk.probs_text}, now produced by a lookup rather than by indexing a pair. ` +
      `The last line, ${walk.reads_text}, is the backward pass counting: the held-back ` +
      "text opens on newlines, and the newline's row was read once per newline.",
  ],
  skeleton,
  tests,
  solution,
  hints: [
    "Forward is one line: return table[ids], (ids, table.shape). Backward is three: " +
      "d_table = np.zeros(shape); np.add.at(d_table, ids.reshape(-1), " +
      "d_out.reshape(-1, d_out.shape[-1])); return d_table.",
    "The structure, in pseudocode:\n\n" +
      "    embedding_forward(table, ids):\n" +
      "        return table[ids], (ids, table.shape)\n\n" +
      "    embedding_backward(d_out, cache):\n" +
      "        ids, shape = cache\n" +
      "        d_table = np.zeros(shape)\n" +
      "        np.add.at(d_table, ids.reshape(-1), d_out.reshape(-1, <C>))\n" +
      "        return d_table\n\n" +
      "    C is d_out.shape[-1]. The two reshapes turn (B, T) ids and (B, T, C)\n" +
      "    slopes into B * T ids beside B * T rows, which is what np.add.at pairs up.",
  ],
};
