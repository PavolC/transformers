# The table with a row per character, read by id, and how gradient gets back
# into the rows that were read.
#
# Contract:
# - embedding_forward(table, ids):
#     table  a (V, C) float64 array: one row per character in the vocabulary,
#            C numbers in each row. In this chapter C is V, and a row is a
#            row of scores; later chapters shrink C.
#     ids    a (B, T) int64 array of character ids (chapter 2's x).
#   Returns a pair (out, cache). out is (B, T, C): at every position, the row
#   of the character that sits there, so out[b, t] is table[ids[b, t]]. cache
#   is whatever embedding_backward needs (the ids and the table's shape).
#
# - embedding_backward(d_out, cache):
#     d_out  a (B, T, C) float64 array: the slope of the loss with respect to
#            every number that came out of the forward pass.
#   Returns a (V, C) float64 array, the slope of the loss with respect to
#   every entry of the table. A row that was read at several positions
#   collects the d_out of all of them, added together; a row no position read
#   gets zeros. np.add.at(d_table, ids.reshape(-1), d_out.reshape(-1, C))
#   does the adding, and accumulates where an id repeats; plain indexing
#   assignment would keep only one of the repeats.


def embedding_forward(table, ids):
    """One row of the table per id: (V, C) and (B, T) to (B, T, C), plus a cache.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement embedding_forward")


def embedding_backward(d_out, cache):
    """Add each position's gradient into the row its id read: (V, C).

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement embedding_backward")
