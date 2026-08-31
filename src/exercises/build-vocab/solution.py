# Reference solution.


def build_vocab(text):
    """The sorted vocabulary of a text, with its two lookup tables."""
    chars = sorted(set(text))
    stoi = {ch: i for i, ch in enumerate(chars)}
    itos = {i: ch for i, ch in enumerate(chars)}
    return chars, stoi, itos


def encode(text, stoi):
    """Text to an int64 array of ids."""
    return np.array([stoi[ch] for ch in text], dtype=np.int64)


def decode(ids, itos):
    """Ids back to the string they spell."""
    return "".join(itos[int(i)] for i in ids)
