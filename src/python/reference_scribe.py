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


def bigram_avg_surprise_bits(probs, ids):
    """Average surprise per character, in bits, of the counted bigram."""
    p = probs[ids[:-1], ids[1:]]
    return float(-np.log2(p).mean())


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


def cross_entropy_bits_forward(logits, targets):
    """Mean surprise in bits over every position, with its gradient's cache."""
    m = logits.max(axis=-1, keepdims=True)
    z = logits - m
    logsumexp = np.log(np.exp(z).sum(axis=-1, keepdims=True))
    logp = z - logsumexp  # natural log
    B, T, V = logits.shape
    bi = np.arange(B)[:, None]
    ti = np.arange(T)[None, :]
    picked = logp[bi, ti, targets]
    loss_bits = float(-picked.mean() / LN2)
    return loss_bits, (logp, targets)


def cross_entropy_bits_backward(cache):
    logp, targets = cache
    B, T, V = logp.shape
    probs = np.exp(logp)
    onehot = np.zeros_like(probs)
    bi = np.arange(B)[:, None]
    ti = np.arange(T)[None, :]
    onehot[bi, ti, targets] = 1.0
    return (probs - onehot) / (B * T * LN2)


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
