"""RAPTOR-trend next-season projection pipeline (decision 0013).

Not PCE: decision 0006 found real PCE infeasible without licensed box-score
data. This package predicts a player's next-season RAPTOR ``raptor_total``
from their own multi-season RAPTOR history — a narrower, honest target
buildable entirely from the already-licensed FiveThirtyEight snapshot.
"""
