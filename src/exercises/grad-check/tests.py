# Tests for the gradient check. The function under test is a sum of squares,
# whose slope at every element is exactly twice the element, so every
# expected value is a literal. Failure messages are teaching content
# (CLAUDE.md).

import numpy as np
from submission import numeric_grad, grad_check


def sum_of_squares(x):
    return float((x * x).sum())


X = np.array([[1.0, -2.0],
              [0.5, 3.0]])
SLOPES = 2 * X


def test_numeric_grad_shape():
    """numeric_grad: one slope per element, the shape of x"""
    got = numeric_grad(sum_of_squares, X.copy())
    assert isinstance(got, np.ndarray), (
        f"numeric_grad must return a NumPy array, got {type(got).__name__}. Start from "
        "np.zeros_like(x, dtype=np.float64) and fill it through .flat[i]."
    )
    assert got.shape == X.shape, (
        f"the gradient has the shape of x, {X.shape}; got {got.shape}. x.flat[i] and "
        "g.flat[i] walk any shape as if it were one long row, so the loop is the same "
        "for a row, a table or a batch."
    )


def test_numeric_grad_values():
    """numeric_grad: the slope of a sum of squares is twice each element"""
    got = numeric_grad(sum_of_squares, X.copy())
    assert np.allclose(got, SLOPES, atol=1e-6), (
        f"for x = {X.tolist()} the slopes are 2x = {SLOPES.tolist()}, got "
        f"{np.round(got, 6).tolist()}. Raise ONE element by eps, evaluate f, lower the "
        "same element by eps, evaluate f, and divide the difference by 2 * eps. If your "
        "numbers are all the same, you nudged the whole array rather than one element."
    )


def test_numeric_grad_restores_x():
    """numeric_grad: leaves x exactly as it found it"""
    x = X.copy()
    numeric_grad(sum_of_squares, x)
    assert np.array_equal(x, X), (
        f"x came back as {x.tolist()} instead of {X.tolist()}. Put each element back "
        "(x.flat[i] = old) after its two nudges; a check that changes the thing it is "
        "checking would move every parameter it visits."
    )


def test_numeric_grad_one_dim():
    """numeric_grad: works on a plain row too"""
    row = np.array([3.0, -1.0, 0.0])
    got = numeric_grad(sum_of_squares, row)
    assert got.shape == (3,) and np.allclose(got, [6.0, -2.0, 0.0], atol=1e-6), (
        f"for the row [3, -1, 0] the slopes are [6, -2, 0], got "
        f"{np.round(got, 6).tolist() if isinstance(got, np.ndarray) else got}."
    )


def test_grad_check_right_formula():
    """grad_check: a correct gradient scores far below 1e-6"""
    err = grad_check(sum_of_squares, X.copy(), SLOPES)
    assert isinstance(err, float), (
        f"grad_check returns one plain float, got {type(err).__name__}. Take the max "
        "over every element and wrap it in float(...)."
    )
    assert err < 1e-6, (
        f"the exact gradient 2x should score a relative error near 1e-10, got {err}. "
        "The error is |numeric - claimed| divided by |numeric| + |claimed| + 1e-12, "
        "largest element wins."
    )


def test_grad_check_wrong_formula():
    """grad_check: a gradient 1.4427 times too big is caught"""
    err = grad_check(sum_of_squares, X.copy(), SLOPES * 1.4427)
    assert 0.15 < err < 0.2, (
        f"a claimed gradient 1.4427 times the true one (the ln 2 mistake) has relative "
        f"error (1.4427 - 1) / (1.4427 + 1) = 0.1812 at every element, got {err}. If "
        "yours is near 0, you compared the claim with itself; if it is near 0.44, you "
        "divided by |numeric| alone rather than by the sum of both magnitudes."
    )


def test_grad_check_zero_claim():
    """grad_check: a claim of all zeros scores 1"""
    err = grad_check(sum_of_squares, X.copy(), np.zeros_like(X))
    assert abs(err - 1.0) < 1e-6, (
        f"claiming a gradient of zeros where the slopes are {SLOPES.tolist()} is a "
        f"relative error of 1 (everything measured, nothing claimed), got {err}."
    )
