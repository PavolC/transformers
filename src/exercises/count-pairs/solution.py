# Reference solution.


def count_pairs(ids, vocab_size):
    """Count how often each character follows each other character."""
    counts = np.zeros((vocab_size, vocab_size), dtype=np.float64)
    # np.add.at accumulates, so a pair that occurs twice adds 1 twice. Plain
    # fancy-index assignment would not: counts[rows, cols] += 1 writes each
    # repeated coordinate once, which silently undercounts every pair that
    # happens more than once.
    np.add.at(counts, (ids[:-1], ids[1:]), 1.0)
    return counts
