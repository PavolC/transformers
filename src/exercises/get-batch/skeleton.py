# A batch of windows, with the targets that go with them.
#
# The training loop asks for a batch, gets two arrays back, and never sees the
# text. This is the function that turns one long stream of ids into that pair
# of arrays. It fetches nothing and it holds no state: the stream and the
# generator are both handed to it.
#
# Contract:
# - get_batch(ids, block_size, batch_size, rng):
#     ids         one long int64 array of ids, the whole training stream, as
#                 encode returned it. Must be longer than block_size + 1.
#     block_size  how many characters are in one window. Called T for short,
#                 and it is the number of characters the model is ever
#                 allowed to look at.
#     batch_size  how many windows to draw. Called B for short.
#     rng         a NumPy generator, np.random.default_rng(...), made by the
#                 caller and passed in.
#
#   Return (x, y), both int64 arrays of shape (batch_size, block_size):
#     x[b]  a window: block_size characters in a row, starting somewhere in
#           the stream.
#     y[b]  the same window shifted one character left, so y[b, t] is the
#           character that actually followed x[b, t] in the text.
#
#   Axis law, the same one every array in this course obeys: batch first,
#   time second. Row b is one window, column t is one position in time, and
#   time reads left to right.
#
#   Draw the starts in ONE call, exactly this one:
#
#       starts = rng.integers(0, len(ids) - block_size - 1, size=batch_size)
#
#   Two things about that line. The top end is where it is because y needs
#   one character past the end of the window, and rng.integers never returns
#   its top end, so this bound leaves the stream's last character out of the
#   targets: one character in a million here, and the bound stays a number
#   you can check by hand. And the whole batch comes from one call because a
#   generator hands out its numbers in the order it is asked: a loop that
#   draws one start at a time is just as random and gives different windows
#   from the same seed, so the chapter's own batch would stop reproducing.
#
# Nothing in here may call np.random.seed or build its own generator.


def get_batch(ids, block_size, batch_size, rng):
    """Draw batch_size windows of block_size ids, with their shifted targets.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement get_batch")
