"""API contract tests for GET /seasons/{season}/players/{player_id}/projection
(decision 0013's RAPTOR-trend model, exposed read-only, standalone from the
scenario engine).

Uses FastAPI's TestClient against the real app, same as
tests/test_api_scenarios.py — no live server, no network. The real model
artifact is gitignored and may not exist in this environment (CI, a fresh
clone), so these tests never depend on one: the 503 path needs no artifact
at all, and the 200/404 paths inject a tiny throwaway trained artifact
directly into the app's lazy projector_cache (same technique
tests/test_ml_inference.py uses to build one, see _train_and_save_test_artifact
there) rather than touching the real ml/artifacts/ directory.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.api.app import app
from ml.artifact import (
    ModelArtifactNotFoundError,
    ModelMetadata,
    save_artifact,
    set_active_model_version,
)
from ml.features import build_feature_table
from ml.inference import RaptorTrendProjector
from ml.model import HYPERPARAMETERS, fit_xgboost

SEASON_LABEL = "2014-15"  # feature_season end_year 2015, per parse_season_label


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        app.state.nba.projector_cache.clear()
        yield test_client
        app.state.nba.projector_cache.clear()


def _write_raw_csv(path: Path) -> None:
    rows = [
        {
            "player_id": "testplayer01",
            "player_name": "Test Player",
            "season": season,
            "mp": 2000.0,
            "raptor_total": float(i),
            "raptor_offense": float(i) / 2,
            "raptor_defense": float(i) / 2,
        }
        for i, season in enumerate(range(2010, 2020))
    ]
    pd.DataFrame(rows).to_csv(path, index=False)


def _build_test_projector(tmp_path: Path) -> RaptorTrendProjector:
    raw_csv = tmp_path / "historical_RAPTOR_by_player.csv"
    _write_raw_csv(raw_csv)
    artifacts_dir = tmp_path / "artifacts"
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
    return RaptorTrendProjector(artifacts_dir=artifacts_dir, raptor_snapshot_dir=tmp_path)


def test_no_trained_model_returns_503(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    def _raise(*args: object, **kwargs: object) -> RaptorTrendProjector:
        raise ModelArtifactNotFoundError("no active model in this environment")

    monkeypatch.setattr("backend.api.app.RaptorTrendProjector", _raise)

    response = client.get(f"/seasons/{SEASON_LABEL}/players/curryst01/projection")

    assert response.status_code == 503
    assert response.json()["code"] == "MODEL_ARTIFACT_NOT_FOUND"


def test_successful_projection_has_expected_contract_fields(
    client: TestClient, tmp_path: Path
) -> None:
    app.state.nba.projector_cache["active"] = _build_test_projector(tmp_path)

    response = client.get(f"/seasons/{SEASON_LABEL}/players/testplayer01/projection")

    assert response.status_code == 200
    body = response.json()
    assert body["season"] == SEASON_LABEL
    assert body["player_id"] == "testplayer01"
    assert body["target_season"] == "2015-16"
    assert isinstance(body["predicted_raptor_total"], float)
    assert body["model_version"] == "test-projector-v1"
    assert body["data_version"] == "test-data-v1"
    assert body["feature_schema_version"] == "raptor-trend-features-v1"
    assert body["contribution_epistemic_type"] == "model_prediction"
    assert "prediction_timestamp" in body


def test_unknown_player_returns_404(client: TestClient, tmp_path: Path) -> None:
    app.state.nba.projector_cache["active"] = _build_test_projector(tmp_path)

    response = client.get(f"/seasons/{SEASON_LABEL}/players/nonexistent-player/projection")

    assert response.status_code == 404
    assert response.json()["code"] == "PLAYER_PROJECTION_NOT_FOUND"


def test_unsupported_season_returns_422_before_touching_the_model(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def _fail_if_called(*args: object, **kwargs: object) -> RaptorTrendProjector:
        raise AssertionError("projector should never be constructed for an unsupported season")

    monkeypatch.setattr("backend.api.app.RaptorTrendProjector", _fail_if_called)

    response = client.get("/seasons/1899-00/players/curryst01/projection")

    assert response.status_code == 422
    assert response.json()["code"] == "UNSUPPORTED_SEASON"
