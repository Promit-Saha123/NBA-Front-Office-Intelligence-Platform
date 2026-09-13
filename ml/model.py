"""XGBoost primary model (ml-specification §11). Conservative, documented
hyperparameters — not tuned against the final test season (ml-rules)."""

from __future__ import annotations

import pandas as pd
import xgboost as xgb

from ml.features import FEATURE_COLUMNS, TARGET_COLUMN

# Deliberately conservative for a ~19k-row, ~30-feature-column problem —
# starting point, not a tuned final choice (ml-specification §11).
HYPERPARAMETERS: dict[str, object] = {
    "n_estimators": 200,
    "max_depth": 4,
    "learning_rate": 0.05,
    "min_child_weight": 5,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "reg_lambda": 1.0,
    "random_state": 0,
}


def fit_xgboost(train: pd.DataFrame) -> xgb.XGBRegressor:
    model = xgb.XGBRegressor(**HYPERPARAMETERS)
    # has_prior_season is bool; xgboost handles NaN in the float feature
    # columns natively (learns a default split direction), so no imputation
    # is needed here — unlike the linear-regression baseline.
    features = train[list(FEATURE_COLUMNS)].copy()
    features["has_prior_season"] = features["has_prior_season"].astype(float)
    model.fit(features, train[TARGET_COLUMN])
    return model


def predict_xgboost(model: xgb.XGBRegressor, frame: pd.DataFrame) -> pd.Series:
    features = frame[list(FEATURE_COLUMNS)].copy()
    features["has_prior_season"] = features["has_prior_season"].astype(float)
    return pd.Series(model.predict(features), index=frame.index)
