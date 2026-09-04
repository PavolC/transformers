# The learned tally: chapter 1's table, found by training instead of counting.
# Four small functions, and the course's train_driver runs them as a loop.
#
# Contract:
# - init_bigram(vocab_size):
#   Returns the model's parameters as a dict with one entry, "table": a
#   (vocab_size, vocab_size) float64 array of zeros. Every row of zeros is an
#   even guess, so the untrained table sits on the ladder's ceiling rung.
#
# - bigram_forward(params, x):
#     params  the dict init_bigram returned (and training keeps updating).
#     x       a (B, T) int64 array of ids, chapter 2's windows.
#   Returns (logits, cache): logits is (B, T, V), the row of the table for
#   the character at every position, which is embedding_forward's job; cache
#   is what embedding_forward handed back.
#
# - bigram_backward(d_logits, cache, params):
#     d_logits  a (B, T, V) float64 array, the slope of the loss with respect
#               to every score (cross_entropy_backward's output).
#   Returns a dict of gradients mirroring params key for key: {"table": the
#   (V, V) array embedding_backward produces}.
#
# - sgd_step(params, grads, lr):
#   Moves every parameter against its gradient: for each name in params,
#   params[name] becomes params[name] - lr * grads[name]. Changes the dict in
#   place and returns it.


def init_bigram(vocab_size):
    """A (vocab_size, vocab_size) table of zeros, in a dict under "table".

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement init_bigram")


def bigram_forward(params, x):
    """(B, T) ids to (B, T, V) scores: the table's row for each id, plus a cache.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement bigram_forward")


def bigram_backward(d_logits, cache, params):
    """Gradients mirroring params: {"table": (V, V)}.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement bigram_backward")


def sgd_step(params, grads, lr):
    """Every parameter moves against its gradient by lr times the gradient.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement sgd_step")
