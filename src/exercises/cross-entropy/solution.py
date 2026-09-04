# Reference solution.


def cross_entropy(logits, targets):
    """Mean surprise in bits over every position, and the cache for backward."""
    probs = softmax(logits)
    B, T, V = logits.shape
    bi = np.arange(B)[:, None]
    ti = np.arange(T)[None, :]
    picked = probs[bi, ti, targets]
    loss_bits = float(-np.log2(picked).mean())
    return loss_bits, (probs, targets)


def cross_entropy_backward(cache):
    """The gradient of the loss with respect to every score, (B, T, V)."""
    probs, targets = cache
    B, T, V = probs.shape
    onehot = np.zeros_like(probs)
    bi = np.arange(B)[:, None]
    ti = np.arange(T)[None, :]
    onehot[bi, ti, targets] = 1.0
    return (probs - onehot) / (B * T * np.log(2.0))
