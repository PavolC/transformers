# The reference scribe: a character-level, decoder-only transformer in NumPy.
#
# This is the course's reference implementation. The exercise solutions are
# sliced from it as chapters are written, the benches run it, and the parity
# fixture checks it against a PyTorch twin. It obeys the canonical
# representation in CLAUDE.md exactly:
#
#   - float64 everywhere (NumPy's default, so naive learner code matches);
#   - one explicit np.random.Generator, passed in, never global;
#   - parameters in one flat dict of dotted names, gradients mirroring it;
#   - every module a forward/backward pair of pure functions;
#   - batches (B, T) int64, activations (B, T, C), attention (B, H, T, T);
#   - the loss is mean cross-entropy per position, in bits (base-2 log).
#
# Parameter initialization order is the insertion order in init_params. That
# order is part of the contract: a bench that draws in a different order
# builds a different model from the same seed.

import numpy as np

LN2 = float(np.log(2.0))


# ---------------------------------------------------------------------------
# Text, vocabulary, batches
# ---------------------------------------------------------------------------

def build_vocab(text):
    """Sorted character vocabulary with encode/decode tables."""
    chars = sorted(set(text))
    stoi = {ch: i for i, ch in enumerate(chars)}
    itos = {i: ch for i, ch in enumerate(chars)}
    return chars, stoi, itos


def encode(text, stoi):
    return np.array([stoi[ch] for ch in text], dtype=np.int64)


def decode(ids, itos):
    return "".join(itos[int(i)] for i in ids)


def split_data(ids, val_fraction=0.1):
    """First (1 - val_fraction) of the stream trains; the tail is held out."""
    n_val = int(len(ids) * val_fraction)
    return ids[: len(ids) - n_val], ids[len(ids) - n_val :]


def get_batch(ids, block_size, batch_size, rng):
    """Sample windows of block_size with targets shifted one character left."""
    starts = rng.integers(0, len(ids) - block_size - 1, size=batch_size)
    x = np.stack([ids[s : s + block_size] for s in starts])
    y = np.stack([ids[s + 1 : s + block_size + 1] for s in starts])
    return x, y


# ---------------------------------------------------------------------------
# The counted bigram (chapter 1 and 3's model, and the ladder's first rung)
# ---------------------------------------------------------------------------

def count_pairs(ids, vocab_size):
    """counts[a, b] = how often character b follows character a.

    Chapter 1's first exercise. The course's own copy, lent to a run while
    that section is unwritten.
    """
    counts = np.zeros((vocab_size, vocab_size), dtype=np.float64)
    np.add.at(counts, (ids[:-1], ids[1:]), 1.0)
    return counts


# The field's name for the same table, used by the benches and by every
# chapter after the first.
bigram_counts = count_pairs


def sample_next(counts, current, rng):
    """Draw the next character's id in proportion to its row of the tally.

    Chapter 1's second exercise. A row of all zeros (a character the text
    never continued) would have nothing to draw from, so it falls back to an
    even choice over the vocabulary.
    """
    row = counts[current]
    total = row.sum()
    if total <= 0:
        return int(rng.integers(0, len(row)))
    return int(rng.choice(len(row), p=row / total))


def bigram_probs(counts, alpha=1.0):
    """Rows to probabilities, add-alpha smoothed so no pair has zero."""
    smoothed = counts + alpha
    return smoothed / smoothed.sum(axis=1, keepdims=True)


def surprise_bits(probs, ids):
    """One surprise per position: minus log2 of the probability the table gave
    the character that actually came next. Shape (len(ids) - 1,)."""
    p = probs[ids[:-1], ids[1:]]
    with np.errstate(divide="ignore"):
        return -np.log2(p)


def avg_surprise(probs, ids):
    """Average surprise per character, in bits: the loss, and a ladder rung."""
    return float(surprise_bits(probs, ids).mean())


