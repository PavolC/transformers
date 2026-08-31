# Validate the reference scribe before it is allowed near a browser tab:
# every parameter's analytic gradient against central differences, then a
# single-batch overfit that must drive the loss toward zero.
#
# Run: python3 tools/spike/native_check.py

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src" / "python"))
import reference_scribe as rs


def grad_check():
    cfg = {"vocab_size": 11, "block_size": 5, "n_embd": 8, "n_head": 2, "n_layer": 2}
    rng = np.random.default_rng(7)
    params = rs.init_params(cfg, rng)
    x = rng.integers(0, cfg["vocab_size"], size=(2, cfg["block_size"]))
    y = rng.integers(0, cfg["vocab_size"], size=(2, cfg["block_size"]))

    _, grads = rs.loss_and_grads(params, x, y, cfg)

    eps = 1e-5
    worst = ("", 0.0)
    coord_rng = np.random.default_rng(11)
    for name, p in params.items():
        flat = p.reshape(-1)
        n_probe = min(6, flat.size)
        idxs = coord_rng.choice(flat.size, size=n_probe, replace=False)
        for idx in idxs:
            orig = flat[idx]
            flat[idx] = orig + eps
            lp, _ = rs.cross_entropy_bits_forward(rs.forward_gpt(params, x, cfg)[0], y)
            flat[idx] = orig - eps
            lm, _ = rs.cross_entropy_bits_forward(rs.forward_gpt(params, x, cfg)[0], y)
            flat[idx] = orig
            numeric = (lp - lm) / (2 * eps)
            analytic = grads[name].reshape(-1)[idx]
            # The loss is O(1) in float64, so (lp - lm) carries ~1e-15 of
            # cancellation noise and the numeric slope ~1e-15/(2*eps) = 5e-11
            # of absolute noise. The check needs an absolute floor at that
            # scale as well as a relative band, or a tiny true gradient fails
            # on the probe's own arithmetic rather than on the model's.
            err = abs(numeric - analytic)
            bound = 1e-9 + 1e-5 * max(abs(numeric), abs(analytic))
            score = err / bound
            if score > worst[1]:
                worst = (f"{name}[{idx}]", score)
            if err > bound:
                print(f"FAIL grad check {name}[{idx}]: analytic {analytic:.6e} numeric {numeric:.6e} err {err:.2e} bound {bound:.2e}")
                return False
    print(f"PASS grad check: every probed coordinate within atol 1e-9 + rtol 1e-5 (worst {worst[0]} at {worst[1]:.2f} of bound)")
    return True


def overfit_one_batch():
    cfg = {"vocab_size": 11, "block_size": 8, "n_embd": 16, "n_head": 2, "n_layer": 2}
    rng = np.random.default_rng(3)
    params = rs.init_params(cfg, rng)
    x = rng.integers(0, cfg["vocab_size"], size=(4, cfg["block_size"]))
    # Every position's target is the row's first character. Fully learnable
    # (position 0 predicts its own input; later positions must attend back),
    # unlike random targets, where two rows sharing a first character but
    # not a first target make position 0 irreducibly uncertain.
    y = np.repeat(x[:, :1], cfg["block_size"], axis=1)
    state = rs.adamw_init(params)
    first = None
    loss = None
    for step in range(1, 401):
        loss, grads = rs.loss_and_grads(params, x, y, cfg)
        if first is None:
            first = loss
        # weight_decay off: decay pulls weights toward zero, which puts a
        # floor under pure memorization, and memorization is the whole test.
        rs.adamw_step(params, grads, state, step, lr=3e-3, weight_decay=0.0)
    print(f"overfit one batch: loss {first:.3f} -> {loss:.4f} bits after 400 steps")
    ok = loss < 0.05
    print("PASS single-batch overfit" if ok else "FAIL single-batch overfit: memorization should reach ~0")
    return ok


if __name__ == "__main__":
    ok = grad_check() and overfit_one_batch()
    sys.exit(0 if ok else 1)
