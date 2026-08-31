# Reference solution.


def softmax(scores):
    """Turn each row of scores (last axis) into probabilities that sum to 1."""
    m = scores.max(axis=-1, keepdims=True)
    e = np.exp(scores - m)
    return e / e.sum(axis=-1, keepdims=True)
