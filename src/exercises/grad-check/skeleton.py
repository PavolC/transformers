# The check every gradient in the course is held to: nudge each number, watch
# the loss, and compare the slope you measured with the slope the formula
# claimed.
#
# Contract:
# - numeric_grad(f, x, eps=1e-5):
#     f    a function of one array that returns one float (a loss).
#     x    the array to measure at; any shape.
#     eps  how far to nudge.
#   Returns a float64 array the shape of x: for every element, (f with that
#   element raised by eps minus f with it lowered by eps) over 2 * eps. Nudge
#   the array in place through x.flat[i], call f(x), and put the element back
#   before moving to the next one, so x is unchanged when you return.
#
# - grad_check(f, x, claimed, eps=1e-5):
#     claimed  an array the shape of x: the gradient a formula produced.
#   Returns one float: the largest, over every element, of
#   |numeric - claimed| / (|numeric| + |claimed| + 1e-12), the relative error.
#   A correct formula lands below 1e-6 in float64; a wrong one is off by
#   orders of magnitude.


def numeric_grad(f, x, eps=1e-5):
    """The slope of f at every element of x, measured by nudging.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement numeric_grad")


def grad_check(f, x, claimed, eps=1e-5):
    """Largest relative error between the nudged gradient and the claimed one.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement grad_check")
