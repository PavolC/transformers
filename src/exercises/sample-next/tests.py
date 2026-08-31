# Tests for the sample_next exercise. Deterministic: every test creates its
# own generator from a fixed seed. The proportions are checked over enough
# draws that a correct implementation cannot fail (the bands below are far
# wider than the sampling noise at these counts), and no test pins WHICH
# generator call you make, so rng.choice and a hand-rolled cumulative sum both
# pass. Failure messages are teaching content (CLAUDE.md).

import collections

import numpy as np
from submission import sample_next

# Row 0 is 3 to 1 between ids 1 and 2; row 1 is empty; row 2 has one
# successor; row 3 continues into itself.
COUNTS = np.array([[0.0, 3.0, 1.0, 0.0],
                   [0.0, 0.0, 0.0, 0.0],
                   [2.0, 0.0, 0.0, 0.0],
                   [0.0, 0.0, 0.0, 5.0]])


def test_returns_a_plain_int():
    """sample_next: returns a plain Python int"""
    got = sample_next(COUNTS, 0, np.random.default_rng(0))
    assert isinstance(got, int) and not isinstance(got, bool), (
        f"sample_next must return a plain int, got {type(got).__name__}. "
        "np.random.Generator hands back a NumPy integer; wrap it in int(...), "
        "because the id is about to be used as a dict key and a list element."
    )


def test_only_counted_successors():
    """sample_next: a successor counted zero times never comes up"""
    rng = np.random.default_rng(0)
    drawn = {sample_next(COUNTS, 0, rng) for _ in range(500)}
    assert drawn <= {1, 2}, (
        f"row 0 of the tally counts only ids 1 and 2, so those are the only "
        f"answers it can give. Over 500 draws yours also returned "
        f"{sorted(drawn - {1, 2})}. A zero count must mean never, which is "
        "what dividing the row by its total gives you for free."
    )


def test_single_successor_is_certain():
    """sample_next: one counted successor means one possible answer"""
    for seed in range(20):
        got = sample_next(COUNTS, 2, np.random.default_rng(seed))
        assert got == 0, (
            f"row 2 counts id 0 twice and nothing else, so the answer is "
            f"always 0; with seed {seed} yours returned {got}."
        )


def test_proportions():
    """sample_next: three-to-one counts draw three-to-one"""
    rng = np.random.default_rng(0)
    draws = collections.Counter(sample_next(COUNTS, 0, rng) for _ in range(4000))
    share_one = draws[1] / 4000
    assert 0.71 < share_one < 0.79, (
        f"row 0 counts id 1 three times and id 2 once, so id 1 should come up "
        f"about three quarters of the time. Over 4000 draws yours came up "
        f"{share_one:.3f} of the time. Near 0.5 means you are choosing evenly "
        "among the successors that have any count at all, ignoring how many; "
        "divide the row by its total and draw with those shares."
    )


def test_uses_the_row_it_was_given():
    """sample_next: the answer comes from the current character's row"""
    rng = np.random.default_rng(1)
    drawn = {sample_next(COUNTS, 3, rng) for _ in range(200)}
    assert drawn == {3}, (
        f"asked about character 3, whose row counts only id 3, the answer must "
        f"be 3 every time; yours returned {sorted(drawn)}. If you see answers "
        "from other rows, the function is looking at the whole table instead "
        "of at row `current`."
    )


def test_empty_row_falls_back_to_even():
    """sample_next: a character the text never continued still answers"""
    rng = np.random.default_rng(2)
    try:
        draws = collections.Counter(sample_next(COUNTS, 1, rng) for _ in range(2000))
    except Exception as exc:  # noqa: BLE001
        raise AssertionError(
            f"row 1 of the tally is all zeros, and your sample_next raised "
            f"{type(exc).__name__}: {exc}. Dividing a zero row by its total "
            "gives nan, and a draw cannot use nan shares. Check whether the "
            "row's total is 0 first, and fall back to rng.integers(0, "
            "len(row)), an even choice over the vocabulary."
        ) from exc
    assert set(draws) == {0, 1, 2, 3}, (
        f"with nothing counted, every character has to be possible; over 2000 "
        f"draws yours only produced {sorted(draws)}."
    )
    smallest = min(draws.values()) / 2000
    assert smallest > 0.15, (
        f"the fallback is meant to be even over all 4 characters, about 0.25 "
        f"each, and your rarest came up {smallest:.3f} of the time."
    )


def test_same_seed_same_answer():
    """sample_next: the caller's generator is the only source of randomness"""
    first = [sample_next(COUNTS, 0, np.random.default_rng(7)) for _ in range(3)]
    second = [sample_next(COUNTS, 0, np.random.default_rng(7)) for _ in range(3)]
    assert first == second, (
        f"two fresh generators made from the same seed must give the same "
        f"answer, and yours gave {first} then {second}. Something inside is "
        "drawing from somewhere else: np.random.seed, np.random.choice (the "
        "old global generator) or a generator built inside the function. Use "
        "only the rng that was passed in, which is what makes a whole "
        "generated passage repeatable."
    )
    # And one generator used repeatedly must advance rather than repeat: the
    # 3-to-1 row has to produce a 2 within 40 draws (the chance of 40 ones in
    # a row is 0.75 ** 40, about one in a hundred thousand, and the seed is
    # fixed anyway).
    rng = np.random.default_rng(7)
    stream = [sample_next(COUNTS, 0, rng) for _ in range(40)]
    assert len(set(stream)) > 1, (
        f"forty draws from the same generator all came back {stream[0]}. The "
        "generator advances on every call, so it should not repeat itself for "
        "a row that is 3 to 1; a fresh generator built inside the function "
        "would behave exactly like this."
    )
