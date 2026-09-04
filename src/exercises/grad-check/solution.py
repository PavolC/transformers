# Reference solution.


def numeric_grad(f, x, eps=1e-5):
    """The slope of f at every element of x, measured by nudging."""
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
    """Largest relative error between the nudged gradient and the claimed one."""
    numeric = numeric_grad(f, x, eps)
    return float(np.max(np.abs(numeric - claimed) / (np.abs(numeric) + np.abs(claimed) + 1e-12)))
