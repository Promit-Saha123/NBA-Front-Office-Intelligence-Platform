"""Top-level training entry point (docs/ml-specification.md §27's "Initial
Deliverable" pipeline, adapted for the RAPTOR-trend target — decision 0013).

    uv run python scripts/train_raptor_trend_model.py

All backtest folds except the most recent are treated as validation (the
model-selection exercise); the single most recent target season is held out
as a true final test, evaluated once, never used to pick hyperparameters —
this run uses fixed, documented hyperparameters (ml/model.py) with no tuning
loop at all, so there is no tuning-leakage risk, but the split is kept
explicit anyway per ml-specification §9's "final test period must remain
untouched" requirement. The artifact actually saved is then retrained on
every available row (including the held-out test season) for the best
real-world model — standard practice, recorded plainly in metadata rather
than left implicit.
"""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path

from backend.fixtures.historical_loader import (
    DEFAULT_RAPTOR_SNAPSHOT_DIR,
    EXPECTED_RAPTOR_DATA_VERSION,
)
from ml.artifact import ModelMetadata, save_artifact, set_active_model_version
from ml.backtest import rolling_backtest, summarize_folds
from ml.features import (
    FEATURE_SCHEMA_VERSION,
    TARGET_COLUMN,
    assert_no_leakage,
    build_feature_table,
    load_raw_player_seasons,
    training_rows,
)
from ml.model import HYPERPARAMETERS, fit_xgboost

MODEL_VERSION = "raptor-trend-xgb-v1"


def run_training(
    raptor_snapshot_dir: Path = DEFAULT_RAPTOR_SNAPSHOT_DIR,
    min_backtest_train_seasons: int = 5,
) -> dict[str, object]:
    raw = load_raw_player_seasons(raptor_snapshot_dir / "historical_RAPTOR_by_player.csv")
    table = build_feature_table(raw)
    assert_no_leakage(table)
    train_rows = training_rows(table)

    folds = rolling_backtest(train_rows, min_train_seasons=min_backtest_train_seasons)
    if len(folds) < 2:
        raise RuntimeError(
            "Rolling backtest produced fewer than 2 folds — not enough season "
            "history for a validation fold plus a held-out test fold"
        )
    validation_folds, test_fold = folds[:-1], folds[-1]
    validation_summary = summarize_folds(validation_folds)

    final_model = fit_xgboost(train_rows)

    metadata = ModelMetadata(
        model_version=MODEL_VERSION,
        data_version=EXPECTED_RAPTOR_DATA_VERSION,
        feature_schema_version=FEATURE_SCHEMA_VERSION,
        target=TARGET_COLUMN,
        trained_at=datetime.now(UTC).isoformat(),
        training_seasons=sorted(int(s) for s in train_rows["feature_season"].unique()),
        validation_seasons=[f.target_season for f in validation_folds],
        test_seasons=[test_fold.target_season],
        metrics={"validation": validation_summary, "test": test_fold.model_metrics},
        baseline_metrics=test_fold.baseline_metrics,
        hyperparameters=HYPERPARAMETERS,
    )
    save_artifact(final_model, metadata)
    set_active_model_version(MODEL_VERSION)

    return {
        "model_version": MODEL_VERSION,
        "validation_fold_count": len(validation_folds),
        "validation_summary_metrics": validation_summary,
        "test_season": test_fold.target_season,
        "test_metrics": test_fold.model_metrics,
        "test_baseline_metrics": test_fold.baseline_metrics,
        "all_folds": [asdict(f) for f in folds],
    }


if __name__ == "__main__":
    report = run_training()
    print(json.dumps(report, indent=2))
