# Tests for the crossing between text and numbers. Fixture values are
# hardcoded literals, checked by hand against the sorted vocabularies they
# come from. Failure messages are teaching content (CLAUDE.md).

import numpy as np
from submission import build_vocab, encode, decode

LINE = "to be, or not to be"


def test_line_vocabulary():
    """build_vocab: chapter 1's line, and the ids its strip showed"""
    chars, stoi, itos = build_vocab(LINE)
    want = [" ", ",", "b", "e", "n", "o", "r", "t"]
    assert list(chars) == want, (
        f"build_vocab({LINE!r}) should give the 8 distinct characters in "
        f"sorted order, {want}, and gave {list(chars)}. A space and a comma "
        "are characters like any other here, and sorted() puts them first "
        "because their character codes are lower than any letter's."
    )
    assert stoi[" "] == 0 and stoi[","] == 1 and stoi["t"] == 7, (
        f"a character's id is its position in that sorted list, so a space is "
        f"0, a comma is 1 and 't' is 7. Yours has a space at {stoi.get(' ')}, "
        f"a comma at {stoi.get(',')} and 't' at {stoi.get('t')}."
    )


def test_sorted_not_first_seen():
    """build_vocab: sorted order, not the order the characters appear in"""
    chars, stoi, _ = build_vocab("the tale")
    want = [" ", "a", "e", "h", "l", "t"]
    assert list(chars) == want, (
        f"build_vocab('the tale') should give {want}; yours gave "
        f"{list(chars)}. If yours starts with 't', 'h', 'e' you kept the "
        "order the characters appear in, which set() does not even promise to "
        "preserve. Sort the set: the numbering has to come out the same every "
        "time the same text is read, or ids saved from one run mean something "
        "else in the next."
    )


def test_tables_are_inverses():
    """build_vocab: stoi and itos undo each other"""
    chars, stoi, itos = build_vocab(LINE)
    assert len(stoi) == len(chars) and len(itos) == len(chars), (
        f"both tables need one entry per character: {len(chars)} characters, "
        f"but stoi has {len(stoi)} entries and itos has {len(itos)}."
    )
    for i, ch in enumerate(chars):
        assert stoi[ch] == i, f"stoi[{ch!r}] should be {i}, got {stoi[ch]}"
        assert itos[i] == ch, (
            f"itos[{i}] should be {ch!r}, got {itos[i]!r}. itos is stoi with "
            "the keys and values swapped: id in, character out. If yours has "
            "characters for keys it is a second copy of stoi, and decode will "
            "raise a KeyError on the first integer it is handed."
        )


def test_encode_gives_int64_ids():
    """encode: one id per character, as an int64 array"""
    _, stoi, _ = build_vocab(LINE)
    got = encode(LINE, stoi)
    assert isinstance(got, np.ndarray), (
        f"encode must return a NumPy array, not a {type(got).__name__}. A "
        "list cannot be sliced into windows or used to index a table, which "
        "is everything the rest of the course does with it."
    )
    assert got.dtype == np.int64, (
        f"encode's array must be int64, and yours is {got.dtype}. These "
        "numbers index rows of a table, and NumPy refuses a float as an "
        "index. Pass dtype=np.int64 to np.array."
    )
    want = [7, 5, 0, 2, 3, 1, 0, 5, 6, 0, 4, 5, 7, 0, 7, 5, 0, 2, 3]
    assert got.shape == (len(LINE),), (
        f"one id per character, so encode({LINE!r}) has shape "
        f"({len(LINE)},); yours has {got.shape}."
    )
    assert got.tolist() == want, (
        f"expected {want}, got {got.tolist()}. Read the characters in order "
        "and look each one up in stoi."
    )


def test_encode_uses_the_table_it_is_given():
    """encode: the ids come from stoi, not from the text being encoded"""
    _, big_stoi, _ = build_vocab(LINE + "\nqQ")
    got = encode("to be", big_stoi)
    want = [10, 7, 1, 4, 5]
    assert got.tolist() == want, (
        f"encode('to be', stoi) with a stoi built from a bigger text should "
        f"give {want}, and gave {got.tolist()}. If you got "
        "[7, 5, 0, 2, 3] you built a vocabulary from the text handed to "
        "encode instead of using the stoi handed to it. The ids belong to the "
        "vocabulary, not to the string: 't' is 7 in a vocabulary of 8 "
        "characters and 10 in this one of 11."
    )


def test_encode_empty_stays_int64():
    """encode: the empty string gives an empty int64 array"""
    _, stoi, _ = build_vocab(LINE)
    got = encode("", stoi)
    assert got.shape == (0,), (
        f"encode('') should give an array of shape (0,), got {got.shape}."
    )
    assert got.dtype == np.int64, (
        f"encode('') gave dtype {got.dtype}. np.array([]) is float64: with no "
        "elements to look at, NumPy falls back to its default. Ask for "
        "dtype=np.int64 explicitly and the empty case comes out right too."
    )


def test_decode_round_trip():
    """decode: text in, the same text back out"""
    text = "To be:\nthat is the question, ay?\n"
    _, stoi, itos = build_vocab(text)
    got = decode(encode(text, stoi), itos)
    assert isinstance(got, str), (
        f"decode must return a string, not a {type(got).__name__}. Join the "
        "characters with \"\".join(...)."
    )
    assert got == text, (
        f"decode(encode(text)) must give the text back exactly. Expected "
        f"{text!r}, got {got!r}. Newlines and spaces are characters in the "
        "vocabulary like any other, so nothing is stripped and nothing is "
        "added."
    )


def test_decode_uses_the_table_it_is_given():
    """decode: the same ids spell different things under two vocabularies"""
    _, _, line_itos = build_vocab(LINE)
    _, _, big_itos = build_vocab(LINE + "\nqQ")
    ids = np.array([7, 5, 0, 2, 3], dtype=np.int64)
    got = decode(ids, line_itos)
    assert got == "to be", (
        f"decode({ids.tolist()}) under the line's own 8-character vocabulary "
        f"should spell 'to be', and spelled {got!r}. Look each id up in the "
        "itos handed to you, one at a time, and join the results."
    )
    other = decode(ids, big_itos)
    assert other == "oe\n,Q", (
        f"the same ids under a vocabulary of 11 characters should spell "
        f"{'oe' + chr(10) + ',Q'!r}, and spelled {other!r}. Ids carry no "
        "characters in them: they are positions in one particular "
        "vocabulary, so decoding with the wrong one gives nonsense rather "
        "than an error."
    )
