# Tests for the count_pairs exercise. Fixture values are hardcoded literals,
# checked by hand against the line they come from. Failure messages are
# teaching content (CLAUDE.md).

import numpy as np
from submission import count_pairs

# "to be, or not to be" over its own 8-character vocabulary, which is
# sorted(set(line)): [' ', ',', 'b', 'e', 'n', 'o', 'r', 't'].
LINE_VOCAB = [" ", ",", "b", "e", "n", "o", "r", "t"]
LINE_IDS = np.array([7, 5, 0, 2, 3, 1, 0, 5, 6, 0, 4, 5, 7, 0, 7, 5, 0, 2, 3],
                    dtype=np.int64)


def test_shape_and_type():
    """count_pairs: a square table of floats, one row and column per character"""
    got = count_pairs(np.array([0, 1, 0], dtype=np.int64), 3)
    assert isinstance(got, np.ndarray), (
        f"count_pairs must return a NumPy array, got {type(got).__name__}. "
        "Start from np.zeros((vocab_size, vocab_size)) and fill it in; a dict "
        "of dicts cannot be indexed by a pair of ids the way later chapters "
        "will index this table."
    )
    assert got.shape == (3, 3), (
        f"with vocab_size 3 the table must be (3, 3), got {got.shape}. It has "
        "one row per character that could come first and one column per "
        "character that could come next, whether or not the text uses them."
    )
    assert got.dtype == np.float64, (
        f"the table must hold float64, got {got.dtype}. np.zeros gives float64 "
        "unless told otherwise; integer counts would turn every later "
        "division into integer division and silently floor the answer."
    )


def test_counts_a_tiny_stream():
    """count_pairs: every pair in a six-character stream"""
    got = count_pairs(np.array([0, 1, 2, 1, 0, 1], dtype=np.int64), 3)
    want = np.array([[0.0, 2.0, 0.0],
                     [1.0, 0.0, 1.0],
                     [0.0, 1.0, 0.0]])
    assert np.array_equal(got, want), (
        f"expected\n{want}\ngot\n{got}\n"
        "The five pairs are (0,1), (1,2), (2,1), (1,0), (0,1). Entry [0, 1] is "
        "2 because 1 follows 0 twice; [1, 0] is 1 and [0, 1] is 2, so the "
        "table is not symmetric. If yours is symmetric you are counting each "
        "pair in both directions."
    )
    assert got.sum() == 5.0, (
        f"six ids hold five pairs, so the table's entries must add up to 5; "
        f"yours add up to {got.sum()}. If you got 6, you are pairing the last "
        "id with something (there is nothing after it); if you got 4, you are "
        "skipping either the first pair or the last."
    )


def test_repeated_pairs_accumulate():
    """count_pairs: a pair that happens twice counts twice"""
    got = count_pairs(np.array([0, 1, 0, 1, 0], dtype=np.int64), 2)
    want = np.array([[0.0, 2.0], [2.0, 0.0]])
    assert np.array_equal(got, want), (
        f"expected\n{want}\ngot\n{got}\n"
        "This is the trap in vectorizing the count. counts[rows, cols] += 1 "
        "writes each coordinate ONCE however often it appears, so a repeated "
        "pair lands as 1 instead of 2; np.add.at(counts, (rows, cols), 1.0) "
        "accumulates. A plain Python loop over the pairs is also correct."
    )


def test_the_line():
    """count_pairs: the tally chapter 1 builds by hand"""
    got = count_pairs(LINE_IDS, len(LINE_VOCAB))
    assert got.shape == (8, 8), f"expected an (8, 8) table, got {got.shape}"
    assert got.sum() == 18.0, (
        f'"to be, or not to be" is 19 characters, so it holds 18 pairs; your '
        f"table's entries add up to {got.sum()}."
    )
    t, o, space, b, e = 7, 5, 0, 2, 3
    assert got[t, o] == 2.0 and got[t, space] == 1.0, (
        f"the row for 't' should read 2 for 'o' and 1 for a space, and yours "
        f"reads {got[t, o]} and {got[t, space]}. The line's three t's are "
        '"to" twice and the "t " that ends "not".'
    )
    assert got[space].sum() == 5.0, (
        f"a space is followed 5 times in the line, and your table says "
        f"{got[space].sum()}. Spaces are characters like any other here: "
        "nothing about this counting treats them as separators."
    )
    assert got[b, e] == 2.0, (
        f"'b' is followed by 'e' both times it appears, so [b, e] should be "
        f"2.0, not {got[b, e]}."
    )
    assert got[e, 1] == 1.0, (
        f"the comma follows an 'e' once, so the 'e' row's comma column should "
        f"be 1.0, not {got[e, 1]}. Punctuation is in the vocabulary too."
    )


def test_unused_characters_stay_zero():
    """count_pairs: a character the text never continues gets an empty row"""
    got = count_pairs(np.array([0, 1, 1], dtype=np.int64), 4)
    assert got[2].sum() == 0.0 and got[3].sum() == 0.0, (
        "ids 2 and 3 never appear, so their rows must be all zeros; yours sum "
        f"to {got[2].sum()} and {got[3].sum()}. An empty row is a real answer, "
        "and chapter 3 has to do something about it."
    )
    assert got[1, 1] == 1.0, (
        f"id 1 follows itself once in [0, 1, 1], so [1, 1] should be 1.0, not "
        f"{got[1, 1]}. A character can follow itself; the diagonal is not "
        "special."
    )
