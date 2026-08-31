# Reference solution.


def sample_next(counts, current, rng):
    """Draw the next character's id in proportion to its row of the tally."""
    row = counts[current]
    total = row.sum()
    if total <= 0:
        # A character the text never continued: nothing to draw from, so every
        # character is equally likely.
        return int(rng.integers(0, len(row)))
    return int(rng.choice(len(row), p=row / total))
