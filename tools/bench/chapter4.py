"""Every number chapter 4 quotes.

Four made-up scores turned into a guess list by hand, the loss's slope at each
of them measured by nudging and predicted by the formula, one step downhill,
the learned tally trained from a table of zeros on the corpus at the panel's
own settings, the learned row for h beside the counted one, where the gap
between the two tables lives, and the ladder's fourth rung.

Run by tools/bench/run.mjs under the pinned Pyodide, so these are the reader's
own engine's numbers. The training run is reference_scribe.train_driver with
the reference copies of the functions the learner writes in this chapter, at
the seed and settings the chapter's panel starts on, so the panel's final
number and the number in the prose are one computation.

Each section prints the prose sentence it backs.
"""

import json

import numpy as np
import course
import reference_scribe as rs

# Chapter 3's smoothing, for the counted rung this chapter compares against.
ALPHA = 1.0

# The hand row: four made-up scores for four characters that might follow h.
# Hand-placed, and the chapter says so; the same four scores the softmax
# exercise's test checks, so the reader's own function prints these numbers.
# The real next character in the made-up step is the fourth one.
HAND_CHARS = ["e", "a", "i", "o"]
HAND_SCORES = [2.0, 0.0, -2.0, 1.0]
HAND_NEXT = 3
HAND_LR = 1.0
# The nudge for the hand slope table. A thousandth is small enough that the
# nudged slope agrees with the formula to the fourth decimal the table shows,
# and large enough that the two nudged losses differ visibly from the loss.
HAND_EPS = 1e-3

# The training run: chapter 2's batch shape, and a learning rate and step
# count chosen as a free design choice (the chapter says so and prices it):
# 20 is the largest rate in a sweep that still descends smoothly, and 4,000
# steps is where the last 50 steps' average stops moving at the third decimal.
BATCH_SIZE = 16
BLOCK_SIZE = 32
LR = 20.0
STEPS = 4000
SEED = 0
# Steps whose loss the prose quotes from the curve.
LOG_STEPS = [1, 10, 100, 500, 1000, 2000, 4000]
# The other learning rates the chapter prices the choice of LR against, each
# run for the same STEPS from the same seed.
SWEEP_LRS = [5.0, 100.0, 300.0]
# How many followers of a row the row figures show before summing the rest.
SHOWN = 6
# The row the chapter walks (chapter 3's row) and the rare row it prices.
ROW, RARE = "h", "z"


def text4(x):
    """The four-decimal text the page displays and the snippet prints, done once
    here so the checker can look for exactly this string in the output."""
    return f"{float(x):.4f}"


def hand_loss(scores):
    """The loss of the hand row as one position of a (1, 1, 4) batch."""
    logits = np.array(scores, dtype=np.float64).reshape(1, 1, -1)
    targets = np.array([[HAND_NEXT]], dtype=np.int64)
    loss, _ = rs.cross_entropy(logits, targets)
    return loss


