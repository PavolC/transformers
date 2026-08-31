# The tally: how often each character follows each other character.
#
# You are handed the text. This function does not open a file or fetch
# anything: the caller passes the stream in, already turned into numbers.
# The tests pass the line "to be, or not to be"; the prompt's snippet passes
# the whole corpus.
#
# What you are counting is neighbours. Walk the stream one step at a time,
# look at each character together with the one right after it, and add one to
# that pair's cell. A stream of n characters holds n - 1 pairs, because every
# character except the last has a character after it.
#
# Contract:
# - count_pairs(ids, vocab_size):
#     ids         the stream, one number per character. A character's number
#                 is its place in the sorted list of the characters in use,
#                 so for this chapter's line a space is 0, a comma is 1, and
#                 b is 2. Numbers rather than letters because the answer is a
#                 NumPy array, and an array is indexed by numbers.
#     vocab_size  how many characters that sorted list holds, which is how
#                 wide and how tall the table has to be.
#
#   Return a float64 array of shape (vocab_size, vocab_size) where entry
#   [a, b] counts how many times the character with id b came directly after
#   the character with id a. There is a row and a column for every character
#   in the vocabulary, whether or not this stream uses it, and a row of all
#   zeros is a real answer: the text never continued that character.
#
#   Start from np.zeros((vocab_size, vocab_size)), which is float64 by
#   default: counts are whole numbers, and floats are what every later
#   chapter divides them by.


def count_pairs(ids, vocab_size):
    """Count how often each character follows each other character.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement count_pairs")
