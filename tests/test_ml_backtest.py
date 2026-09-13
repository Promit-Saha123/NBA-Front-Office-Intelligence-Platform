"""Tests for ml.backtest — rolling, non-overlapping backtest folds."""

from __future__ import annotations

import pandas as pd

from ml.backtest import compute_metrics, rolling_backtest, summarize_folds
from ml.features import build_feature_table


def _training_table(num_seasons: int = 12) -> pd.DataFrame:
    """Two players per season (correlation metrics need >= 2 points per fold's
    test set — a single-player fixture would make pearsonr/spearmanr error)."""
    start = 2010
    rows = []
    for player_id, offset in (("a", 0), ("b", 2)):
        for i in range(num_seasons):
            total = float((i + offset) % 4)
            rows.append(
                {
                    "player_id": player_id,
                    "player_name": player_id,
                    "season": start + i,
                    "mp": 2000.0,
                    "raptor_total": total,
                    "raptor_offense": total / 2,
                    "raptor_defense": total / 2,
                }
            )
    table = build_feature_table(pd.DataFrame(rows))
    return table[table["target_raptor_total"].notna()].reset_index(drop=True)


def test_compute_metrics_returns_all_required_keys() -> None:
    actual = pd.Series([1.0, 2.0, 3.0, 4.0])
    predicted = pd.Series([1.1, 2.1, 2.9, 4.2])
    metrics = compute_metrics(actual, predicted)
    for key in ("mae", "rmse", "r2", "pearson_r", "spearman_r", "directional_accuracy"):
        assert key in metrics


def test_folds_are_non_overlapping_and_ordered() -> None:
    train = _training_table()
    folds = rolling_backtest(train, min_train_seasons=3)
    assert len(folds) > 0
    seen_target_seasons: set[int] = set()
    for fold in folds:
        assert fold.target_season not in fold.train_seasons
        assert all(season < fold.target_season for season in fold.train_seasons)
        assert fold.target_season not in seen_target_seasons
        seen_target_seasons.add(fold.target_season)
    # Strictly increasing target seasons across folds — a real rolling origin.
    target_seasons = [f.target_season for f in folds]
    assert target_seasons == sorted(target_seasons)


def test_every_fold_reports_all_three_baselines_plus_the_model() -> None:
    train = _training_table()
    folds = rolling_backtest(train, min_train_seasons=3)
    expected_baselines = {"persistence", "multi_season_average", "linear_regression"}
    for fold in folds:
        assert set(fold.baseline_metrics) == expected_baselines
        assert "mae" in fold.model_metrics


def test_summarize_folds_is_row_count_weighted() -> None:
    train = _training_table()
    folds = rolling_backtest(train, min_train_seasons=3)
    summary = summarize_folds(folds)
    assert "mae" in summary
    assert summary["mae"] >= 0


def test_too_little_history_produces_no_folds() -> None:
    train = _training_table(num_seasons=3)
    folds = rolling_backtest(train, min_train_seasons=10)
    assert folds == []
