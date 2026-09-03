# Tests for the surprise scorer. Every fixture is a literal small enough to
# check by hand, and the probabilities in them are powers of two, so the
# surprises come out as whole bits. Failure messages are teaching content
# (CLAUDE.md).

import numpy as np
from submission import probs_from_tally, surprise_bits, avg_surprise

# A three-character tally. Row 0 saw two 0s follow and nothing else; row 1 saw
# one of each of 0 and 1; row 2 saw nothing at all.
COUNTS = np.array([[2.0, 0.0, 0.0],
                   [1.0, 1.0, 0.0],
                   [0.0, 0.0, 0.0]])

# A table whose entries are powers of two, so every surprise is a whole
# number of bits. Row a, column b is the probability of b after a.
POW2 = np.array([[0.5, 0.25, 0.25],
                 [0.125, 0.75, 0.125],
                 [1.0, 0.0, 0.0]])


def test_probs_shape_and_rows():
    """probs_from_tally: a table the same shape as the tally, every row summing to 1"""
    got = probs_from_tally(COUNTS, 1.0)
    assert isinstance(got, np.ndarray), (
        f"probs_from_tally must return a NumPy array, and yours returned a "
        f"{type(got).__name__}. Add alpha to the counts array and divide it by "
        "its row sums; both are array operations, so the result is one too."
    )
    assert got.shape == (3, 3), (
        f"the probabilities have the tally's shape, (3, 3) here, got {got.shape}. "
        "Row a is still 'what follows a', just as a probability instead of a count."
    )
    assert got.dtype == np.float64, (
        f"the table must hold float64, got {got.dtype}. Dividing float64 counts "
        "gives float64; if yours is something else, check what you divided."
    )
    sums = got.sum(axis=1)
    assert np.allclose(sums, 1.0, atol=1e-12), (
        f"every row must sum to 1, and yours sum to {np.round(sums, 4).tolist()}. "
        "Divide each row by ITS OWN total, sum(axis=1, keepdims=True), not by the "
        "whole table's total and not by the column sums."
    )


def test_probs_exact_values():
    """probs_from_tally: add 1 to every cell, then divide each row by its total"""
    got = probs_from_tally(COUNTS, 1.0)
    want = np.array([[3 / 5, 1 / 5, 1 / 5],
                     [2 / 5, 2 / 5, 1 / 5],
                     [1 / 3, 1 / 3, 1 / 3]])
    assert np.allclose(got, want, atol=1e-12), (
        f"with alpha 1, row 0's counts (2, 0, 0) become (3, 1, 1), total 5, so the "
        f"row is (0.6, 0.2, 0.2); row 2 saw nothing and becomes (1/3, 1/3, 1/3). "
        f"Expected {np.round(want, 4).tolist()}, got {np.round(got, 4).tolist()}. "
        "Alpha goes on every cell BEFORE the row total is taken, so the total "
        "grows by alpha times the vocabulary size."
    )


def test_probs_alpha_zero_is_plain_division():
    """probs_from_tally: alpha 0 leaves the counts as they are"""
    got = probs_from_tally(COUNTS[:2], 0.0)
    want = np.array([[1.0, 0.0, 0.0],
                     [0.5, 0.5, 0.0]])
    assert np.allclose(got, want, atol=1e-12), (
        f"with alpha 0 nothing is added: row 0 is (1, 0, 0) and row 1 is "
        f"(0.5, 0.5, 0). Got {np.round(got, 4).tolist()}. If yours added 1 anyway, "
        "alpha is being ignored; it has to be the argument, not a constant."
    )


def test_surprise_is_whole_bits_on_powers_of_two():
    """surprise_bits: one number per step, minus log2 of the probability given to what came next"""
    ids = np.array([0, 0, 1, 1, 2, 0], dtype=np.int64)
    got = surprise_bits(POW2, ids)
    assert isinstance(got, np.ndarray), (
        f"surprise_bits must return a NumPy array, one entry per step, and yours "
        f"returned a {type(got).__name__}. Index the table once with two arrays, "
        "probs[ids[:-1], ids[1:]], and take -np.log2 of the result."
    )
    assert got.shape == (5,), (
        f"six ids make five steps, so the result is (5,), got {got.shape}. Each "
        "step is a character and the character after it, which is why there is "
        "one fewer step than characters."
    )
    want = np.array([1.0, 2.0, 0.415037499278844, 3.0, 0.0])
    assert np.allclose(got, want, atol=1e-9), (
        f"expected {np.round(want, 4).tolist()}, got {np.round(got, 4).tolist()}. "
        "Step 0 is 0 then 0: the table gives that 0.5, and -log2(0.5) is 1 bit. "
        "Step 1 is 0 then 1 at 0.25, 2 bits. Step 4 is 2 then 0 at probability 1, "
        "0 bits: a probability of 1 is (1/2) to the power 0."
    )


def test_surprise_reads_row_then_column():
    """surprise_bits: the row is the character before, the column the character after"""
    ids = np.array([1, 0], dtype=np.int64)
    got = surprise_bits(POW2, ids)
    assert np.allclose(got, [3.0], atol=1e-9), (
        f"1 then 0 looks up probs[1, 0], which is 0.125, so 3 bits; got "
        f"{np.round(got, 4).tolist()}. If you got 2 bits you read probs[0, 1]: "
        "the character just written picks the ROW, and the character that came "
        "next picks the column, the same way the tally was built."
    )


def test_surprise_of_the_unseen_is_infinite():
    """surprise_bits: a probability of 0 is infinite surprise, not an error"""
    ids = np.array([2, 1], dtype=np.int64)
    with np.errstate(divide="ignore"):
        got = surprise_bits(POW2, ids)
    assert got.shape == (1,) and np.isinf(got[0]) and got[0] > 0, (
        f"probs[2, 1] is 0, and -log2(0) is +inf: a pair the table gave no "
        f"probability to is infinite surprise. Got {got}. Do not clip or "
        "replace the zero; the chapter's point is that this is what happens, and "
        "smoothing in probs_from_tally is what prevents it."
    )


def test_average_is_the_mean_of_the_steps():
    """avg_surprise: the mean of surprise_bits, as one float"""
    ids = np.array([0, 0, 1, 1, 2, 0], dtype=np.int64)
    got = avg_surprise(POW2, ids)
    assert isinstance(got, float), (
        f"avg_surprise returns one plain float, and yours returned a "
        f"{type(got).__name__}. Wrap the mean in float(...) so the number can be "
        "printed and compared like any other."
    )
    want = (1.0 + 2.0 + 0.415037499278844 + 3.0 + 0.0) / 5
    assert abs(got - want) < 1e-9, (
        f"the five steps are 1, 2, 0.415, 3 and 0 bits, so the average is "
        f"{want:.4f}; got {got:.4f}. It is a mean over steps, so divide by the "
        "number of steps (five), not the number of characters (six)."
    )
