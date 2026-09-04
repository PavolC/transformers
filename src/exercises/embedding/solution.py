# Reference solution.


def embedding_forward(table, ids):
    """One row of the table per id: (V, C) and (B, T) to (B, T, C), plus a cache."""
    return table[ids], (ids, table.shape)


def embedding_backward(d_out, cache):
    """Add each position's gradient into the row its id read: (V, C)."""
    ids, shape = cache
    d_table = np.zeros(shape)
    np.add.at(d_table, ids.reshape(-1), d_out.reshape(-1, d_out.shape[-1]))
    return d_table
