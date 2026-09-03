"""Every number chapter 3 quotes.

The two hits chapter 1's score cannot tell apart, one row of the tally turned
into probabilities, the first steps of the surprise meter's walk over the
held-back text, the pairs the counting never saw, the same scorer on the text
it counted against the text it did not, and the ladder's first three rungs.

Run by tools/bench/run.mjs under the pinned Pyodide, so these are the reader's
own engine's numbers. The tally is chapter 1's count_pairs over the same nine
tenths chapter 1 counted, and the scorer is the reference copy of the three
functions the learner writes in this chapter, so a reader who runs their own
on the held-back tenth prints the same rung.

Each section prints the prose sentence it backs.
"""

import json

import numpy as np
import course
import reference_scribe as rs

# Add-alpha smoothing: every cell of the tally gets this much before the row
# is turned into probabilities, so a pair the counting never saw has a small
# probability rather than none. A free design choice, labelled as one in the
# chapter; 1 is the plainest value and the one reference_scribe defaults to.
ALPHA = 1.0

# How many steps of the meter's walk the chapter logs before the meter. Eight
# fits in one table and the running average has visibly not settled yet.
WALK = 8

# Rows chapter 1 already showed the reader: nearly certain, dominated, wide open.
CERTAIN, DOMINATED, OPEN = "q", "h", " "


def text4(x):
    """The four-decimal text the page displays and the snippet prints, done once
    here so the checker can look for exactly this string in the output."""
    return f"{float(x):.4f}"


