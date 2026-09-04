# Tests for the learned tally. A four-character vocabulary and a stream that
# repeats 0 1 2 3, so the right table is obvious (each character is always
# followed by the next) and training has an unmistakable target. The loop is
# the course's own train_driver, run with the learner's four functions and
# their cross_entropy. Failure messages are teaching content (CLAUDE.md).

import numpy as np
import course
from submission import init_bigram, bigram_forward, bigram_backward, sgd_step
from submission import cross_entropy, cross_entropy_backward

V = 4
STREAM = np.array([0, 1, 2, 3] * 100, dtype=np.int64)


def test_init():
    """init_bigram: a dict holding one (V, V) table of zeros"""
    params = init_bigram(V)
    assert isinstance(params, dict) and list(params) == ["table"], (
        f"init_bigram returns a dict with exactly one key, 'table'; got "
        f"{type(params).__name__}{' with keys ' + str(list(params)) if isinstance(params, dict) else ''}. "
        "Every model in the course keeps its parameters in one flat dict, so the same "
        "sgd_step and the same driver work for all of them."
    )
    table = params["table"]
    assert isinstance(table, np.ndarray) and table.shape == (V, V), (
        f"the table is a ({V}, {V}) array, one row and one column per character; got "
        f"{getattr(table, 'shape', type(table).__name__)}."
    )
    assert table.dtype == np.float64 and np.all(table == 0.0), (
        "the table starts as float64 zeros (np.zeros gives float64). A row of zeros is "
        "an even guess, which is what puts the untrained model on the ceiling rung."
    )


def test_forward():
    """bigram_forward: the table's row for every id, as (B, T, V) scores"""
    rng = np.random.default_rng(2)
    params = {"table": rng.normal(size=(V, V))}
    x = np.array([[0, 3, 3], [2, 1, 0]])
    got = bigram_forward(params, x)
    assert isinstance(got, tuple) and len(got) == 2, (
        f"bigram_forward returns (logits, cache), got {type(got).__name__}. Return what "
        "embedding_forward returns."
    )
    logits, _ = got
    assert logits.shape == (2, 3, V), (
        f"(B, T) = (2, 3) ids over {V} characters give (B, T, V) = (2, 3, {V}) scores, got "
        f"{logits.shape}."
    )
    assert np.array_equal(logits, params["table"][x]), (
        "logits[b, t] must be the table's row for the id at position (b, t): the model's "
        "opinion about what follows that character is that character's row."
    )


def test_backward_mirrors_params():
    """bigram_backward: a gradient dict with the same key and shape as params"""
    params = init_bigram(V)
    x = np.array([[0, 2], [2, 2]])
    _, cache = bigram_forward(params, x)
    d_logits = np.ones((2, 2, V))
    d_logits[0, 1] = 0.5
    d_logits[1, 0] = 0.25
    d_logits[1, 1] = 2.0
    grads = bigram_backward(d_logits, cache, params)
    assert isinstance(grads, dict) and list(grads) == ["table"], (
        f"bigram_backward returns a dict with the same keys as params, ['table']; got "
        f"{grads if not isinstance(grads, dict) else list(grads)}. Gradients mirror "
        "parameters key for key so sgd_step can pair them up by name."
    )
    assert grads["table"].shape == (V, V), (
        f"the table's gradient has the table's shape ({V}, {V}), got {grads['table'].shape}."
    )
    want = np.zeros((V, V))
    want[0] = 1.0
    want[2] = 0.5 + 0.25 + 2.0
    assert np.allclose(grads["table"], want), (
        f"expected row 0 to collect [1, 1, 1, 1] and row 2 to collect 0.5 + 0.25 + 2 = 2.75 "
        f"in every column, rows 1 and 3 zero; got {grads['table'].tolist()}. Hand "
        "d_logits and the cache to embedding_backward."
    )


def test_sgd_step():
    """sgd_step: every parameter moves against its gradient, in place"""
    params = {"a": np.array([1.0, 2.0]), "b": np.array([[3.0]])}
    grads = {"a": np.array([0.5, -0.5]), "b": np.array([[2.0]])}
    out = sgd_step(params, grads, 0.1)
    assert out is params, (
        "sgd_step changes the dict it was given and returns that same dict, so the "
        "driver's params keep pointing at the model being trained."
    )
    assert np.allclose(params["a"], [0.95, 2.05]) and np.allclose(params["b"], [[2.8]]), (
        f"with lr 0.1, a = [1, 2] minus 0.1 x [0.5, -0.5] is [0.95, 2.05] and b = [[3]] "
        f"minus 0.1 x [[2]] is [[2.8]]; got a = {params['a'].tolist()}, "
        f"b = {params['b'].tolist()}. A plus sign here walks uphill."
    )


def test_training_learns_the_stream():
    """training: from the ceiling to nearly certain in 200 steps"""
    params = init_bigram(V)
    losses = course.train_driver(
        params, STREAM,
        forward_fn=bigram_forward, backward_fn=bigram_backward,
        loss_fn=cross_entropy, loss_backward_fn=cross_entropy_backward,
        step_fn=sgd_step, steps=200, batch_size=4, block_size=8, lr=5.0,
        rng=np.random.default_rng(0),
    )
    assert abs(losses[0] - 2.0) < 1e-9, (
        f"the first step's loss must be log2(4) = 2 bits exactly, the ceiling for four "
        f"characters, got {losses[0]}. A table of zeros guesses evenly; if the first loss "
        "is anything else, the table did not start at zero."
    )
    assert losses[-1] < 0.1, (
        f"after 200 steps on a stream that repeats 0 1 2 3 the loss should be under 0.1 "
        f"bits, got {losses[-1]:.4f}. If it is still near 2, the table is not moving: "
        "check the sign in sgd_step and that bigram_backward's gradient reaches the "
        "table. If it is exactly the same at every step, the driver's step_fn is not "
        "changing the dict in place."
    )
    probs = np.exp(params["table"]) / np.exp(params["table"]).sum(axis=1, keepdims=True)
    for a in range(V):
        assert probs[a, (a + 1) % V] > 0.95, (
            f"after training, row {a} should give character {(a + 1) % V} almost all of "
            f"its probability, since it always follows; got {probs[a].round(4).tolist()}."
        )
