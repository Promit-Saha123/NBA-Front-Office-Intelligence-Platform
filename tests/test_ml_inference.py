"""Tests for ml.inference — the RaptorTrendProjector serving contract."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest

from ml.artifact import ModelMetadata, save_artifact, set_active_model_version
from ml.features import build_feature_table
from ml.inference import PlayerProjectionNotFoundError, RaptorTrendProjector
from ml.model import HYPERPARAMETERS, fit_xgboost


def _write_raw_csv(path: Path) -> None:
    rows = [
        {
            "player_id": "a",
            "player_name": "a",
            "season": season,
            "mp": 2000.0,
            "raptor_total": float(i),
            "raptor_offense": float(i) / 2,
            "raptor_defense": float(i) / 2,
        }
        for i, season in enumerate(range(2010, 2020))
    ]
    pd.DataFrame(rows).to_csv(path, index=False)


def _train_and_save_test_artifact(artifacts_dir: Path, raw_csv: Path) -> None:
    raw = pd.read_csv(raw_csv)
    table = build_feature_table(raw)
    train = table[table["target_raptor_total"].notna()].reset_index(drop=True)
    model = fit_xgboost(train)
    metadata = ModelMetadata(
        model_version="test-projector-v1",
        data_version="test-data-v1",
        feature_schema_version="raptor-trend-features-v1",
        target="target_raptor_total",
        trained_at="2026-01-01T00:00:00+00:00",
        training_seasons=sorted(int(s) for s in train["feature_season"].unique()),
        validation_seasons=[],
        test_seasons=[],
        metrics={"test": {"mae": 0.0}},
        baseline_metrics={},
        hyperparameters=HYPERPARAMETERS,
    )
    save_artifact(model, metadata, artifacts_dir)
    set_active_model_version("test-projector-v1", artifacts_dir)


def test_projection_has_expected_contract_fields(tmp_path: Path) -> None:
    raw_csv = tmp_path / "historical_RAPTOR_by_player.csv"
    _write_raw_csv(raw_csv)
    artifacts_dir = tmp_path / "artifacts"
    _train_and_save_test_artifact(artifacts_dir, raw_csv)
    projector = RaptorTrendProjector(artifacts_dir=artifacts_dir, raptor_snapshot_dir=tmp_path)

    projection = projector.project("a", 2015)
    assert projection.player_id == "a"
    assert projection.feature_season == 2015
    assert projection.target_season == 2016
    assert projection.model_version == "test-projector-v1"
    assert projection.data_version == "test-data-v1"
    assert projection.feature_schema_version == "raptor-trend-features-v1"
    assert isinstance(projection.predicted_raptor_total, float)


def test_projection_is_deterministic(tmp_path: Path) -> None:
    raw_csv = tmp_path / "historical_RAPTOR_by_player.csv"
    _write_raw_csv(raw_csv)
    artifacts_dir = tmp_path / "artifacts"
    _train_and_save_test_artifact(artifacts_dir, raw_csv)
    projector = RaptorTrendProjector(artifacts_dir=artifacts_dir, raptor_snapshot_dir=tmp_path)

    first = projector.project("a", 2015).predicted_raptor_total
    second = projector.project("a", 2015).predicted_raptor_total
    assert first == second


def test_unknown_player_raises_clearly(tmp_path: Path) -> None:
    raw_csv = tmp_path / "historical_RAPTOR_by_player.csv"
    _write_raw_csv(raw_csv)
    artifacts_dir = tmp_path / "artifacts"
    _train_and_save_test_artifact(artifacts_dir, raw_csv)
    projector = RaptorTrendProjector(artifacts_dir=artifacts_dir, raptor_snapshot_dir=tmp_path)

    with pytest.raises(PlayerProjectionNotFoundError):
        projector.project("nonexistent-player", 2015)


def test_unknown_season_raises_clearly(tmp_path: Path) -> None:
    raw_csv = tmp_path / "historical_RAPTOR_by_player.csv"
    _write_raw_csv(raw_csv)
    artifacts_dir = tmp_path / "artifacts"
    _train_and_save_test_artifact(artifacts_dir, raw_csv)
    projector = RaptorTrendProjector(artifacts_dir=artifacts_dir, raptor_snapshot_dir=tmp_path)

    with pytest.raises(PlayerProjectionNotFoundError):
        projector.project("a", 1999)
