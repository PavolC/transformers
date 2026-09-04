# Tests for the embedding table's forward and backward. The table is three
# rows of two numbers, so every lookup and every sum can be checked by eye.
# Failure messages are teaching content (CLAUDE.md).

import numpy as np
from submission import embedding_forward, embedding_backward

TABLE = np.array([[1.0, 10.0],
                  [2.0, 20.0],
                  [3.0, 30.0]])
# Two windows of two positions. Row 2 is read three times, row 1 never.
IDS = np.array([[0, 2],
                [2, 2]])
OUT = np.array([[[1.0, 10.0], [3.0, 30.0]],
                [[3.0, 30.0], [3.0, 30.0]]])
D_OUT = np.array([[[1.0, 1.0], [0.5, 0.5]],
                  [[0.25, 0.25], [2.0, 2.0]]])
D_TABLE = np.array([[1.0, 1.0],
                    [0.0, 0.0],
                    [2.75, 2.75]])


def test_forward_returns_pair():
    """embedding_forward: returns (out, cache)"""
    got = embedding_forward(TABLE, IDS)
    assert isinstance(got, tuple) and len(got) == 2, (
        f"embedding_forward must return a pair (out, cache), got {type(got).__name__}. "
        "Every module in this course is a forward that hands back a cache and a "
        "backward that takes it."
    )
    out, _ = got
    assert isinstance(out, np.ndarray), (
        f"out must be a NumPy array, got {type(out).__name__}. table[ids] with a "
        "(B, T) array of ids is already the whole answer."
    )


def test_forward_rows():
    """embedding_forward: out[b, t] is the row for ids[b, t]"""
    out, _ = embedding_forward(TABLE, IDS)
    assert out.shape == (2, 2, 2), (
        f"(V, C) = (3, 2) table read at (B, T) = (2, 2) ids gives (B, T, C) = (2, 2, 2), "
        f"got {out.shape}. Indexing the table with the ids array does this in one step; "
        "a loop that builds a list needs np.stack at the end."
    )
    assert np.array_equal(out, OUT), (
        f"expected {OUT.tolist()}, got {out.tolist()}. Position (0, 0) holds id 0, so "
        "it gets row 0, [1, 10]; every other position holds id 2 and gets row 2, "
        "[3, 30]. If your rows are transposed or picked by column, you indexed the "
        "wrong axis: rows are characters."
    )


def test_forward_any_table():
    """embedding_forward: works for a wider table and longer windows"""
    rng = np.random.default_rng(4)
    table = rng.normal(size=(5, 3))
    ids = rng.integers(0, 5, size=(3, 4))
    out, _ = embedding_forward(table, ids)
    assert out.shape == (3, 4, 3) and np.array_equal(out, table[ids]), (
        f"for a (5, 3) table and (3, 4) ids, out must be (3, 4, 3) with out[b, t] equal to "
        f"table[ids[b, t]] everywhere; got shape {out.shape}."
    )


def test_backward_shape():
    """embedding_backward: one slope per entry of the table"""
    _, cache = embedding_forward(TABLE, IDS)
    got = embedding_backward(D_OUT, cache)
    assert isinstance(got, np.ndarray), (
        f"embedding_backward must return a NumPy array, got {type(got).__name__}."
    )
    assert got.shape == TABLE.shape, (
        f"the table's gradient has the table's shape {TABLE.shape}, got {got.shape}. "
        "Start from np.zeros of the table's shape (keep it in the cache) and add into it."
    )


def test_backward_accumulates():
    """embedding_backward: a row read three times collects all three gradients"""
    _, cache = embedding_forward(TABLE, IDS)
    got = embedding_backward(D_OUT, cache)
    if np.allclose(got[2], [2.0, 2.0]) or np.allclose(got[2], [0.5, 0.5]) or np.allclose(got[2], [0.25, 0.25]):
        raise AssertionError(
            f"row 2 got {got[2].tolist()}, one position's gradient, but it was read at "
            "three positions and must collect all three: 0.5 + 0.25 + 2 = 2.75. Plain "
            "d_table[ids] = d_out writes each repeated row once and keeps the last; "
            "np.add.at(d_table, ids.reshape(-1), d_out.reshape(-1, C)) adds every one, "
            "the same way chapter 1's tally counted a pair that occurred twice."
        )
    assert np.allclose(got, D_TABLE), (
        f"expected {D_TABLE.tolist()}, got {got.tolist()}. Row 0 was read once and gets "
        "[1, 1]; row 1 was never read and gets zeros; row 2 was read three times and "
        "gets the sum 2.75."
    )
