# One function: the machine that turns a row of scores into a guess list.
#
# Contract:
# - softmax(scores): scores is a NumPy array whose LAST axis holds one row of
#   scores per guess (shape (V,), or (B, T, V), or anything else with V
#   last). Return an array of the same shape where every row of the last
#   axis has been turned into probabilities: each entry e to the power of
#   its score, divided by the row's total. Every returned row sums to 1,
#   every entry sits in (0, 1], and a bigger score always means a bigger
#   probability.
#
# One hole to plug before you exponentiate. e to the power of 1000 overflows
# float64 to infinity, and infinity divided by infinity is nan, which poisons
# every row it touches. Subtracting the row's own maximum from each score
# first changes nothing about the answer (the factor e^max cancels top and
# bottom) and keeps every exponent at or below zero, where e^x cannot
# overflow. Use keepdims=True on the max and the sum so their shapes still
# line up with the row they came from.


def softmax(scores):
    """Turn each row of scores (last axis) into probabilities that sum to 1.

    Replace the raise below with your implementation.
    """
    raise NotImplementedError("implement softmax")
