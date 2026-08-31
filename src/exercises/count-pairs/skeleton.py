# The tally: one row per character, one column per character, and in each
# cell the number of times that column's character followed that row's
# character.
#
# Contract:
# - count_pairs(ids, vocab_size): ids is a NumPy array of character ids (each
#   one an index into the vocabulary, so every id is between 0 and
#   vocab_size - 1). Return a float64 array of shape (vocab_size, vocab_size)
#   where entry [a, b] counts how many times character b came directly after
#   character a.
#
#   Read the ids as overlapping pairs: (ids[0], ids[1]), (ids[1], ids[2]),
#   and so on. An array of n ids therefore holds n - 1 pairs, and every id
#   except the first and last belongs to two of them, once as the character
#   before and once as the character after.
#
#   Start from np.zeros((vocab_size, vocab_size)), which is float64 by
#   default: counts are whole numbers, and floats are what every later
#   chapter divides them by. A row of all zeros is a real answer, for a
#   character the text never continued.


def count_pairs(ids, vocab_size):
    """Count how often each character follows each other character.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement count_pairs")