# The names chapter 3's exercise section provides.
probs_from_tally = bigram_probs
bigram_avg_surprise_bits = avg_surprise


# ---------------------------------------------------------------------------
# Modules: forward/backward pairs
# ---------------------------------------------------------------------------

def linear_forward(x, w, b):
    out = x @ w + b
    return out, (x, w)


def linear_backward(d_out, cache):
    x, w = cache
    d_x = d_out @ w.T
    x2 = x.reshape(-1, x.shape[-1])
    d2 = d_out.reshape(-1, d_out.shape[-1])
    d_w = x2.T @ d2
    d_b = d2.sum(axis=0)
    return d_x, d_w, d_b


def layernorm_forward(x, g, b, eps=1e-5):
    mu = x.mean(axis=-1, keepdims=True)
    xc = x - mu
    var = (xc * xc).mean(axis=-1, keepdims=True)
    inv = 1.0 / np.sqrt(var + eps)
    xhat = xc * inv
    out = xhat * g + b
    return out, (xhat, inv, g)


def layernorm_backward(d_out, cache):
    xhat, inv, g = cache
    d_xhat = d_out * g
    d_g = (d_out * xhat).reshape(-1, xhat.shape[-1]).sum(axis=0)
    d_b = d_out.reshape(-1, d_out.shape[-1]).sum(axis=0)
    mean1 = d_xhat.mean(axis=-1, keepdims=True)
    mean2 = (d_xhat * xhat).mean(axis=-1, keepdims=True)
    d_x = inv * (d_xhat - mean1 - xhat * mean2)
    return d_x, d_g, d_b


GELU_K = float(np.sqrt(2.0 / np.pi))


def gelu_forward(x):
    """GELU, tanh approximation (GPT-2's), so the PyTorch twin can match it."""
    u = GELU_K * (x + 0.044715 * x**3)
    t = np.tanh(u)
    out = 0.5 * x * (1.0 + t)
    return out, (x, t)


def gelu_backward(d_out, cache):
    x, t = cache
    du_dx = GELU_K * (1.0 + 3.0 * 0.044715 * x**2)
    d_x = d_out * (0.5 * (1.0 + t) + 0.5 * x * (1.0 - t * t) * du_dx)
    return d_x


def softmax(scores, axis=-1):
    """Stable softmax; masked entries arrive as -inf and come out as 0."""
    m = scores.max(axis=axis, keepdims=True)
    e = np.exp(scores - m)
    return e / e.sum(axis=axis, keepdims=True)


def attention_forward(x, w_qkv, b_qkv, w_o, b_o, n_head):
    """Multi-head causal self-attention over (B, T, C)."""
    B, T, C = x.shape
    hs = C // n_head
    qkv, lin_cache = linear_forward(x, w_qkv, b_qkv)
    q, k, v = np.split(qkv, 3, axis=-1)
    # (B, T, C) -> (B, H, T, hs)
    q = q.reshape(B, T, n_head, hs).transpose(0, 2, 1, 3)
    k = k.reshape(B, T, n_head, hs).transpose(0, 2, 1, 3)
    v = v.reshape(B, T, n_head, hs).transpose(0, 2, 1, 3)
    scale = 1.0 / np.sqrt(hs)
    scores = (q @ k.transpose(0, 1, 3, 2)) * scale  # (B, H, T, T)
    mask = np.triu(np.ones((T, T), dtype=bool), k=1)
    scores = np.where(mask, -np.inf, scores)
    att = softmax(scores, axis=-1)
    y = att @ v  # (B, H, T, hs)
    y = y.transpose(0, 2, 1, 3).reshape(B, T, C)
    out, out_cache = linear_forward(y, w_o, b_o)
    return out, (lin_cache, out_cache, q, k, v, att, scale, n_head)


