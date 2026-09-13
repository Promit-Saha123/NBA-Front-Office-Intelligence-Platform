"""Tests for ml.artifact — versioned model storage, never overwritten."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from ml.artifact import (
    CorruptModelArtifactError,
    ModelArtifactExistsError,
    ModelArtifactNotFoundError,
    ModelMetadata,
    get_active_model_version,
    list_available_models,
    load_artifact,
    save_artifact,
    set_active_model_version,
)


def _metadata(version: str = "test-model-v1") -> ModelMetadata:
    return ModelMetadata(
        model_version=version,
        data_version="test-data-v1",
        feature_schema_version="test-features-v1",
        target="target_raptor_total",
        trained_at="2026-01-01T00:00:00+00:00",
        training_seasons=[2014, 2015],
        validation_seasons=[2016],
        test_seasons=[2017],
        metrics={"test": {"mae": 1.0}},
        baseline_metrics={"persistence": {"mae": 2.0}},
        hyperparameters={"max_depth": 4},
    )


def test_save_and_load_roundtrip(tmp_path: Path) -> None:
    model = {"weights": [1, 2, 3]}
    save_artifact(model, _metadata(), tmp_path)
    loaded_model, loaded_metadata = load_artifact("test-model-v1", tmp_path)
    assert loaded_model == model
    assert loaded_metadata.model_version == "test-model-v1"
    assert loaded_metadata.hyperparameters == {"max_depth": 4}


def test_never_overwrites_existing_artifact(tmp_path: Path) -> None:
    save_artifact({"v": 1}, _metadata(), tmp_path)
    with pytest.raises(ModelArtifactExistsError):
        save_artifact({"v": 2}, _metadata(), tmp_path)


def test_load_missing_artifact_fails_clearly(tmp_path: Path) -> None:
    with pytest.raises(ModelArtifactNotFoundError):
        load_artifact("does-not-exist", tmp_path)


def test_checksum_is_recorded_and_verified(tmp_path: Path) -> None:
    save_artifact({"v": 1}, _metadata(), tmp_path)
    metadata = json.loads((tmp_path / "test-model-v1.metadata.json").read_text())
    assert len(metadata["artifact_checksum"]) == 64  # sha256 hex digest length


def test_corrupted_artifact_fails_checksum_validation(tmp_path: Path) -> None:
    save_artifact({"v": 1}, _metadata(), tmp_path)
    (tmp_path / "test-model-v1.joblib").write_bytes(b"corrupted")
    with pytest.raises(CorruptModelArtifactError):
        load_artifact("test-model-v1", tmp_path)


def test_list_available_models(tmp_path: Path) -> None:
    save_artifact({"v": 1}, _metadata("model-a"), tmp_path)
    save_artifact({"v": 2}, _metadata("model-b"), tmp_path)
    assert list_available_models(tmp_path) == ["model-a", "model-b"]


def test_list_available_models_empty_dir_returns_empty_list(tmp_path: Path) -> None:
    assert list_available_models(tmp_path / "does-not-exist") == []


def test_active_model_must_be_set_explicitly(tmp_path: Path) -> None:
    save_artifact({"v": 1}, _metadata(), tmp_path)
    with pytest.raises(ModelArtifactNotFoundError):
        get_active_model_version(tmp_path)  # never silently falls back
    set_active_model_version("test-model-v1", tmp_path)
    assert get_active_model_version(tmp_path) == "test-model-v1"


def test_cannot_set_active_to_a_nonexistent_model(tmp_path: Path) -> None:
    with pytest.raises(ModelArtifactNotFoundError):
        set_active_model_version("ghost-model", tmp_path)