def main():
    out = {}
    text = course.load_corpus()
    chars, stoi, itos = rs.build_vocab(text)
    ids = rs.encode(text, stoi)
    train_ids, val_ids = rs.split_data(ids)
    V = len(chars)

    def label(c):
        return {" ": "space", "\n": "newline"}.get(c, c)

    # ----------------------------------------------------- the hand row, by hand
    scores = np.array(HAND_SCORES)
    exps = np.exp(scores)
    probs = rs.softmax(scores)
    loss0 = hand_loss(HAND_SCORES)
    out["hand"] = {
        "chars": HAND_CHARS, "scores": HAND_SCORES,
        "scores_text": ", ".join(f"{x:.1f}" for x in HAND_SCORES), "exps": exps.tolist(),
        "sum": float(exps.sum()), "probs": probs.tolist(), "prob_sum": float(probs.sum()),
        "next": HAND_NEXT, "next_char": HAND_CHARS[HAND_NEXT],
        "prob_next": float(probs[HAND_NEXT]), "bits": loss0,
        "favourite": HAND_CHARS[int(np.argmax(probs))],
    }
    h = out["hand"]
    print(f"Four made-up scores {HAND_SCORES} for {HAND_CHARS} after h: e to each is "
          f"{[round(float(x), 3) for x in exps]}, total {exps.sum():.3f}, so the guess list is "
          f"{[round(float(p), 4) for p in probs]}, summing to {probs.sum():.4f}. The real next "
          f"character is {h['next_char']!r} at {h['prob_next']:.4f}, which is {loss0:.4f} bits.")

    # ------------------------------------------- the slope at each score, two ways
    onehot = np.zeros(len(scores))
    onehot[HAND_NEXT] = 1.0
    formula = (probs - onehot) / rs.LN2
    nudge = []
    for i in range(len(scores)):
        up = list(HAND_SCORES)
        up[i] += HAND_EPS
        down = list(HAND_SCORES)
        down[i] -= HAND_EPS
        lu, ld = hand_loss(up), hand_loss(down)
        nudge.append({
            "char": HAND_CHARS[i], "score": HAND_SCORES[i], "prob": float(probs[i]),
            "onehot": float(onehot[i]), "loss_up": lu, "loss_down": ld,
            "slope_nudged": (lu - ld) / (2 * HAND_EPS), "slope_formula": float(formula[i]),
            "diff_nats": float(probs[i] - onehot[i]),
        })
    out["nudge"] = {
        "eps": HAND_EPS, "rows": nudge, "ln2": rs.LN2, "one_over_ln2": 1.0 / rs.LN2,
        "max_gap": max(abs(r["slope_nudged"] - r["slope_formula"]) for r in nudge),
    }
    print(f"\nNudging each score by {HAND_EPS:g} up and down: the slopes are "
          f"{[round(r['slope_nudged'], 4) for r in nudge]}, and probability minus one-hot "
          f"over ln 2 predicts {[round(r['slope_formula'], 4) for r in nudge]}; the largest "
          f"gap is {out['nudge']['max_gap']:.1e}. Without the ln 2 the formula would be "
          f"{1 / rs.LN2:.4f} times too small.")

    # -------------------------------------------------------- one step downhill
    new_scores = scores - HAND_LR * formula
    new_probs = rs.softmax(new_scores)
    loss1 = hand_loss(new_scores.tolist())
    out["step"] = {
        "lr": HAND_LR, "moves": (-HAND_LR * formula).tolist(),
        "new_scores": new_scores.tolist(), "new_probs": new_probs.tolist(),
        "new_prob_next": float(new_probs[HAND_NEXT]), "new_bits": loss1,
        "bits_saved": loss0 - loss1,
    }
    print(f"\nOne step at learning rate {HAND_LR:g} moves the scores by "
          f"{[round(m, 4) for m in out['step']['moves']]} to "
          f"{[round(float(s), 4) for s in new_scores]}; {h['next_char']!r} rises to "
          f"{new_probs[HAND_NEXT]:.4f} and the step costs {loss1:.4f} bits, "
          f"{loss0 - loss1:.4f} fewer.")

    # ------------------------------------------------- the table before training
    rng = np.random.default_rng(SEED)
    params = rs.init_bigram(V)
    x0, y0 = rs.get_batch(train_ids, BLOCK_SIZE, BATCH_SIZE, np.random.default_rng(SEED))
    logits0, _ = rs.bigram_forward(params, x0)
    first_loss, _ = rs.cross_entropy(logits0, y0)
    uniform = float(np.log2(V))
    assert abs(first_loss - uniform) < 1e-9
    per_vote = LR / (BATCH_SIZE * BLOCK_SIZE * rs.LN2)
    out["init"] = {
        "vocab_size": V, "cells": V * V, "uniform_prob": 1.0 / V, "uniform_bits": uniform,
        "first_batch_bits": first_loss, "positions": BATCH_SIZE * BLOCK_SIZE,
        "batch_size": BATCH_SIZE, "block_size": BLOCK_SIZE, "lr": LR, "steps": STEPS,
        "seed": SEED, "push_per_vote": per_vote, "lr_text": f"{LR:.1f}",
    }
    print(f"\nA table of {V} x {V} zeros gives every character probability 1/{V} = "
          f"{1 / V:.4f}, so its first batch scores {first_loss:.4f} bits, the ceiling. A "
          f"batch holds {BATCH_SIZE} x {BLOCK_SIZE} = {BATCH_SIZE * BLOCK_SIZE} positions, "
          f"so at learning rate {LR:g} one position's vote moves its score by at most "
          f"{LR:g} / ({BATCH_SIZE * BLOCK_SIZE} x ln 2) = {per_vote:.4f}.")

    # ------------------------------------------------------------- training
    losses = rs.train_driver(
        params, train_ids,
        forward_fn=rs.bigram_forward, backward_fn=rs.bigram_backward,
        loss_fn=rs.cross_entropy, loss_backward_fn=rs.cross_entropy_backward,
        step_fn=rs.sgd_step, steps=STEPS, batch_size=BATCH_SIZE, block_size=BLOCK_SIZE,
        lr=LR, rng=rng,
    )
    learned_val = rs.eval_driver(params, val_ids, forward_fn=rs.bigram_forward,
                                 loss_fn=rs.cross_entropy, block_size=BLOCK_SIZE)
    learned_train = rs.eval_driver(params, train_ids, forward_fn=rs.bigram_forward,
                                   loss_fn=rs.cross_entropy, block_size=BLOCK_SIZE)
    counts = rs.count_pairs(train_ids, V)
    smoothed = rs.probs_from_tally(counts, ALPHA)
    with np.errstate(divide="ignore", invalid="ignore"):
        raw = rs.probs_from_tally(counts, 0.0)
    counted_val = rs.avg_surprise(smoothed, val_ids)
    counted_train_raw = rs.avg_surprise(raw, train_ids)
    counted_train_smoothed = rs.avg_surprise(smoothed, train_ids)
    curve = [{"step": s, "bits": losses[s - 1]} for s in LOG_STEPS]
    last = float(np.mean(losses[-50:]))
    out["training"] = {
        "curve": curve, "last50_bits": last, "every": 10,
        "losses_every_10": [round(losses[i], 4) for i in range(9, STEPS, 10)],
        "learned_val_bits": learned_val, "learned_train_bits": learned_train,
        "counted_val_bits": counted_val, "counted_train_raw_bits": counted_train_raw,
        "counted_train_smoothed_bits": counted_train_smoothed,
        "gap_val": learned_val - counted_val, "gap_train": learned_train - counted_train_raw,
        "learned_val_text": text4(learned_val), "counted_val_text": text4(counted_val),
    }
    reads = ", ".join(f"{c['bits']:.4f} at step {c['step']}" for c in curve)
    print(f"\nTrained for {STEPS} steps at learning rate {LR:g}, seed {SEED}: the batch loss "
          f"reads {reads}, and the last 50 steps average {last:.4f}.")
    print(f"  Scored on every step of the held-back tenth the learned table gets "
          f"{learned_val:.4f} bits against the counted tally's {counted_val:.4f}; on the "
          f"text it trained on it gets {learned_train:.4f}, and the counted table, "
          f"unsmoothed, {counted_train_raw:.4f}, which no table can beat there.")

    # ------------------------------------------- the learning rate, priced
    def run_at(lr):
        p_ = rs.init_bigram(V)
        l_ = rs.train_driver(
            p_, train_ids,
            forward_fn=rs.bigram_forward, backward_fn=rs.bigram_backward,
            loss_fn=rs.cross_entropy, loss_backward_fn=rs.cross_entropy_backward,
            step_fn=rs.sgd_step, steps=STEPS, batch_size=BATCH_SIZE, block_size=BLOCK_SIZE,
            lr=lr, rng=np.random.default_rng(SEED),
        )
        v_ = rs.eval_driver(p_, val_ids, forward_fn=rs.bigram_forward,
                            loss_fn=rs.cross_entropy, block_size=BLOCK_SIZE)
        return {"lr": lr, "last50_bits": float(np.mean(l_[-50:])), "val_bits": v_,
                "worst_after_100_bits": float(max(l_[100:]))}
    sweep = [run_at(lr) for lr in SWEEP_LRS]
    sweep.append({"lr": LR, "last50_bits": last, "val_bits": learned_val,
                  "worst_after_100_bits": float(max(losses[100:]))})
    sweep.sort(key=lambda r: r["lr"])
    out["sweep"] = sweep
    print("\nThe same run at other learning rates:")
    for r in sweep:
        print(f"  lr {r['lr']:5g}: last 50 steps {r['last50_bits']:.4f}, held-back "
              f"{r['val_bits']:.4f}, worst batch after step 100 {r['worst_after_100_bits']:.2f}")

    # ----------------------------------------------- the row for h, two ways
    def row_view(ch):
        r = stoi[ch]
        learned = rs.softmax(params["table"][r])
        order = np.argsort(-counts[r], kind="stable")
        entries = [{"char": chars[j], "count": int(counts[r, j]), "counted": float(raw[r, j]),
                    "learned": float(learned[j]), "score": float(params["table"][r, j])}
                   for j in order[:SHOWN]]
        return {
            "char": ch, "total": int(counts[r].sum()), "entries": entries,
            "rest_count": int(counts[r, order[SHOWN:]].sum()),
            "rest_counted": float(raw[r, order[SHOWN:]].sum()),
            "rest_learned": float(learned[order[SHOWN:]].sum()),
            "max_gap": float(np.max(np.abs(learned - raw[r]))),
            "zero_cells": int((counts[r] == 0).sum()),
            "learned_on_zero": float(learned[counts[r] == 0].sum()),
            "min_score": float(params["table"][r].min()),
        }
    out["row"] = row_view(ROW)
    out["rare_row"] = row_view(RARE)
    rw, rr = out["row"], out["rare_row"]
    e0 = rw["entries"][0]
    print(f"\nThe row for {ROW!r} ({rw['total']} counts): counting gave {e0['char']!r} "
          f"{e0['counted']:.4f} and training gave it {e0['learned']:.4f}; the largest gap "
          f"in the row is {rw['max_gap']:.4f}. The {rw['zero_cells']} cells the counting "
          f"never saw hold {rw['learned_on_zero']:.4f} of the learned row's probability.")
    r0 = rr["entries"][0]
    print(f"  The row for {RARE!r} ({rr['total']} counts): {r0['char']!r} counted "
          f"{r0['counted']:.4f}, learned {r0['learned']:.4f}; largest gap {rr['max_gap']:.4f}.")

    # -------------------------------------------------- where the gap lives
    # Rows ranked by how often they were read in the training text, in three
    # strata, with each table's bits on the held-back positions in that stratum.
    totals = counts.sum(axis=1)
    rank = np.argsort(-totals, kind="stable")
    stratum_of = np.zeros(V, dtype=np.int64)
    bounds = [(0, 10), (10, 30), (30, V)]
    for k, (a, b) in enumerate(bounds):
        stratum_of[rank[a:b]] = k
    cur, nxt = val_ids[:-1], val_ids[1:]
    with np.errstate(divide="ignore"):
        learned_all = rs.softmax(params["table"], axis=-1)
        bits_learned = -np.log2(learned_all[cur, nxt])
        bits_counted = -np.log2(smoothed[cur, nxt])
    strata = []
    for k, (a, b) in enumerate(bounds):
        mask = stratum_of[cur] == k
        strata.append({
            "rows": f"{a + 1} to {b}", "chars": "".join(chars[j] for j in rank[a:b]),
            "positions": int(mask.sum()), "share": float(mask.mean()),
            "counted_bits": float(bits_counted[mask].mean()),
            "learned_bits": float(bits_learned[mask].mean()),
            "min_row_total": int(totals[rank[b - 1]]), "max_row_total": int(totals[rank[a]]),
        })
    out["strata"] = strata
    print("\nBy how often the row was read while training:")
    for s in strata:
        print(f"  rows {s['rows']:>8} ({s['share'] * 100:.1f}% of held-back steps, row totals "
              f"{s['max_row_total']} down to {s['min_row_total']}): counted {s['counted_bits']:.4f} "
              f"bits, learned {s['learned_bits']:.4f}.")

    # ----------------------------------------- the pairs the counting never saw
    seen = counts[cur, nxt]
    unseen = seen == 0
    out["unseen"] = {
        "count": int(unseen.sum()), "of": int(len(cur)),
        "counted_bits": float(bits_counted[unseen].mean()),
        "learned_bits": float(bits_learned[unseen].mean()),
        "learned_max_bits": float(bits_learned[unseen].max()),
    }
    u = out["unseen"]
    print(f"\nOn the {u['count']} held-back pairs the counting never saw, the smoothed tally "
          f"pays {u['counted_bits']:.2f} bits a step and the learned table {u['learned_bits']:.2f}, "
          f"at worst {u['learned_max_bits']:.2f}, with no alpha anywhere in it.")

    # ------------------------------------------------------------- the ladder
    letter_counts = np.bincount(train_ids, minlength=V).astype(np.float64)
    letter_probs = (letter_counts + ALPHA) / (letter_counts.sum() + ALPHA * V)
    unigram = float(-np.log2(letter_probs[val_ids]).mean())
    out["ladder"] = {
        "uniform_bits": uniform, "unigram_bits": unigram, "bigram_val_bits": counted_val,
        "learned_val_bits": learned_val,
        "rungs": [
            {"id": "uniform", "label": f"guess evenly over {V}", "bits": uniform, "chapter": 3},
            {"id": "unigram", "label": "letter frequency alone", "bits": unigram, "chapter": 3},
            {"id": "bigram", "label": "the counted tally", "bits": counted_val, "chapter": 3},
            {"id": "learned", "label": "the learned tally", "bits": learned_val, "chapter": 4},
        ],
    }
    print(f"\nThe ladder: {uniform:.4f} evenly, {unigram:.4f} by letter frequency, "
          f"{counted_val:.4f} counted, {learned_val:.4f} learned. Four rungs.")

    # -------------------------- the embedding snippet: chapter 3's walk, by lookup
    # The first eight steps of the held-back text, read through the unsmoothed
    # counted table as an embedding lookup: the probabilities are chapter 3's
    # walk, and the backward pass with all-ones gradient counts the reads.
    WALK = 8
    xw = val_ids[:WALK][None, :]
    outw, cachew = rs.embedding_forward(raw, xw)
    walk_probs = [float(outw[0, t, val_ids[t + 1]]) for t in range(WALK)]
    reads = rs.embedding_backward(np.ones_like(outw), cachew)[:, 0]
    read_order = []
    for i in val_ids[:WALK]:
        if int(i) not in read_order:
            read_order.append(int(i))
    walk_reads_text = ", ".join(f"{label(chars[i])} x{int(reads[i])}" for i in read_order)
    walk_probs_text = ", ".join(text4(q) for q in walk_probs)
    out["walk"] = {
        "steps": WALK, "text": "".join(chars[i] for i in val_ids[:WALK + 1]),
        "probs": walk_probs, "probs_text": walk_probs_text,
        "reads": [{"char": chars[i], "times": int(reads[i])} for i in read_order],
        "reads_text": walk_reads_text,
    }
    print(f"\nRead through the table as a lookup, the first {WALK} steps of the held-back "
          f"text get the probabilities {walk_probs_text}, chapter 3's walk; the rows read "
          f"were {walk_reads_text}.")

    # ------------------------------- the gradient check on a real batch of scores
    rng_t = np.random.default_rng(SEED)
    table_t = rng_t.normal(size=(V, V))
    xg, yg = rs.get_batch(train_ids, 4, 2, np.random.default_rng(SEED))

    def loss_of(table):
        return rs.cross_entropy(rs.embedding_forward(table, xg)[0], yg)[0]

    logits_g, cache_e = rs.embedding_forward(table_t, xg)
    _, cache_c = rs.cross_entropy(logits_g, yg)
    claimed = rs.embedding_backward(rs.cross_entropy_backward(cache_c), cache_e)
    err_right = rs.grad_check(loss_of, table_t, claimed)
    err_nats = rs.grad_check(loss_of, table_t, claimed * rs.LN2)
    assert err_right < 1e-6
    out["gradcheck"] = {
        "batch_size": 2, "block_size": 4, "seed": SEED,
        "err_right": err_right, "err_without_ln2": err_nats,
        "err_without_ln2_text": f"{err_nats:.4f}",
        "expected_without_ln2": (1 / rs.LN2 - 1) / (1 / rs.LN2 + 1),
    }
    print(f"\nOn a batch of 2 x 4 positions with a random table, the formula's gradient "
          f"passes the nudge check (relative error {err_right:.1e}); the same gradient "
          f"without its ln 2 fails it at {err_nats:.4f}.")

    # ------------------------------- both tables whole, for the side-by-side figure
    # Probabilities to four decimals: the figure paints a cell's shade, and a
    # hover reads the value, so four decimals is all it can show. The row
    # figures above keep full precision for the numbers the prose quotes.
    learned_table = rs.softmax(params["table"], axis=-1)
    out["tables"] = {
        "chars": chars,
        "counted": np.round(raw, 4).tolist(),
        "learned": np.round(learned_table, 4).tolist(),
    }

    # ---------------------------------------------- the receipt the snippet prints
    out["receipt"] = {
        "hand_bits_text": text4(loss0),
        "hand_grad_text": ", ".join(text4(g) for g in formula),
        "walk_probs_text": walk_probs_text,
        "walk_reads_text": walk_reads_text,
        "gradcheck_pass_text": "the formula passes",
        "gradcheck_without_ln2_text": f"{err_nats:.4f}",
        "first_batch_text": text4(first_loss),
        "learned_val_text": text4(learned_val),
        "counted_val_text": text4(counted_val),
        "last50_text": text4(last),
        "steps": STEPS, "lr": LR, "seed": SEED,
        "batch_size": BATCH_SIZE, "block_size": BLOCK_SIZE,
    }
    return json.dumps(out)
