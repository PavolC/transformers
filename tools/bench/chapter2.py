"""Every number chapter 2 quotes.

The two units the corpus can be read in (characters and whitespace words),
the vocabulary sorted into kinds, the crossing between text and ids on
chapter 1's line, one worked window with all of its predictions, one batch,
and the receipt that a batch's pairs are pairs chapter 1's tally counted.

Run by tools/bench/run.mjs under the pinned Pyodide, so these are the
reader's own engine's numbers. Every window and batch below comes from
reference_scribe.get_batch with a stated seed, which is the function the
learner writes in this chapter, so a reader who runs their own get_batch with
the same seed gets the same characters.

Each section prints the prose sentence it backs.
"""

import json

import numpy as np
import course
import reference_scribe as rs

# Chapter 1's line, so the crossing beat can show the same characters getting
# different ids under a different vocabulary.
LINE = "to be, or not to be"

# The worked window and batch. Small enough to print in full, and seed 0's
# first row reads as English all the way through, which is what makes the
# eight predictions inside one window legible.
DEMO_T = 8
DEMO_B = 4
DEMO_SEED = 0

# The scribe's real shape, from the M0 spike (CLAUDE.md, Pinned versions).
# Chapter 10 trains at exactly these; chapter 2 quotes them to say what one
# batch of the real thing costs and buys.
BLOCK_SIZE = 32
BATCH_SIZE = 16

# How the 65 characters sort. Membership is decided here rather than by
# str.isalpha and friends, so the chapter's four kinds are the four kinds a
# reader can check by eye against the strip.
KINDS = {
    "whitespace": "\n ",
    "punctuation": "!$&',-.:;?",
    "digit": "3",
}