def attention_backward(d_out, cache):
    lin_cache, out_cache, q, k, v, att, scale, n_head = cache
    B, H, T, hs = q.shape
    C = H * hs
    d_y, d_wo, d_bo = linear_backward(d_out, out_cache)
    d_y = d_y.reshape(B, T, H, hs).transpose(0, 2, 1, 3)
    d_att = d_y @ v.transpose(0, 1, 3, 2)
    d_v = att.transpose(0, 1, 3, 2) @ d_y
    # softmax backward: masked entries have att == 0, so they stay 0 here.
    d_scores = att * (d_att - (d_att * att).sum(axis=-1, keepdims=True))
    d_q = (d_scores @ k) * scale
    d_k = (d_scores.transpose(0, 1, 3, 2) @ q) * scale
    merge = lambda a: a.transpose(0, 2, 1, 3).reshape(B, T, C)
    d_qkv = np.concatenate([merge(d_q), merge(d_k), merge(d_v)], axis=-1)
    d_x, d_wqkv, d_bqkv = linear_backward(d_qkv, lin_cache)
    return d_x, d_wqkv, d_bqkv, d_wo, d_bo


def cross_entropy(logits, targets):
    """Mean surprise in bits over every position, plus the cache its gradient needs.

    Chapter 4's loss, and the loss of every model after it. logits is
    (B, T, V), one row of scores per position; targets is (B, T), the id that
    actually came next at each position. The row is turned into probabilities
    by softmax, the probability given to the real next character is read off,
    and its surprise is minus log2 of that, exactly as chapter 3 scored the
    tally; the loss is the mean over all B * T positions.
    """
    probs = softmax(logits)
    B, T, V = logits.shape
    bi = np.arange(B)[:, None]
    ti = np.arange(T)[None, :]
    picked = probs[bi, ti, targets]
    loss_bits = float(-np.log2(picked).mean())
    return loss_bits, (probs, targets)


def cross_entropy_backward(cache):
    """The gradient of the loss with respect to every score.

    Probabilities minus the one-hot of the target, divided by the number of
    positions (the mean) and by ln 2 (the loss is in bits, and the natural
    slope of a logarithm is in nats). Dropping the ln 2 leaves every gradient
    1.4427 times too large, which grad_check catches at once.
    """
    probs, targets = cache
    B, T, V = probs.shape
    onehot = np.zeros_like(probs)
    bi = np.arange(B)[:, None]
    ti = np.arange(T)[None, :]
    onehot[bi, ti, targets] = 1.0
    return (probs - onehot) / (B * T * LN2)


# The names the rest of this file, the training driver and the parity
# fixture use for the same two functions.
cross_entropy_bits_forward = cross_entropy
cross_entropy_bits_backward = cross_entropy_backward


def embedding_forward(table, ids):
    """Look up one row of the table per id.

    table is (V, C): one row per character in the vocabulary. ids is (B, T).
    The result is (B, T, C): at every position, the row of the character that
    sits there. The cache is what the backward pass needs to put gradient
    back into the rows that were read.
    """
    return table[ids], (ids, table.shape)


def embedding_backward(d_out, cache):
    """Add each position's gradient into the row its id looked up.

    A row read at several positions collects all of them, which is the same
    accumulate-on-repeat that chapter 1's np.add.at did for the tally. Rows no
    position read get zero.
    """
    ids, shape = cache
    d_table = np.zeros(shape)
    np.add.at(d_table, ids.reshape(-1), d_out.reshape(-1, d_out.shape[-1]))
    return d_table


# ---------------------------------------------------------------------------
# The learned tally (chapter 4's model), one step downhill, and the check
# ---------------------------------------------------------------------------

def init_bigram(vocab_size):
    """The learned tally before any training: a table of zeros.

    Every row of zeros is an even guess over the vocabulary, so the untrained
    model sits exactly on the ladder's ceiling rung, log2(vocab_size) bits.
    Parameters live in one flat dict, the same shape every later model uses.
    """
    return {"table": np.zeros((vocab_size, vocab_size))}


