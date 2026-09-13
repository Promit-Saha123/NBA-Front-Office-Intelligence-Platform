"""Baseline predictors (ml-specification §10, ml-rules: XGBoost must not be
evaluated in isolation). Each takes the training-row feature table and
returns predictions aligned to its index — same shape/contract as the
primary model, so all four can be compared under one evaluation harness.
"""

from __future__ import annotations

import pandas as pd
from sklearn.linear_model import LinearRegression

from ml.features import TARGET_COLUMN


def persistence_baseline(frame: pd.DataFrame) -> pd.Series:
    """predicted next-season raptor_total = current-season raptor_total."""
    return frame["current_raptor_total"]


def multi_season_average_baseline(frame: pd.DataFrame) -> pd.Series:
    """predicted = two-season average where a prior season exists, else current."""
    return frame["two_season_avg_raptor_total"].fillna(frame["current_raptor_total"])


_LINEAR_FEATURES = (
    "current_raptor_total",
    "current_raptor_offense",
    "current_raptor_defense",
    "current_mp",
    "seasons_of_history",
    "raptor_total_change",
    "mp_change",
)


def _impute_for_linear_model(frame: pd.DataFrame) -> pd.DataFrame:
    """scikit-learn's LinearRegression can't take NaN. Prior-season-dependent
    columns (raptor_total_change, mp_change) are missing exactly when
    has_prior_season is False (rookies); imputing them to 0 there encodes
    "assume no year-over-year change" as this baseline's explicit, documented
    choice — not a silent default, and not applied to the XGBoost model (which
    handles NaN natively and keeps has_prior_season as a real signal)."""
    out = frame[list(_LINEAR_FEATURES)].copy()
    out["raptor_total_change"] = out["raptor_total_change"].fillna(0.0)
    out["mp_change"] = out["mp_change"].fillna(0.0)
    return out


def fit_linear_regression_baseline(train: pd.DataFrame) -> LinearRegression:
    model = LinearRegression()
    model.fit(_impute_for_linear_model(train), train[TARGET_COLUMN])
    return model


def linear_regression_predict(model: LinearRegression, frame: pd.DataFrame) -> pd.Series:
    predictions = model.predict(_impute_for_linear_model(frame))
    return pd.Series(predictions, index=frame.index)
