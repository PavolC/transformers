"""Helpers the course provides to exercises via `from course import ...`.

These are the course's own copies of things the learner builds across the
chapters (sliced from reference_scribe.py, which the worker boots first),
plus the corpus loader. The harness registers this file as the `course`
module inside Pyodide, and lends names from it when a run needs a section
the learner has not written yet, so skeletons never contain solution logic
(see CLAUDE.md hard rules).

Shape conventions (the canonical representation in CLAUDE.md): batches are
(B, T) int64 with targets shifted one character left, activations are
(B, T, C), floats are float64, randomness is an explicit
np.random.default_rng passed in, and the loss is bits per character.
"""

import numpy as np
import reference_scribe as _rs

# ---------------------------------------------------------------- the corpus

_corpus_cache = None


def load_corpus():
    """The whole of Tiny Shakespeare, as one string.

    The worker fetches the file into /tinyshakespeare.txt before anything
    runs; this just reads it once and keeps it.
    """
    global _corpus_cache
    if _corpus_cache is None:
        with open("/tinyshakespeare.txt", "r", encoding="utf-8") as f:
            _corpus_cache = f.read()
    return _corpus_cache


# ------------------------------------------- the learner's parts, course copies
#
# One name per name the exercise sections provide, so the harness can lend
# them. Each is the reference implementation the benches and the parity
# fixture run; a lend is reported to the reader by name.

count_pairs = _rs.count_pairs
sample_next = _rs.sample_next
softmax = _rs.softmax

# ----------------------------------------------------- shared, never exercises

build_vocab = _rs.build_vocab
encode = _rs.encode
decode = _rs.decode
split_data = _rs.split_data
get_batch = _rs.get_batch