def bigram_forward(params, x):
    """(B, T) ids -> (B, T, V) scores: the row of the table for each id."""
    return embedding_forward(params["table"], x)


def bigram_backward(d_logits, cache, params):
    """Gradients mirroring params key for key: here, one table."""
    return {"table": embedding_backward(d_logits, cache)}


def sgd_step(params, grads, lr):
    """One step downhill: every parameter moves against its gradient by lr
    times the gradient. In place, and returned for convenience."""
    for name in params:
        params[name] = params[name] - lr * grads[name]
    return params


def numeric_grad(f, x, eps=1e-5):
    """The slope of f at every element of x, measured by nudging.

    For each element in turn: raise it by eps, evaluate f, lower it by eps,
    evaluate f, and divide the difference by 2 * eps. x is restored after
    every nudge. Slow (two evaluations per element), which is why it is a
    check on a formula rather than a way to train.
    """
    g = np.zeros_like(x, dtype=np.float64)
    for i in range(x.size):
        old = x.flat[i]
        x.flat[i] = old + eps
        up = f(x)
        x.flat[i] = old - eps
        down = f(x)
        x.flat[i] = old
        g.flat[i] = (up - down) / (2.0 * eps)
    return g


def grad_check(f, x, claimed, eps=1e-5):
    """How far a claimed gradient is from the nudged one, as a relative error.

    Returns the largest, over all elements, of |numeric - claimed| divided by
    |numeric| + |claimed| + 1e-12. A correct formula lands near 1e-8 in
    float64; a wrong one is off by orders of magnitude.
    """
    numeric = numeric_grad(f, x, eps)
    return float(np.max(np.abs(numeric - claimed) / (np.abs(numeric) + np.abs(claimed) + 1e-12)))


# ---------------------------------------------------------------------------
# The drivers: the seam every model trains and is scored through
# ---------------------------------------------------------------------------

def train_driver(params, ids, *, forward_fn, backward_fn, loss_fn, loss_backward_fn,
                 step_fn, steps, batch_size, block_size, lr, rng, on_step=None):
    """The training loop, with the model handed in as functions.

    Chapter 4 trains the learned tally through this and chapter 10 trains the
    scribe through the same loop; only the functions passed in change. Every
    step: draw a batch, run the model forward, score it, run the loss and the
    model backward, and step every parameter against its gradient. Returns
    the loss at every step, in bits. on_step(step, loss_bits, params), when
    given, is called after each step (the live panels stream from it).
    """
    losses = []
    for step in range(1, steps + 1):
        x, y = get_batch(ids, block_size, batch_size, rng)
        logits, cache = forward_fn(params, x)
        loss, loss_cache = loss_fn(logits, y)
        d_logits = loss_backward_fn(loss_cache)
        grads = backward_fn(d_logits, cache, params)
        step_fn(params, grads, lr)
        losses.append(float(loss))
        if on_step is not None:
            on_step(step, float(loss), params)
    return losses


def eval_driver(params, ids, *, forward_fn, loss_fn, block_size):
    """The loss in bits over every step of ids, walked with the answer key open.

    ids is cut into consecutive windows of block_size (the last one shorter),
    each is run forward and scored on the character after each position, and
    the per-position losses are averaged over all len(ids) - 1 steps. For a
    model that reads one character this is exactly chapter 3's average
    surprise; for one that reads a window it scores each position with only
    the window behind it.
    """
    steps = len(ids) - 1
    total = 0.0
    for start in range(0, steps, block_size):
        stop = min(start + block_size, steps)
        x = ids[start:stop][None, :]
        y = ids[start + 1:stop + 1][None, :]
        logits, _ = forward_fn(params, x)
        loss, _ = loss_fn(logits, y)
        total += loss * (stop - start)
    return total / steps


# ---------------------------------------------------------------------------
# The scribe: init, forward, backward
# ---------------------------------------------------------------------------

