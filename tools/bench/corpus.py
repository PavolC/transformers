"""The corpus, the vocabulary, and the ladder's first two rungs.

Every number chapters 1 to 3 quote about the text itself, and the two
reference points the whole course is measured against: guessing evenly over
the vocabulary, and the counted bigram. Run by tools/bench/run.mjs under the
pinned Pyodide, so these are the reader's own engine's numbers.

Each section prints the prose sentence it backs.
"""

import json

import numpy as np
import course
import reference_scribe as rs

# The line chapter 1 opens on. Hardcoded here as well as in the prose,
# because every count below is derived from it in front of the reader.
LINE = "to be, or not to be"


def bits(x):
    return round(float(x), 4)


def main():
    out = {}

    # ---------------------------------------------------------------- the line
    pairs = {}
    for a, b in zip(LINE, LINE[1:]):
        pairs.setdefault(a, {}).setdefault(b, 0)
        pairs[a][b] += 1
    t_row = pairs["t"]
    space_row = pairs[" "]
    out["line"] = {
        "text": LINE,
        "chars": len(LINE),
        "pairs": len(LINE) - 1,
        "distinct_chars": len(set(LINE)),
        "rows": {a: dict(sorted(r.items(), key=lambda kv: -kv[1])) for a, r in sorted(pairs.items())},
    }
    print(f'The line "{LINE}" is {len(LINE)} characters, so reading it once gives '
          f"{len(LINE) - 1} pairs over {len(set(LINE))} distinct characters.")
    print(f"  The letter t has a next letter {sum(t_row.values())} times: "
          + ", ".join(f"{n} x {c!r}" for c, n in sorted(t_row.items(), key=lambda kv: -kv[1])) + ".")
    print(f"  After a space, {sum(space_row.values())} times: "
          + ", ".join(f"{n} x {c!r}" for c, n in sorted(space_row.items(), key=lambda kv: -kv[1])) + ".")

    # -------------------------------------------------------------- the corpus
    text = course.load_corpus()
    chars, stoi, itos = rs.build_vocab(text)
    ids = rs.encode(text, stoi)
    train_ids, val_ids = rs.split_data(ids)
    printable = "".join(c for c in chars if c not in "\n")
    out["corpus"] = {
        "chars": len(text),
        "lines": text.count("\n") + 1,
        "vocab_size": len(chars),
        "vocab": chars,
        "train_chars": int(len(train_ids)),
        "val_chars": int(len(val_ids)),
        "val_fraction": 0.1,
    }
    print(f"\nTiny Shakespeare is {len(text)} characters over {text.count(chr(10)) + 1} lines, "
          f"and its vocabulary is {len(chars)} distinct characters.")
    print(f"  The vocabulary, in order: {printable!r} plus the newline.")
    print(f"  Split nine to one: {len(train_ids)} characters to read, "
          f"{len(val_ids)} held back.")

    # ------------------------------------------------------- the ladder's rungs
    uniform = float(np.log2(len(chars)))
    counts = rs.bigram_counts(train_ids, len(chars))
    probs = rs.bigram_probs(counts, alpha=1.0)
    bigram_val = rs.bigram_avg_surprise_bits(probs, val_ids)
    bigram_train = rs.bigram_avg_surprise_bits(probs, train_ids)
    # How many of the 65 x 65 pairs the training text never shows: the reason
    # the counts are smoothed before they become probabilities.
    unseen = int((counts == 0).sum())
    out["ladder"] = {
        "uniform_bits": bits(uniform),
        "bigram_val_bits": bits(bigram_val),
        "bigram_train_bits": bits(bigram_train),
        "unseen_pairs": unseen,
        "possible_pairs": len(chars) ** 2,
        "smoothing_alpha": 1.0,
    }
    print(f"\nGuessing evenly over {len(chars)} characters costs log2({len(chars)}) = "
          f"{uniform:.4f} bits per character, which is the ceiling every model "
          "in the course is measured against.")
    print(f"  The counted bigram, add-1 smoothed, scores {bigram_val:.4f} bits on the "
          f"held-out tail ({bigram_train:.4f} on the text it counted): the ladder's "
          "first rung.")
    print(f"  Smoothing is not optional: {unseen} of the {len(chars) ** 2} possible "
          "pairs never occur in the training text, and an unsmoothed zero there "
          "costs infinite surprise the first time one shows up.")

    return json.dumps(out)
