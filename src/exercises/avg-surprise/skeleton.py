# Scoring a guesser: how surprised it was, on average, by what actually came
# next.
#
# Three small functions. The first turns the tally's counts into
# probabilities. The other two read a stream of ids and ask, at every
# position, how much probability the table gave the character that really
# followed, and charge for it in bits.
#
# Contract:
# - probs_from_tally(counts, alpha=1.0):
#     counts  the tally, a (vocab_size, vocab_size) float64 array of counts,
#             as count_pairs returned it: row = the character just written,
#             column = the character that followed.
#     alpha   added to EVERY cell before dividing, so a pair the counting
#             never saw gets a small probability instead of none. 1.0 is the
#             chapter's choice; 0.0 means no smoothing.
#   Returns a (vocab_size, vocab_size) float64 array in which every row sums
#   to 1: row a, column b is the probability of b coming next after a.
#
# - surprise_bits(probs, ids):
#     probs   the table probs_from_tally returned.
#     ids     one int64 stream of ids, the text being scored.
#   Returns a float64 array of shape (len(ids) - 1,): for each position, minus
#   log2 of the probability the table gave the character that actually came
#   next, probs[ids[i], ids[i + 1]]. A probability of 0 is infinite surprise,
#   and NumPy will say so (np.log2(0) is -inf); do not special-case it.
#
# - avg_surprise(probs, ids):
#   Returns one float: the mean of surprise_bits(probs, ids). This is the
#   loss, in bits per character, and the ladder's rung for whatever probs is.
#
# Nothing here reads the corpus or builds a tally: both are handed in.


def probs_from_tally(counts, alpha=1.0):
    """The tally's rows as probabilities, alpha added to every cell first.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement probs_from_tally")


def surprise_bits(probs, ids):
    """Minus log2 of the probability given to each next character, per position.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement surprise_bits")


def avg_surprise(probs, ids):
    """Average surprise per character, in bits: the loss.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement avg_surprise")