def init_params(cfg, rng):
    """Flat dict of parameters. Insertion order is the draw order; changing it
    changes the model a seed builds."""
    V, T, C, L = cfg["vocab_size"], cfg["block_size"], cfg["n_embd"], cfg["n_layer"]
    std = 0.02
    res_std = std / np.sqrt(2.0 * L)  # residual projections, GPT-2's scaling
    p = {}
    p["wte"] = rng.normal(0.0, std, (V, C))
    p["wpe"] = rng.normal(0.0, std, (T, C))
    for i in range(L):
        pre = f"blocks.{i}."
        p[pre + "ln1.g"] = np.ones(C)
        p[pre + "ln1.b"] = np.zeros(C)
        p[pre + "attn.w_qkv"] = rng.normal(0.0, std, (C, 3 * C))
        p[pre + "attn.b_qkv"] = np.zeros(3 * C)
        p[pre + "attn.w_o"] = rng.normal(0.0, res_std, (C, C))
        p[pre + "attn.b_o"] = np.zeros(C)
        p[pre + "ln2.g"] = np.ones(C)
        p[pre + "ln2.b"] = np.zeros(C)
        p[pre + "mlp.w1"] = rng.normal(0.0, std, (C, 4 * C))
        p[pre + "mlp.b1"] = np.zeros(4 * C)
        p[pre + "mlp.w2"] = rng.normal(0.0, res_std, (4 * C, C))
        p[pre + "mlp.b2"] = np.zeros(C)
    p["lnf.g"] = np.ones(C)
    p["lnf.b"] = np.zeros(C)
    p["head.w"] = rng.normal(0.0, std, (C, V))
    p["head.b"] = np.zeros(V)
    return p


def forward_gpt(params, x, cfg):
    """(B, T) ids -> (B, T, V) logits, plus caches for the backward pass."""
    B, T = x.shape
    H, L = cfg["n_head"], cfg["n_layer"]
    h = params["wte"][x] + params["wpe"][:T]
    caches = {"x": x, "T": T, "blocks": []}
    for i in range(L):
        pre = f"blocks.{i}."
        a, ln1_cache = layernorm_forward(h, params[pre + "ln1.g"], params[pre + "ln1.b"])
        att, att_cache = attention_forward(
            a,
            params[pre + "attn.w_qkv"],
            params[pre + "attn.b_qkv"],
            params[pre + "attn.w_o"],
            params[pre + "attn.b_o"],
            H,
        )
        h = h + att
        a2, ln2_cache = layernorm_forward(h, params[pre + "ln2.g"], params[pre + "ln2.b"])
        m1, lin1_cache = linear_forward(a2, params[pre + "mlp.w1"], params[pre + "mlp.b1"])
        g, gelu_cache = gelu_forward(m1)
        m2, lin2_cache = linear_forward(g, params[pre + "mlp.w2"], params[pre + "mlp.b2"])
        h = h + m2
        caches["blocks"].append((ln1_cache, att_cache, ln2_cache, lin1_cache, gelu_cache, lin2_cache))
    hf, lnf_cache = layernorm_forward(h, params["lnf.g"], params["lnf.b"])
    caches["lnf"] = lnf_cache
    logits, head_cache = linear_forward(hf, params["head.w"], params["head.b"])
    caches["head"] = head_cache
    return logits, caches


