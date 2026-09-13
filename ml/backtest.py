"""Rolling backtest and evaluation metrics (ml-specification §9, §12).

Random row-level splitting is not used (ml-rules); each fold trains on every
season strictly before the fold's target season and evaluates only on that
target season — a real rolling-origin backtest, not a single train/test split.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from scipy.stats import pearsonr, spearmanr
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from ml.baselines import (
    fit_linear_regression_baseline,
    linear_regression_predict,
    multi_season_average_baseline,
    persistence_baseline,
)
from ml.features import TARGET_COLUMN
from ml.model import fit_xgboost, predict_xgboost


def compute_metrics(actual: pd.Series, predicted: pd.Series) -> dict[str, float]:
    return {
        "mae": float(mean_absolute_error(actual, predicted)),
        "rmse": float(np.sqrt(mean_squared_error(actual, predicted))),
        "r2": float(r2_score(actual, predicted)),
        "pearson_r": float(pearsonr(actual, predicted)[0]),
        "spearman_r": float(spearmanr(actual, predicted)[0]),
        "directional_accuracy": float(
            (np.sign(predicted - actual.mean()) == np.sign(actual - actual.mean())).mean()
        ),
    }


@dataclass(frozen=True)
class FoldResult:
    target_season: int
    train_seasons: tuple[int, ...]
    model_metrics: dict[str, float]
    baseline_metrics: dict[str, dict[str, float]]
    row_count: int


def rolling_backtest(
    training_table: pd.DataFrame,
    min_train_seasons: int = 5,
) -> list[FoldResult]:
    """For each candidate target_season (in ascending order, skipping the
    first `min_train_seasons` to guarantee a real training history), train
    on every strictly-earlier target_season's rows and evaluate on this one.
    Non-overlapping by construction: a fold's train set is exactly the rows
    from all earlier folds' target seasons, never including the fold's own
    target season."""
    seasons = sorted(training_table["target_season"].unique())
    results: list[FoldResult] = []
    for i, target_season in enumerate(seasons):
        if i < min_train_seasons:
            continue
        train_seasons = tuple(seasons[:i])
        train = training_table[training_table["target_season"].isin(train_seasons)]
        test = training_table[training_table["target_season"] == target_season]
        if train.empty or test.empty:
            continue

        actual = test[TARGET_COLUMN]
        baseline_metrics = {
            "persistence": compute_metrics(actual, persistence_baseline(test)),
            "multi_season_average": compute_metrics(actual, multi_season_average_baseline(test)),
        }
        linear_model = fit_linear_regression_baseline(train)
        baseline_metrics["linear_regression"] = compute_metrics(
            actual, linear_regression_predict(linear_model, test)
        )

        xgb_model = fit_xgboost(train)
        model_metrics = compute_metrics(actual, predict_xgboost(xgb_model, test))

        results.append(
            FoldResult(
                target_season=int(target_season),
                train_seasons=train_seasons,
                model_metrics=model_metrics,
                baseline_metrics=baseline_metrics,
                row_count=len(test),
            )
        )
    return results


def summarize_folds(folds: list[FoldResult]) -> dict[str, float]:
    """Row-count-weighted average of each fold's primary-model metrics —
    the headline number reported alongside the per-fold detail, never in
    place of it (ml-specification §12: "do not present only the best metric")."""
    if not folds:
        raise ValueError("No backtest folds to summarize")
    total_rows = sum(f.row_count for f in folds)
    summary: dict[str, float] = {}
    for key in folds[0].model_metrics:
        summary[key] = sum(f.model_metrics[key] * f.row_count for f in folds) / total_rows
    return summary
