# Tests for the loss and its gradient. Every fixture is a literal small enough
# to check by hand: the four hand scores from the chapter, and a (2, 2, 3)
# batch whose rows are the softmax tests' rows. Failure messages are teaching
# content (CLAUDE.md).

import numpy as np
from submission import cross_entropy, cross_entropy_backward

LN2 = float(np.log(2.0))

# The chapter's hand row: four scores, and the real next character is the
# fourth (id 3). One position, so B = T = 1.
HAND = np.array([[[2.0, 0.0, -2.0, 1.0]]])
HAND_T = np.array([[3]])
HAND_BITS = 2.0482181651
HAND_GRAD = np.array([[[0.9481868227, 0.1283231322, 0.0173666474, -1.0938766024]]])

# Two windows of two positions over a three-character vocabulary.
BATCH = np.array([[[1.0, 2.0, 3.0], [0.0, 0.0, 0.0]],
                  [[-1.0, 1.0, 0.0], [5.0, 5.0, 5.0]]])
BATCH_T = np.array([[2, 0], [1, 2]])
BATCH_BITS = 1.0865068021
BATCH_GRAD = np.array([[[0.0324716654, 0.0882671379, -0.1207388032],
                        [-0.2404491735, 0.1202245867, 0.1202245867]],
                       [[0.0324716654, -0.1207388032, 0.0882671379],
                        [0.1202245867, 0.1202245867, -0.2404491735]]])


def test_returns_loss_and_cache():
    """cross_entropy: returns a pair, a plain float and a cache"""
    got = cross_entropy(HAND, HAND_T)
    assert isinstance(got, tuple) and len(got) == 2, (
        f"cross_entropy must return a pair (loss_bits, cache), and yours returned "
        f"{type(got).__name__}. The cache is whatever cross_entropy_backward needs; "
        "return the loss and the cache together, as `return loss_bits, cache`."
    )
    loss, _ = got
    assert isinstance(loss, float), (
        f"loss_bits must be a plain Python float, got {type(loss).__name__}. Wrap the "
        "mean in float(...): the ladder, the panels and the tests all treat the loss "
        "as one number, not an array."
    )


def test_hand_row():
    """cross_entropy: the chapter's hand row costs 2.0482 bits"""
    loss, _ = cross_entropy(HAND, HAND_T)
    assert abs(loss - HAND_BITS) < 1e-8, (
        f"scores [2, 0, -2, 1] with the fourth character real should cost {HAND_BITS} "
        f"bits, got {loss:.10f}. softmax gives the fourth character 0.2418, and minus "
        "log2 of 0.2418 is 2.0482. If you got 1.4197, that is the natural log: the "
        "loss is in bits, so use np.log2. If you got a different number, check that "
        "you picked the probability at the TARGET's id, not the largest one."
    )


def test_batch_mean():
    """cross_entropy: a batch's loss is the mean over every position"""
    loss, _ = cross_entropy(BATCH, BATCH_T)
    assert abs(loss - BATCH_BITS) < 1e-8, (
        f"the (2, 2, 3) batch should cost {BATCH_BITS} bits, got {loss:.10f}. Its four "
        "positions cost 0.5881, 1.5850, 0.5881 and 1.5850 bits, and the loss is their "
        "mean. If you got 4.3460 you summed instead of averaging; if you got 2.1730 "
        "you averaged over windows but not positions. probs[bi, ti, targets] with "
        "bi = np.arange(B)[:, None] and ti = np.arange(T)[None, :] picks one "
        "probability per position at once."
    )


def test_certain_costs_nothing():
    """cross_entropy: a row certain of the right answer costs 0 bits"""
    loss, _ = cross_entropy(np.array([[[100.0, 0.0, 0.0]]]), np.array([[0]]))
    assert abs(loss) < 1e-9, (
        f"a row that puts a score of 100 on the real next character gives it "
        f"probability 1 to every decimal float64 has, so the step costs 0 bits; got "
        f"{loss}. If yours is nan or inf, your softmax overflowed: it must subtract "
        "the row's maximum first."
    )


def test_gradient_hand_row():
    """cross_entropy_backward: probabilities minus one-hot, over ln 2"""
    _, cache = cross_entropy(HAND, HAND_T)
    got = cross_entropy_backward(cache)
    assert isinstance(got, np.ndarray), (
        f"cross_entropy_backward must return a NumPy array, got {type(got).__name__}."
    )
    assert got.shape == HAND.shape, (
        f"the gradient has one slope per score, so its shape is the logits' shape "
        f"{HAND.shape}; got {got.shape}."
    )
    if np.allclose(got, HAND_GRAD * LN2, atol=1e-8):
        raise AssertionError(
            f"your gradient is {np.round(got.ravel(), 4)}, which is probabilities minus "
            "one-hot with no ln 2: that is the slope of the loss in nats, and it is "
            "1.4427 times too small for a loss in bits. Divide by np.log(2.0) as well "
            "as by B * T."
        )
    assert np.allclose(got, HAND_GRAD, atol=1e-8), (
        f"for the hand row the gradient should be {np.round(HAND_GRAD.ravel(), 4)}, got "
        f"{np.round(got.ravel(), 4)}. Each entry is (probability minus one-hot) over "
        "ln 2: the three wrong characters get their probability over 0.6931 pushed "
        "up, and the real one, o at 0.2418, gets (0.2418 - 1) / 0.6931 = -1.0939."
    )


def test_gradient_batch():
    """cross_entropy_backward: the mean divides every slope by B times T"""
    _, cache = cross_entropy(BATCH, BATCH_T)
    got = cross_entropy_backward(cache)
    assert got.shape == BATCH.shape, (
        f"the gradient's shape is the logits' shape {BATCH.shape}; got {got.shape}."
    )
    if np.allclose(got, BATCH_GRAD * 4, atol=1e-8):
        raise AssertionError(
            "your gradient is 4 times too large: the loss is a MEAN over the B * T = 4 "
            "positions, so every slope is divided by 4 as well as by ln 2."
        )
    assert np.allclose(got, BATCH_GRAD, atol=1e-8), (
        f"expected {np.round(BATCH_GRAD, 4).tolist()}, got {np.round(got, 4).tolist()}. "
        "Every row must sum to 0 (the probabilities sum to 1 and the one-hot sums to "
        "1), and the real next character is the only negative entry in its row."
    )
    assert np.allclose(got.sum(axis=-1), 0.0, atol=1e-12), (
        f"every row of the gradient must sum to 0, and yours sum to "
        f"{np.round(got.sum(axis=-1), 6).tolist()}. Pushing one score up pushes the "
        "others' shares down by exactly as much."
    )


def test_gradient_matches_nudging():
    """cross_entropy_backward: agrees with nudging each score by hand"""
    _, cache = cross_entropy(BATCH, BATCH_T)
    got = cross_entropy_backward(cache)
    eps = 1e-5
    for b, t, v in ((0, 0, 2), (1, 1, 0), (0, 1, 1)):
        up = BATCH.copy()
        up[b, t, v] += eps
        down = BATCH.copy()
        down[b, t, v] -= eps
        slope = (cross_entropy(up, BATCH_T)[0] - cross_entropy(down, BATCH_T)[0]) / (2 * eps)
        assert abs(slope - got[b, t, v]) < 1e-6, (
            f"nudging the score at position ({b}, {t}) for character {v} up and down by "
            f"{eps} gives a slope of {slope:.6f}, but your gradient says {got[b, t, v]:.6f}. "
            "The gradient is the slope the nudge measures; when the two disagree, the "
            "formula is wrong and the nudge is right."
        )
