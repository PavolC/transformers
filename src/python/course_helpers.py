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
        try:
            with open("/tinyshakespeare.txt", "r", encoding="utf-8") as f:
                _corpus_cache = f.read()
        except FileNotFoundError:
            raise RuntimeError(
                "The corpus is not in this runtime: /tinyshakespeare.txt does not "
                "exist. Nothing in your own code caused this. The workbench "
                "fetches the file before it runs anything, so a missing corpus "
                "is a bug in the workbench, not in your scribe."
            ) from None
    return _corpus_cache


# ------------------------------------------- the learner's parts, course copies
#
# One name per name the exercise sections provide, so the harness can lend
# them. Each is the reference implementation the benches and the parity
# fixture run; a lend is reported to the reader by name.

count_pairs = _rs.count_pairs
sample_next = _rs.sample_next
build_vocab = _rs.build_vocab
encode = _rs.encode
decode = _rs.decode
get_batch = _rs.get_batch
probs_from_tally = _rs.probs_from_tally
surprise_bits = _rs.surprise_bits
avg_surprise = _rs.avg_surprise
softmax = _rs.softmax
cross_entropy = _rs.cross_entropy
cross_entropy_backward = _rs.cross_entropy_backward
embedding_forward = _rs.embedding_forward
embedding_backward = _rs.embedding_backward
numeric_grad = _rs.numeric_grad
grad_check = _rs.grad_check
init_bigram = _rs.init_bigram
bigram_forward = _rs.bigram_forward
bigram_backward = _rs.bigram_backward
sgd_step = _rs.sgd_step

# ----------------------------------------------------- shared, never exercises
#
# The drivers are the seam (CLAUDE.md, the exercise contract): they take the
# model as functions, so chapter 4's learned tally and chapter 10's scribe
# train and are scored through one loop. The scratch pad sees them by name,
# the way it sees load_corpus, because a snippet that trains has to call one.

split_data = _rs.split_data
train_driver = _rs.train_driver
eval_driver = _rs.eval_driver
