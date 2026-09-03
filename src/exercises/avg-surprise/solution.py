# Scoring a guesser: how surprised it was, on average, by what actually came
# next. Reference solution.


def probs_from_tally(counts, alpha=1.0):
    """The tally's rows as probabilities, alpha added to every cell first."""
    smoothed = counts + alpha
    return smoothed / smoothed.sum(axis=1, keepdims=True)


def surprise_bits(probs, ids):
    """Minus log2 of the probability given to each next character, per position."""
    p = probs[ids[:-1], ids[1:]]
    with np.errstate(divide="ignore"):
        return -np.log2(p)


def avg_surprise(probs, ids):
    """Average surprise per character, in bits: the loss."""
    return float(surprise_bits(probs, ids).mean())
