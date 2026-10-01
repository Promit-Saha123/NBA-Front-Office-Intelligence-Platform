"""Tests for ml.baselines and ml.model (ml-rules: XGBoost must not be
evaluated in isolation — each baseline must actually run and produce a
sane, checkable prediction)."""

from __future__ import annotations

import pandas as pd

from ml.baselines import (
    fit_linear_regression_baseline,
    linear_regression_predict,
    multi_season_average_baseline,
    persistence_baseline,
)
from ml.features import build_feature_table
from ml.model import fit_xgboost, predict_xgboost


def _training_table() -> pd.DataFrame:
    rows = []
    for season, total in zip(range(2010, 2020), [float(i % 5) for i in range(10)], strict=True):
        rows.append(
            {
                "player_id": "a",
                "player_name": "a",
                "season": season,
                "mp": 2000.0,
                "raptor_total": total,
                "raptor_offense": total / 2,
                "raptor_defense": total / 2,
            }
        )
    raw = pd.DataFrame(rows)
    table = build_feature_table(raw)
    return table[table["target_raptor_total"].notna()].reset_index(drop=True)


def test_persistence_baseline_predicts_current_value() -> None:
    train = _training_table()
    predicted = persistence_baseline(train)
    assert (predicted == train["current_raptor_total"]).all()


def test_multi_season_average_baseline_falls_back_to_current_when_no_prior() -> None:
    train = _training_table()
    rookie_row = train[~train["has_prior_season"]]
    predicted = multi_season_average_baseline(rookie_row)
    assert (predicted == rookie_row["current_raptor_total"]).all()


def test_linear_regression_baseline_fits_and_predicts() -> None:
    train = _training_table()
    model = fit_linear_regression_baseline(train)
    predictions = linear_regression_predict(model, train)
    assert len(predictions) == len(train)
    assert predictions.notna().all()


def test_xgboost_fits_and_predicts_deterministically() -> None:
    train = _training_table()
    model = fit_xgboost(train)
    first = predict_xgboost(model, train)
    second = predict_xgboost(model, train)
    pd.testing.assert_series_equal(first, second)


def test_xgboost_handles_rookie_rows_with_missing_prior_season() -> None:
    train = _training_table()
    rookie_rows = train[~train["has_prior_season"]]
    model = fit_xgboost(train)
    predictions = predict_xgboost(model, rookie_rows)
    assert predictions.notna().all()