def backward_gpt(d_logits, caches, params, cfg):
    """Gradients for every parameter, mirroring the params dict key for key."""
    L = cfg["n_layer"]
    grads = {}
    d_hf, grads["head.w"], grads["head.b"] = linear_backward(d_logits, caches["head"])
    d_h, grads["lnf.g"], grads["lnf.b"] = layernorm_backward(d_hf, caches["lnf"])
    for i in reversed(range(L)):
        pre = f"blocks.{i}."
        ln1_cache, att_cache, ln2_cache, lin1_cache, gelu_cache, lin2_cache = caches["blocks"][i]
        # MLP branch: h = h + mlp(ln2(h))
        d_g, grads[pre + "mlp.w2"], grads[pre + "mlp.b2"] = linear_backward(d_h, lin2_cache)
        d_m1 = gelu_backward(d_g, gelu_cache)
        d_a2, grads[pre + "mlp.w1"], grads[pre + "mlp.b1"] = linear_backward(d_m1, lin1_cache)
        d_h2, grads[pre + "ln2.g"], grads[pre + "ln2.b"] = layernorm_backward(d_a2, ln2_cache)
        d_h = d_h + d_h2
        # attention branch: h = h + attn(ln1(h))
        d_a, d_wqkv, d_bqkv, d_wo, d_bo = attention_backward(d_h, att_cache)
        grads[pre + "attn.w_qkv"] = d_wqkv
        grads[pre + "attn.b_qkv"] = d_bqkv
        grads[pre + "attn.w_o"] = d_wo
        grads[pre + "attn.b_o"] = d_bo
        d_h1, grads[pre + "ln1.g"], grads[pre + "ln1.b"] = layernorm_backward(d_a, ln1_cache)
        d_h = d_h + d_h1
    # embeddings
    x, T = caches["x"], caches["T"]
    grads["wte"] = np.zeros_like(params["wte"])
    np.add.at(grads["wte"], x.reshape(-1), d_h.reshape(-1, d_h.shape[-1]))
    grads["wpe"] = np.zeros_like(params["wpe"])
    grads["wpe"][:T] = d_h.sum(axis=0)
    return grads


def loss_and_grads(params, x, y, cfg):
    logits, caches = forward_gpt(params, x, cfg)
    loss_bits, ce_cache = cross_entropy_bits_forward(logits, y)
    d_logits = cross_entropy_bits_backward(ce_cache)
    grads = backward_gpt(d_logits, caches, params, cfg)
    return loss_bits, grads


def eval_loss_bits(params, ids, cfg, rng, batches=8, batch_size=16):
    """Average loss over a few fixed-seed batches of held-out text."""
    total = 0.0
    for _ in range(batches):
        x, y = get_batch(ids, cfg["block_size"], batch_size, rng)
        logits, _ = forward_gpt(params, x, cfg)
        loss, _ = cross_entropy_bits_forward(logits, y)
        total += loss
    return total / batches


# ---------------------------------------------------------------------------
# AdamW and generation
# ---------------------------------------------------------------------------

def adamw_init(params):
    return {
        "m": {k: np.zeros_like(v) for k, v in params.items()},
        "v": {k: np.zeros_like(v) for k, v in params.items()},
    }


def adamw_step(params, grads, state, step, lr, betas=(0.9, 0.95), eps=1e-8, weight_decay=0.1):
    """In-place AdamW. Weight decay touches matrices only (ndim >= 2), the
    same rule nanoGPT applies."""
    b1, b2 = betas
    for k, p in params.items():
        g = grads[k]
        state["m"][k] = b1 * state["m"][k] + (1 - b1) * g
        state["v"][k] = b2 * state["v"][k] + (1 - b2) * (g * g)
        mhat = state["m"][k] / (1 - b1**step)
        vhat = state["v"][k] / (1 - b2**step)
        update = mhat / (np.sqrt(vhat) + eps)
        if p.ndim >= 2:
            update = update + weight_decay * p
        params[k] = p - lr * update
    return params


def generate(params, cfg, seed_ids, n_new, rng, temperature=1.0):
    """Sample n_new characters, feeding each answer back in as input."""
    ids = list(int(i) for i in seed_ids)
    T = cfg["block_size"]
    for _ in range(n_new):
        window = np.array([ids[-T:]], dtype=np.int64)
        logits, _ = forward_gpt(params, window, cfg)
        row = logits[0, -1] / max(temperature, 1e-8)
        p = softmax(row, axis=-1)
        p = p / p.sum()
        ids.append(int(rng.choice(len(p), p=p)))
    return np.array(ids, dtype=np.int64)