def main():
    out = {}
    text = course.load_corpus()
    chars, stoi, itos = rs.build_vocab(text)
    ids = rs.encode(text, stoi)
    train_ids, val_ids = rs.split_data(ids)
    V = len(chars)
    counts = rs.count_pairs(train_ids, V)
    probs = rs.probs_from_tally(counts, ALPHA)
    with np.errstate(divide="ignore", invalid="ignore"):
        raw = rs.probs_from_tally(counts, 0.0)
    totals = counts.sum(axis=1)

    def bits_of(p):
        with np.errstate(divide="ignore"):
            b = float(-np.log2(p))
        return 0.0 if b == 0 else b

    def label(c):
        return {" ": "space", "\n": "newline"}.get(c, c)

    # ------------------------------------ two hits the hit rate cannot tell apart
    # Chapter 1 scored the favourite guess right or wrong. Here are two rows
    # whose favourite is right, and what each of those "rights" was worth.
    hits = {}
    for row in (CERTAIN, OPEN):
        r = stoi[row]
        fav = int(np.argmax(counts[r]))
        hits[row] = {
            "row": row, "favourite": chars[fav], "count": int(counts[r, fav]),
            "total": int(totals[r]),
            "prob": float(raw[r, fav]), "bits": bits_of(raw[r, fav]),
            "prob_smoothed": float(probs[r, fav]), "bits_smoothed": bits_of(probs[r, fav]),
        }
    # And one miss: the first position in the held-back text where the row is
    # the dominated one and the favourite was wrong. A miss costs a number,
    # not a cross.
    h = stoi[DOMINATED]
    fav_h = int(np.argmax(counts[h]))
    miss = None
    for i in range(len(val_ids) - 1):
        if val_ids[i] == h and val_ids[i + 1] != fav_h:
            nxt = int(val_ids[i + 1])
            miss = {"row": DOMINATED, "favourite": chars[fav_h], "actual": chars[nxt],
                    "position": i, "count": int(counts[h, nxt]), "total": int(totals[h]),
                    "prob": float(raw[h, nxt]), "bits": bits_of(raw[h, nxt]),
                    "prob_smoothed": float(probs[h, nxt]), "bits_smoothed": bits_of(probs[h, nxt])}
            break
    out["hits"] = {"certain": hits[CERTAIN], "open": hits[OPEN], "miss": miss}
    c, o = hits[CERTAIN], hits[OPEN]
    print(f"After {label(c['row'])} the favourite {c['favourite']!r} has probability "
          f"{c['prob']:.4f}, so when it is right the guess cost {c['bits']:.4f} bits; "
          f"after a {label(o['row'])} the favourite {o['favourite']!r} has probability "
          f"{o['prob']:.4f} and a right answer still cost {o['bits']:.4f} bits.")
    print(f"  The first time {miss['row']!r} is followed by something other than "
          f"{miss['favourite']!r} in the held-back text it is {miss['actual']!r}, at "
          f"probability {miss['prob']:.4f}: {miss['bits']:.4f} bits, a number rather "
          "than a cross.")

    # ---------------------------------------- one row, as counts and as probabilities
    r = stoi[DOMINATED]
    order = np.argsort(-counts[r], kind="stable")
    shown = 6
    row_entries = [{"char": chars[j], "count": int(counts[r, j]),
                    "prob": float(raw[r, j]), "prob_smoothed": float(probs[r, j])}
                   for j in order[:shown]]
    rest_count = int(counts[r, order[shown:]].sum())
    rest_prob = float(raw[r, order[shown:]].sum())
    out["row"] = {
        "char": DOMINATED, "total": int(totals[r]), "alpha": ALPHA,
        "smoothed_total": float(totals[r] + ALPHA * V), "vocab_size": V,
        "shown": shown, "entries": row_entries,
        "rest_count": rest_count, "rest_prob": rest_prob,
        "sum": float(raw[r].sum()),
        "sum_smoothed": float(probs[r].sum()),
    }
    assert abs(out["row"]["sum"] - 1.0) < 1e-12 and abs(out["row"]["sum_smoothed"] - 1.0) < 1e-12
    e0 = row_entries[0]
    print(f"\nThe row for {DOMINATED!r} holds {int(totals[r])} counts, {e0['count']} of them "
          f"{e0['char']!r}, so dividing by the total gives {e0['char']!r} probability "
          f"{e0['prob']:.4f} and the row sums to {raw[r].sum():.1f}. With {ALPHA:g} added to "
          f"each of its {V} cells the row totals {totals[r] + ALPHA * V:g} and "
          f"{e0['char']!r} moves to {e0['prob_smoothed']:.4f}.")

    # ------------------------------------------------------- what a bit costs
    # Exact by construction: these are the numbers the reader derives by hand.
    table = [(1.0, 0), (0.5, 1), (0.25, 2), (0.125, 3), (1 / 1024, 10)]
    out["bits_table"] = [{"prob": p, "bits": b} for p, b in table]
    for p, b in table:
        assert abs(-np.log2(p) - b) < 1e-12
    print("  A probability of 1 costs 0 bits, 1/2 costs 1, 1/4 costs 2, 1/8 costs 3, "
          "and 1/1024 costs 10: each halving is one more bit.")

    # -------------------------------------------------- the meter's first steps
    s = rs.surprise_bits(probs, val_ids)
    s_raw = rs.surprise_bits(raw, val_ids)
    running_raw = np.cumsum(s_raw[:WALK]) / np.arange(1, WALK + 1)
    out["walk"] = [{
        "position": i,
        "current": chars[val_ids[i]], "next": chars[val_ids[i + 1]],
        "count": int(counts[val_ids[i], val_ids[i + 1]]),
        "total": int(totals[val_ids[i]]),
        "prob": float(raw[val_ids[i], val_ids[i + 1]]),
        "bits": float(s_raw[i]), "running": float(running_raw[i]),
    } for i in range(WALK)]
    w = out["walk"]
    print(f"\nUnsmoothed, the held-back text opens {''.join(chars[i] for i in val_ids[:WALK + 1])!r}. "
          f"Its first step, {w[0]['current']!r} then {w[0]['next']!r}, had probability "
          f"{w[0]['prob']:.4f} and cost {w[0]['bits']:.4f} bits; after {WALK} steps the "
          f"running average is {w[-1]['running']:.4f}.")

    # ------------------------------------------ the pairs the counting never saw
    seen = counts[val_ids[:-1], val_ids[1:]]
    unseen_idx = np.where(seen == 0)[0]
    first = int(unseen_idx[0])
    worst = int(np.argmax(s))
    out["unseen"] = {
        "count": int(len(unseen_idx)), "of": int(len(val_ids) - 1),
        "first_position": first,
        "first_pair": [chars[val_ids[first]], chars[val_ids[first + 1]]],
        "first_row_total": int(totals[val_ids[first]]),
        "first_prob": float(probs[val_ids[first], val_ids[first + 1]]),
        "first_bits": float(s[first]),
        "worst_pair": [chars[val_ids[worst]], chars[val_ids[worst + 1]]],
        "worst_bits": float(s[worst]),
        "worst_bits_text": f"{float(s[worst]):.2f}",
        # The whole table's view of the same fact, for the caption.
        "zero_cells": int((counts == 0).sum()), "cells": V * V,
    }
    u = out["unseen"]
    print(f"\n{u['count']} of the {u['of']} pairs in the held-back text never occurred in "
          f"the training text. The first is {u['first_pair'][0]!r} then "
          f"{u['first_pair'][1]!r} at position {first}: unsmoothed, probability 0 and "
          f"infinite surprise; with {ALPHA:g} added, probability {u['first_prob']:.6f} "
          f"and {u['first_bits']:.2f} bits. The single most expensive character in the "
          f"tenth costs {u['worst_bits']:.2f} bits.")

    # -------------------------------------- the text it counted, and the text it did not
    val_bits = rs.avg_surprise(probs, val_ids)
    train_bits = rs.avg_surprise(probs, train_ids)
    out["heldout"] = {
        "val_bits": val_bits, "train_bits": train_bits, "gap": val_bits - train_bits,
        "val_chars": int(len(val_ids)), "train_chars": int(len(train_ids)),
    }
    print(f"\nThe same tally scores {train_bits:.4f} bits per character on the text it "
          f"counted and {val_bits:.4f} on the tenth it never read.")

    # ------------------------------------------------------------- the ladder
    uniform = float(np.log2(V))
    letter_counts = np.bincount(train_ids, minlength=V).astype(np.float64)
    letter_probs = (letter_counts + ALPHA) / (letter_counts.sum() + ALPHA * V)
    unigram = float(-np.log2(letter_probs[val_ids]).mean())
    out["ladder"] = {
        "uniform_bits": uniform, "unigram_bits": unigram, "bigram_val_bits": val_bits,
        "bigram_val_text": text4(val_bits),
        "rungs": [
            {"id": "uniform", "label": f"guess evenly over {V}", "bits": uniform, "chapter": 3},
            {"id": "unigram", "label": "letter frequency alone", "bits": unigram, "chapter": 3},
            {"id": "bigram", "label": "the counted tally", "bits": val_bits, "chapter": 3},
        ],
    }
    print(f"\nGuessing evenly over {V} characters costs log2({V}) = {uniform:.4f} bits; "
          f"guessing by letter frequency alone costs {unigram:.4f}; the counted tally "
          f"costs {val_bits:.4f}. Three rungs.")

    # ---------------------------------------------------- the receipt the snippet prints
    out["receipt"] = {
        "val_text": text4(val_bits), "train_text": text4(train_bits),
        "unseen_count": u["count"], "unseen_of": u["of"],
        "worst_bits_text": u["worst_bits_text"],
    }
    return json.dumps(out)