def main():
    out = {}
    text = course.load_corpus()
    chars, stoi, itos = rs.build_vocab(text)
    ids = rs.encode(text, stoi)
    train_ids, val_ids = rs.split_data(ids)

    # ------------------------------------------------------- the two units
    words = text.split()
    distinct_words = set(words)
    seen = {}
    for w in words:
        seen[w] = seen.get(w, 0) + 1
    once = sum(1 for n in seen.values() if n == 1)
    out["units"] = {
        "chars": len(text),
        "vocab_size": len(chars),
        "words": len(words),
        "distinct_words": len(distinct_words),
        "words_once": once,
        "words_once_share": once / len(distinct_words),
        "chars_per_word": len(text) / len(words),
        "vocab_ratio": len(distinct_words) / len(chars),
        # What chapter 1's tally would cost under each unit: one row and one
        # column per distinct token.
        "char_cells": len(chars) ** 2,
        "word_cells": len(distinct_words) ** 2,
    }
    print(f"Read as characters the corpus is {len(text)} tokens over {len(chars)} "
          f"distinct ones; read as whitespace-separated words it is {len(words)} "
          f"tokens over {len(distinct_words)} distinct ones.")
    print(f"  {once} of those {len(distinct_words)} words occur exactly once "
          f"({once / len(distinct_words) * 100:.0f} percent of the vocabulary), and the "
          f"word vocabulary is {len(distinct_words) / len(chars):.0f} times the "
          "character vocabulary.")
    print(f"  Chapter 1's tally is {len(chars) ** 2} cells over characters and would "
          f"be {len(distinct_words) ** 2} over words.")
    print(f"  A word is {len(text) / len(words):.2f} characters including the space "
          f"after it, so a window of {BLOCK_SIZE} characters covers about "
          f"{BLOCK_SIZE / (len(text) / len(words)):.1f} words.")

    # -------------------------------------------------------- the vocabulary
    counts = {ch: text.count(ch) for ch in chars}
    kind_of = {}
    for ch in chars:
        for name, members in KINDS.items():
            if ch in members:
                kind_of[ch] = name
                break
        else:
            kind_of[ch] = "upper" if ch.isupper() else "lower"
    kind_sizes = {}
    for ch in chars:
        kind_sizes[kind_of[ch]] = kind_sizes.get(kind_of[ch], 0) + 1
    assert sum(kind_sizes.values()) == len(chars)
    assert kind_sizes["upper"] == 26 and kind_sizes["lower"] == 26

    ordered = sorted(chars, key=lambda c: -counts[c])
    rarest = ordered[-3:]
    # Where the three rarest characters occur, because each one is a fact
    # about this corpus rather than about English: the '$' is a typo in the
    # source text, the '&' is an abbreviation, the '3' is a play's title.
    contexts = {}
    for ch in rarest:
        at = text.index(ch)
        # Newlines drawn as spaces, then trimmed: a context that opens on a
        # blank line is quoted in the prose with two spaces in front of it.
        contexts[ch] = text[at - 12 : at + 12].replace("\n", " ").strip()
    out["vocab"] = {
        "size": len(chars),
        "chars": chars,
        "counts": [counts[ch] for ch in chars],
        "shares": [counts[ch] / len(text) for ch in chars],
        "kinds": {"letters": kind_sizes["upper"] + kind_sizes["lower"],
                  "punctuation": kind_sizes["punctuation"],
                  "whitespace": kind_sizes["whitespace"],
                  "digit": kind_sizes["digit"]},
        "top": [{"char": ch, "count": counts[ch], "share": counts[ch] / len(text)}
                for ch in ordered[:3]],
        "rarest": [{"char": ch, "count": counts[ch], "context": contexts[ch]}
                   for ch in rarest],
    }
    print(f"\nThe vocabulary is {len(chars)} characters: "
          f"{kind_sizes['upper'] + kind_sizes['lower']} letters, "
          f"{kind_sizes['punctuation']} punctuation marks, "
          f"{kind_sizes['whitespace']} kinds of whitespace and "
          f"{kind_sizes['digit']} digit.")
    print("  The three most common: "
          + ", ".join(f"{ch!r} {counts[ch]} ({counts[ch] / len(text) * 100:.1f}%)"
                      for ch in ordered[:3]))
    print("  The three rarest: "
          + ", ".join(f"{ch!r} {counts[ch]} in {contexts[ch]!r}" for ch in rarest))

    # ---------------------------------------------------------- the crossing
    line_ids = rs.encode(LINE, stoi)
    # The same line under the vocabulary of chapter 1, which was built from
    # the line alone: the ids of a character are a property of the vocabulary
    # it was numbered in, not of the character.
    line_chars, line_stoi, line_itos = rs.build_vocab(LINE)
    line_own_ids = rs.encode(LINE, line_stoi)
    round_trip = rs.decode(ids, itos) == text
    assert round_trip, "decode(encode(text)) must give the text back exactly"
    out["crossing"] = {
        "line": LINE,
        "corpus_ids": [int(i) for i in line_ids],
        "own_vocab": line_chars,
        "own_ids": [int(i) for i in line_own_ids],
        "round_trip": round_trip,
        "corpus_ids_len": int(len(line_ids)),
        "train_chars": int(len(train_ids)),
        "val_chars": int(len(val_ids)),
    }
    print(f"\nUnder the corpus's vocabulary {LINE!r} encodes to "
          f"{[int(i) for i in line_ids]}.")
    print(f"  Under chapter 1's own {len(line_chars)}-character vocabulary the same "
          f"line is {[int(i) for i in line_own_ids]}: the same characters, different "
          "numbers.")
    print(f"  decode(encode(the whole corpus)) gives back all {len(text)} characters "
          "unchanged.")

    # ------------------------------------------------ one window's own log
    rng = np.random.default_rng(DEMO_SEED)
    x, y = rs.get_batch(train_ids, DEMO_T, DEMO_B, rng)
    # Where row 0's window starts. get_batch returns the windows rather than
    # the offsets, so the same draw is repeated from a fresh generator and
    # checked against the row it is supposed to explain: chapter 2's slicer
    # panel opens at this offset, so the panel and the prose show one window.
    starts = np.random.default_rng(DEMO_SEED).integers(
        0, len(train_ids) - DEMO_T - 1, size=DEMO_B)
    start = int(starts[0])
    assert (train_ids[start : start + DEMO_T] == x[0]).all()
    window = {
        "block_size": DEMO_T,
        "batch_size": DEMO_B,
        "seed": DEMO_SEED,
        "start": start,
        "x_ids": [int(i) for i in x[0]],
        "y_ids": [int(i) for i in y[0]],
        "x_text": rs.decode(x[0], itos),
        "y_text": rs.decode(y[0], itos),
        "pairs": [{"context": rs.decode(x[0][: t + 1], itos),
                   "target": itos[int(y[0][t])]}
                  for t in range(DEMO_T)],
    }
    out["window"] = window
    print(f"\nOne window of {DEMO_T} characters (seed {DEMO_SEED}, row 0 of a "
          f"{DEMO_B} by {DEMO_T} batch) is {DEMO_T} training examples, not one:")
    print(f"  x = {window['x_text']!r}, y = {window['y_text']!r}")
    for p in window["pairs"]:
        print(f"    after {p['context']!r} comes {p['target']!r}")

    # ------------------------------------------------------------- the batch
    out["batch"] = {
        "shape": [DEMO_B, DEMO_T],
        "seed": DEMO_SEED,
        "rows": [{"x_text": rs.decode(x[b], itos), "y_text": rs.decode(y[b], itos)}
                 for b in range(DEMO_B)],
        "x_ids": [[int(i) for i in row] for row in x],
        "predictions": DEMO_B * DEMO_T,
    }
    print(f"\nThe whole {DEMO_B} by {DEMO_T} batch, {DEMO_B * DEMO_T} predictions from "
          f"{DEMO_B * (DEMO_T + 1)} characters of text:")
    for row in out["batch"]["rows"]:
        print(f"  x = {row['x_text']!r}  y = {row['y_text']!r}")

    # --------------------------------------------- what the real batch costs
    starts = int(len(train_ids) - BLOCK_SIZE - 1)
    per_batch = BATCH_SIZE * BLOCK_SIZE
    chars_touched = BATCH_SIZE * (BLOCK_SIZE + 1)
    out["real"] = {
        "block_size": BLOCK_SIZE,
        "batch_size": BATCH_SIZE,
        "predictions": per_batch,
        "starts": starts,
        "chars_touched": chars_touched,
        "batches_per_pass": len(train_ids) / chars_touched,
        "window_words": BLOCK_SIZE / (len(text) / len(words)),
    }
    print(f"\nAt the scribe's real shape, {BATCH_SIZE} windows of {BLOCK_SIZE}, one "
          f"batch is {per_batch} predictions from {chars_touched} characters, drawn "
          f"from {starts} possible starting points in the training text.")
    print(f"  {len(train_ids) / chars_touched:.0f} batches read as many characters as "
          "the training text holds, and the starts are drawn independently, so that "
          "is not a pass over the text.")

    # ------------------------------ the receipt: a batch's pairs are the tally's
    # Every (x[b, t], y[b, t]) cell is a pair of neighbours, so chapter 1's
    # tally, counted over the training text, has a nonzero count in every one
    # of them. This is the check the exercise prompt asks the reader to run.
    tally = rs.count_pairs(train_ids, len(chars))
    hits = int((tally[x.ravel(), y.ravel()] > 0).sum())
    out["receipt"] = {
        "of": int(x.size),
        "counted": hits,
        "tally_total": int(tally.sum()),
    }
    print(f"\nEvery one of the batch's {x.size} (x, y) pairs is a pair of neighbours, "
          f"so chapter 1's tally has a count for it: {hits} of {x.size}.")

    return json.dumps(out)
