# Reference solution.


def init_bigram(vocab_size):
    """A (vocab_size, vocab_size) table of zeros, in a dict under "table"."""
    return {"table": np.zeros((vocab_size, vocab_size))}


def bigram_forward(params, x):
    """(B, T) ids to (B, T, V) scores: the table's row for each id, plus a cache."""
    return embedding_forward(params["table"], x)


def bigram_backward(d_logits, cache, params):
    """Gradients mirroring params: {"table": (V, V)}."""
    return {"table": embedding_backward(d_logits, cache)}


def sgd_step(params, grads, lr):
    """Every parameter moves against its gradient by lr times the gradient."""
    for name in params:
        params[name] = params[name] - lr * grads[name]
    return params
