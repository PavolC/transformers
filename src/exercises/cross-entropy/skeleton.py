# The loss, and its slope: chapter 3's score written for a model that gives
# scores, plus the gradient that says which way every score should move.
#
# Contract:
# - cross_entropy(logits, targets):
#     logits   a (B, T, V) float64 array: at every position of every window,
#              one row of V scores, one per character in the vocabulary. The
#              model made these; softmax turns each row into probabilities.
#     targets  a (B, T) int64 array: the id of the character that actually
#              came next at every position (chapter 2's y).
#   Returns a pair (loss_bits, cache). loss_bits is one plain float: at every
#   position, minus log2 of the probability the row gave the real next
#   character, averaged over all B * T positions. cache is whatever your
#   backward needs (the probabilities and the targets); the tests only ever
#   hand it back to cross_entropy_backward.
#
# - cross_entropy_backward(cache):
#   Returns a (B, T, V) float64 array, the slope of loss_bits with respect to
#   every score: the probabilities minus the one-hot of the target (a row of
#   zeros with a 1 at the real next character), divided by B * T (the mean)
#   and by ln 2 (bits, not nats). np.log(2.0) is ln 2.


def cross_entropy(logits, targets):
    """Mean surprise in bits over every position, and the cache for backward.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement cross_entropy")


def cross_entropy_backward(cache):
    """The gradient of the loss with respect to every score, (B, T, V).

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement cross_entropy_backward")
