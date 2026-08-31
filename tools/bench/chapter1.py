"""Every number chapter 1 quotes.

The pair tally on the line, the same tally over the whole corpus, what its
favourite guesses are, how often the favourite is right, and what it writes
when it feeds its own answers back in. Run by tools/bench/run.mjs under the
pinned Pyodide, so these are the reader's own engine's numbers.

The sampled text below is the PYTHON engine's, from this file's own seeded
generator. The chapter's letter-wheel panel samples in JavaScript from the
same tally, so it draws different letters from the same counts, and the prose
never quotes one for the other (CLAUDE.md, "Numbers").

Each section prints the prose sentence it backs.
"""

import json

import numpy as np
import course
import reference_scribe as rs

LINE = "to be, or not to be"

# The letters chapter 1 looks up by hand in the corpus tally. Chosen because
# each one shows a different shape of row: q is nearly certain, a space is
# wide open, and h is dominated by one continuation without being certain.
LOOKUPS = ["q", "h", "z", " "]

# How much sampled text the chapter shows.
SAMPLE_CHARS = 220


def top_row(counts, chars, ch, k=4):
    """The k most common successors of ch, as (char, count, share).

    Shares are stored unrounded. The page rounds them once for display, and a
    share rounded here as well moves the last digit: the space row's 's' is
    7.1505 percent, which a round to four places turns into 0.0715 and the
    page then renders as 7.1 rather than 7.2.
    """
    row = counts[chars.index(ch)]
    total = float(row.sum())
    order = np.argsort(-row)[:k]
    return total, [
        {"char": chars[int(i)], "count": int(row[int(i)]), "share": float(row[int(i)]) / total}
        for i in order
        if row[int(i)] > 0
    ]


