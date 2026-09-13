"""Versioned model artifact storage (ml-specification §17-19, ml-rules: never
overwrite an existing model artifact). File-based registry: each model
version is one ``.joblib`` file plus one ``.metadata.json`` sidecar; an
``active_model.txt`` pointer names which version inference should load —
set explicitly, never inferred, so a bad training run can't silently become
"active" just by being the newest file on disk.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field, replace
from pathlib import Path
from typing import Any

import joblib

from backend.domain.errors import DomainError

DEFAULT_ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"


class ModelArtifactExistsError(DomainError):
    code = "MODEL_ARTIFACT_EXISTS"


class ModelArtifactNotFoundError(DomainError):
    code = "MODEL_ARTIFACT_NOT_FOUND"


class CorruptModelArtifactError(DomainError):
    code = "CORRUPT_MODEL_ARTIFACT"


@dataclass(frozen=True)
class ModelMetadata:
    model_version: str
    data_version: str
    feature_schema_version: str
    target: str
    trained_at: str
    training_seasons: list[int]
    validation_seasons: list[int]
    test_seasons: list[int]
    metrics: dict[str, dict[str, float]]
    baseline_metrics: dict[str, dict[str, float]]
    hyperparameters: dict[str, Any]
    code_commit: str = ""
    artifact_checksum: str = field(default="")


def _not_found_message(model_version: str, artifacts_dir: Path) -> str:
    return f"Model version {model_version!r} not found in {artifacts_dir}"


def artifact_paths(artifacts_dir: Path, model_version: str) -> tuple[Path, Path]:
    return (
        artifacts_dir / f"{model_version}.joblib",
        artifacts_dir / f"{model_version}.metadata.json",
    )


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def save_artifact(
    model: Any, metadata: ModelMetadata, artifacts_dir: Path = DEFAULT_ARTIFACTS_DIR
) -> None:
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    model_path, metadata_path = artifact_paths(artifacts_dir, metadata.model_version)
    if model_path.exists() or metadata_path.exists():
        raise ModelArtifactExistsError(
            f"Model version {metadata.model_version!r} already exists at {artifacts_dir} — "
            "never overwrite an existing artifact, bump the version instead"
        )
    joblib.dump(model, model_path)
    full_metadata = replace(metadata, artifact_checksum=_sha256(model_path))
    metadata_path.write_text(json.dumps(asdict(full_metadata), indent=2), encoding="utf-8")


def load_artifact(
    model_version: str, artifacts_dir: Path = DEFAULT_ARTIFACTS_DIR
) -> tuple[Any, ModelMetadata]:
    model_path, metadata_path = artifact_paths(artifacts_dir, model_version)
    if not model_path.is_file() or not metadata_path.is_file():
        raise ModelArtifactNotFoundError(_not_found_message(model_version, artifacts_dir))
    metadata = ModelMetadata(**json.loads(metadata_path.read_text(encoding="utf-8")))
    if _sha256(model_path) != metadata.artifact_checksum:
        raise CorruptModelArtifactError(
            f"Checksum mismatch for model {model_version!r} — "
            "artifact does not match its recorded checksum"
        )
    return joblib.load(model_path), metadata


def list_available_models(artifacts_dir: Path = DEFAULT_ARTIFACTS_DIR) -> list[str]:
    if not artifacts_dir.is_dir():
        return []
    names = (p.name.removesuffix(".metadata.json") for p in artifacts_dir.glob("*.metadata.json"))
    return sorted(names)


def _active_model_path(artifacts_dir: Path) -> Path:
    return artifacts_dir / "active_model.txt"


def set_active_model_version(
    model_version: str, artifacts_dir: Path = DEFAULT_ARTIFACTS_DIR
) -> None:
    """Explicit only — the caller must have already confirmed model_version exists."""
    model_path, metadata_path = artifact_paths(artifacts_dir, model_version)
    if not model_path.is_file() or not metadata_path.is_file():
        raise ModelArtifactNotFoundError(_not_found_message(model_version, artifacts_dir))
    _active_model_path(artifacts_dir).write_text(model_version, encoding="utf-8")


def get_active_model_version(artifacts_dir: Path = DEFAULT_ARTIFACTS_DIR) -> str:
    """Raises ModelArtifactNotFoundError rather than silently falling back to
    another artifact if none has been explicitly marked active (ml-specification
    §19: "do not silently fall back to another model if the configured artifact
    fails to load")."""
    path = _active_model_path(artifacts_dir)
    if not path.is_file():
        raise ModelArtifactNotFoundError(
            f"No active model set in {artifacts_dir} (missing active_model.txt)"
        )
    return path.read_text(encoding="utf-8").strip()
