# Reference solution.


def get_batch(ids, block_size, batch_size, rng):
    """Draw batch_size windows of block_size ids, with their shifted targets."""
    starts = rng.integers(0, len(ids) - block_size - 1, size=batch_size)
    x = np.stack([ids[s : s + block_size] for s in starts])
    y = np.stack([ids[s + 1 : s + block_size + 1] for s in starts])
    return x, y
