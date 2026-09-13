"""Inference contract (ml-specification §20): loads the explicitly-active
model artifact once and produces a deterministic next-season RAPTOR
projection for one player-season. Never falls back to a different model
silently (ml-specification §19) — a missing/incompatible artifact raises,
it doesn't pick another one.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from backend.domain.errors import DomainError
from backend.fixtures.historical_loader import DEFAULT_RAPTOR_SNAPSHOT_DIR
from ml.artifact import DEFAULT_ARTIFACTS_DIR, get_active_model_version, load_artifact
from ml.features import build_feature_table, load_raw_player_seasons
from ml.model import predict_xgboost


class PlayerProjectionNotFoundError(DomainError):
    code = "PLAYER_PROJECTION_NOT_FOUND"


@dataclass(frozen=True)
class PlayerProjection:
    player_id: str
    feature_season: int
    target_season: int
    predicted_raptor_total: float
    model_version: str
    data_version: str
    feature_schema_version: str
    prediction_timestamp: str


class RaptorTrendProjector:
    """Loads the active model once at construction; reuse one instance across
    requests, mirroring backend/api/app.py's load-once-at-startup pattern for
    HistoricalSeasonData/providers."""

    def __init__(
        self,
        artifacts_dir: Path = DEFAULT_ARTIFACTS_DIR,
        raptor_snapshot_dir: Path = DEFAULT_RAPTOR_SNAPSHOT_DIR,
    ) -> None:
        active_version = get_active_model_version(artifacts_dir)
        self._model, self._metadata = load_artifact(active_version, artifacts_dir)
        raw = load_raw_player_seasons(raptor_snapshot_dir / "historical_RAPTOR_by_player.csv")
        self._feature_table = build_feature_table(raw).set_index(["player_id", "feature_season"])

    def project(self, player_id: str, feature_season: int) -> PlayerProjection:
        # List-form .loc always returns a DataFrame (never a bare Series/scalar),
        # so the ambiguous-match guard below is a plain length check, not a type
        # narrowing problem.
        key_mask = self._feature_table.index.isin([(player_id, feature_season)])
        matches = self._feature_table.loc[key_mask]
        if len(matches) == 0:
            raise PlayerProjectionNotFoundError(
                f"No RAPTOR record for player {player_id!r} in season {feature_season}"
            )
        if len(matches) > 1:
            # (player_id, feature_season) is unique by construction (enforced in
            # load_raw_player_seasons) — guard anyway rather than silently taking row 0.
            raise PlayerProjectionNotFoundError(
                f"Ambiguous RAPTOR record for player {player_id!r} in season {feature_season}"
            )
        predicted = predict_xgboost(self._model, matches)
        return PlayerProjection(
            player_id=player_id,
            feature_season=feature_season,
            target_season=feature_season + 1,
            predicted_raptor_total=float(predicted.iloc[0]),
            model_version=self._metadata.model_version,
            data_version=self._metadata.data_version,
            feature_schema_version=self._metadata.feature_schema_version,
            prediction_timestamp=datetime.now(UTC).isoformat(),
        )
