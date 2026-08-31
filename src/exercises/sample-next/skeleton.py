# Drawing the next character, in proportion to a row of the tally.
#
# Everything this function needs is handed to it: the tally, which character
# was just written, and the generator to draw with. It fetches nothing.
#
# Contract:
# - sample_next(counts, current, rng):
#     counts   a tally like the one your count_pairs returns, so row a,
#              column b holds how often b followed a.
#     current  the id of the character just written, which picks the row. An
#              id is a character's place in the sorted vocabulary: for this
#              chapter's line a space is 0, a comma is 1, and b is 2.
#     rng      a NumPy random generator, np.random.default_rng(...), made by
#              the caller and passed in.
#
#   Return the id of the next character, as a plain int, drawn in proportion
#   to row `current`: a successor counted 30 times must come up ten times as
#   often as one counted 3 times, and one counted 0 times must never come up
#   at all.
#
#   The row holds counts, and a draw needs shares, so divide the row by its
#   own total. rng.choice(len(row), p=shares) draws one index for you, and it
#   requires the shares to sum to 1.
#
#   One hole to plug. A character the text never continued has a row of all
#   zeros, and dividing that row by its total divides by zero, which gives
#   nan and makes rng.choice raise. When the row's total is 0, fall back to an
#   even choice over the whole vocabulary: rng.integers(0, len(row)).
#
#   Return int(...), not the NumPy integer that comes back from the draw: the
#   id is about to be used as a dict key and a list element by code that
#   expects a plain Python int.
#
# Never call np.random.seed or make your own generator inside this function.
# The caller owns the randomness and passes it in, which is what makes a run
# repeatable (and what lets the tests check that it is).


def sample_next(counts, current, rng):
    """Draw the next character's id in proportion to its row of the tally.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement sample_next")
