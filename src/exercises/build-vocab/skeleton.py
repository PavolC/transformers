# The crossing between text and numbers.
#
# Three functions that belong together. The first reads a piece of text and
# decides on the numbering; the other two use that numbering to go each way.
# None of them opens a file: the caller passes the text in.
#
# Contract:
# - build_vocab(text):
#     text  any Python string. The course passes the whole corpus; the tests
#           pass short strings.
#
#   Return three things, in this order: (chars, stoi, itos).
#     chars  a list of the distinct characters in the text, sorted. Sorted is
#            the whole point: it is what makes a character's id the same
#            number every time the vocabulary is built from the same text.
#     stoi   a dict from character to id, where a character's id is its
#            position in chars, counting from 0. "String to int", said
#            "stoy".
#     itos   a dict from id back to character, the other direction. "Int to
#            string", said "eye-toss".
#
# - encode(text, stoi):
#     Return a NumPy array of the text's ids, one per character, in order.
#     dtype=np.int64, including for the empty string: np.array([]) is float64
#     by default, and a float cannot index a row of a table.
#
# - decode(ids, itos):
#     Return the string those ids spell. ids is a NumPy array, so its
#     elements are NumPy integers rather than Python ones; itos has Python
#     int keys, so look up int(i) rather than i.
#
# The vocabulary is a property of the text it was built from, not of the
# alphabet. Chapter 1's line has 8 distinct characters and gives 't' the id
# 7; the corpus has 65 and gives 't' the id 58. Neither is more correct, and
# ids from one vocabulary decoded with another spell nonsense, so a pair of
# functions always travels with the vocabulary they were built from.


def build_vocab(text):
    """The sorted vocabulary of a text, with its two lookup tables.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement build_vocab")


def encode(text, stoi):
    """Text to an int64 array of ids.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement encode")


def decode(ids, itos):
    """Ids back to the string they spell.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement decode")