def main():
    out = {}

    # ------------------------------------------------------------- the line
    pairs = {}
    for a, b in zip(LINE, LINE[1:]):
        pairs.setdefault(a, {}).setdefault(b, 0)
        pairs[a][b] += 1
    out["line"] = {
        "text": LINE,
        "chars": len(LINE),
        "pairs": len(LINE) - 1,
        "rows": {a: dict(sorted(r.items(), key=lambda kv: (-kv[1], kv[0]))) for a, r in sorted(pairs.items())},
        "row_totals": {a: sum(r.values()) for a, r in sorted(pairs.items())},
    }
    print(f'Reading "{LINE}" once gives {len(LINE) - 1} pairs.')
    for a in ("t", "o", "b", " "):
        row = ", ".join(f"{n} x {c!r}" for c, n in sorted(pairs[a].items(), key=lambda kv: (-kv[1], kv[0])))
        print(f"  {a!r} is followed {sum(pairs[a].values())} times: {row}.")

    # ----------------------------------------------------------- the corpus
    text = course.load_corpus()
    chars, stoi, itos = rs.build_vocab(text)
    ids = rs.encode(text, stoi)
    train_ids, val_ids = rs.split_data(ids)
    counts = rs.bigram_counts(train_ids, len(chars))

    out["corpus"] = {
        "chars": len(text),
        "vocab_size": len(chars),
        "train_chars": int(len(train_ids)),
        "val_chars": int(len(val_ids)),
        "pairs_counted": int(counts.sum()),
    }
    print(f"\nThe same counting over the corpus reads {len(train_ids)} characters and "
          f"tallies {int(counts.sum())} pairs into a {len(chars)} by {len(chars)} table.")

    # --------------------------------------------------- rows worth looking at
    out["rows"] = {}
    for ch in LOOKUPS:
        total, top = top_row(counts, chars, ch)
        out["rows"][ch] = {"total": int(total), "top": top}
        shown = ", ".join(f"{t['char']!r} {t['share'] * 100:.1f}%" for t in top)
        name = "a space" if ch == " " else repr(ch)
        print(f"  After {name} ({int(total)} times in the training text): {shown}.")

    # ------------------------------- how often the favourite guess is right
    # The tally's single best guess for each character, scored on held-out
    # text: the plainest measure of a model that has not met probability yet.
    favourite = counts.argmax(axis=1)
    predicted = favourite[val_ids[:-1]]
    hits = int((predicted == val_ids[1:]).sum())
    n = int(len(val_ids) - 1)
    # The one-guess baseline it has to beat: always answer the corpus's most
    # common character, whatever came before.
    overall = np.bincount(train_ids, minlength=len(chars))
    common = int(overall.argmax())
    flat_hits = int((val_ids[1:] == common).sum())
    out["favourite_guess"] = {
        "hits": hits,
        "of": n,
        "share": hits / n,
        "baseline_char": chars[common],
        "baseline_hits": flat_hits,
        "baseline_share": flat_hits / n,
    }
    print(f"\nTaking the tally's favourite guess every time is right {hits} times out of "
          f"{n} on the held-out text, {hits / n * 100:.1f} percent.")
    print(f"  Always answering {chars[common]!r}, the corpus's most common character, "
          f"is right {flat_hits / n * 100:.1f} percent of the time, so the tally is "
          f"{hits / max(flat_hits, 1):.1f} times better than that.")

    # ------------------------------------------------------ what it writes
    # Sampling by proportion, not by favourite: the favourite alone gets stuck
    # in a loop, which is worth showing next to the sampled text.
    probs = rs.bigram_probs(counts, alpha=0.0)
    rng = np.random.default_rng(7)
    ids_out = [stoi["\n"]]
    for _ in range(SAMPLE_CHARS):
        row = probs[ids_out[-1]]
        ids_out.append(int(rng.choice(len(row), p=row)))
    sample = rs.decode(np.array(ids_out, dtype=np.int64), itos)

    # Start the always-the-favourite run from 't' rather than from a newline.
    # A newline's favourite is another newline, so that run prints a column of
    # blank lines: a demonstration in which the mechanism is invisible
    # (CLAUDE.md, "Demonstrate where the mechanism is visible"). From 't' the
    # loop is legible as a loop.
    stuck = [stoi["t"]]
    for _ in range(24):
        stuck.append(int(favourite[stuck[-1]]))
    loop = rs.decode(np.array(stuck, dtype=np.int64), itos)

    # Both texts begin with the character the walk started from, so the length
    # of the text is one more than the number of draws that made it. Record
    # both numbers under names that say which is which: a chapter sentence
    # that quotes the text has to count what the reader sees, and an exercise
    # snippet that reproduces the text has to print the starting character too.
    out["sample"] = {
        "seed": 7,
        "steps": SAMPLE_CHARS,
        "chars": len(sample),
        "start_char": "\n",
        "text": sample,
        "engine": "Python",
    }
    out["favourite_loop"] = {
        "steps": 24,
        "chars": len(loop),
        "start_char": "t",
        "text": loop,
    }
    print(f"\nSampling by proportion for {SAMPLE_CHARS} draws from a line break "
          f"(seed 7, this file's Python generator), {len(sample)} characters "
          "including the line break it started from:")
    print("    " + sample.replace("\n", "\\n"))
    print(f"  Always taking the favourite instead falls into a loop after a few "
          f"characters, starting from 't': {loop!r}")

    # ------------------------------------------- what the pair model forgets
    # The same character gets the same guess list however it got there, which
    # is the whole limit of a pair model and the reason chapter 5 exists.
    probe = "th"
    row_h = counts[stoi["h"]]
    top_h = chars[int(row_h.argmax())]
    out["forgetting"] = {
        "probe": probe,
        "after_h_top": top_h,
        "after_h_share": float(row_h.max() / row_h.sum()),
        "contexts_collapsed": len(chars),
    }
    print(f"\nEvery context ending in 'h' gets one guess list: {top_h!r} at "
          f"{float(row_h.max() / row_h.sum()) * 100:.1f} percent, whether the h "
          f"followed a t, a space, or anything else. The tally keeps one row per "
          f"character, so all {len(chars)} ways of arriving at an h collapse into "
          "the same row.")

    return json.dumps(out)
