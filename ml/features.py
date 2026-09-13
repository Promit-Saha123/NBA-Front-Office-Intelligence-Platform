"""Feature table for the RAPTOR-trend projection model (decision 0013).

One row = one player during one completed season ("feature_season"). All
features are computed from feature_season and earlier only — no column here
is ever built from a season later than feature_season (docs/ml-specification.md
§8's leakage rule). The optional target ("target_raptor_total") is that same
player's raptor_total in feature_season + 1, kept in separate columns so the
same feature-generation path serves both training (rows with a known target)
and inference (rows without one yet) — ml-rules: "training and inference must
use the same feature-generation code."
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from backend.domain.errors import MissingRequiredColumnError, MissingSourceFileError

FEATURE_SCHEMA_VERSION = "raptor-trend-features-v1"

_RAW_REQUIRED_COLUMNS = (
    "player_id",
    "player_name",
    "season",
    "mp",
    "raptor_total",
    "raptor_offense",
    "raptor_defense",
)

# Every feature column a model is trained or queried on. Order matters for
# the linear-regression baseline; XGBoost is column-name-based so order is
# cosmetic there, but keeping one canonical order avoids silent drift.
FEATURE_COLUMNS = (
    "current_raptor_total",
    "current_raptor_offense",
    "current_raptor_defense",
    "current_mp",
    "seasons_of_history",
    "has_prior_season",
    "prior_raptor_total",
    "prior_mp",
    "raptor_total_change",
    "mp_change",
    "two_season_avg_raptor_total",
)

TARGET_COLUMN = "target_raptor_total"


def load_raw_player_seasons(path: Path) -> pd.DataFrame:
    """Load the pinned RAPTOR by-player snapshot. Raises on missing file/columns
    or duplicate (player_id, season) rows — never silently pick one (data-rules)."""
    if not path.is_file():
        raise MissingSourceFileError(f"Required source file not found: {path}")
    frame = pd.read_csv(path)
    missing = [c for c in _RAW_REQUIRED_COLUMNS if c not in frame.columns]
    if missing:
        raise MissingRequiredColumnError(f"{path} is missing required columns: {missing}")
    duplicate_mask = frame.duplicated(subset=["player_id", "season"], keep=False)
    if duplicate_mask.any():
        bad = frame.loc[duplicate_mask, ["player_id", "season"]].drop_duplicates()
        raise MissingRequiredColumnError(
            f"{path} has duplicate (player_id, season) rows, expected exactly one "
            f"per player-season: {bad.to_dict('records')}"
        )
    return frame


def build_feature_table(raw: pd.DataFrame) -> pd.DataFrame:
    """Build one row per (player_id, feature_season) with engineered features
    and, where a next-season row exists, the target. Missing prior-season
    history (rookies, or a gap season) is NaN plus the ``has_prior_season``
    indicator — never silently imputed to zero (ml-specification §14: zero
    would falsely imply a real, measured season-over-season change).

    No age/experience-in-years feature: this project has no player age field
    anywhere (confirmed absent from the RAPTOR snapshot and every other
    licensed source) — ``seasons_of_history`` (count of prior seasons with a
    RAPTOR row, an honest proxy for tenure, not age) stands in, documented as
    such rather than fabricating an age value.
    """
    base_columns = ["player_id", "season", "mp", "raptor_total", "raptor_offense", "raptor_defense"]
    base = raw[base_columns].copy()
    base = base.sort_values(["player_id", "season"]).reset_index(drop=True)

    current = base.rename(
        columns={
            "season": "feature_season",
            "mp": "current_mp",
            "raptor_total": "current_raptor_total",
            "raptor_offense": "current_raptor_offense",
            "raptor_defense": "current_raptor_defense",
        }
    )
    current["seasons_of_history"] = base.groupby("player_id").cumcount() + 1

    prior = base.rename(
        columns={
            "mp": "prior_mp",
            "raptor_total": "prior_raptor_total",
        }
    )[["player_id", "season", "prior_mp", "prior_raptor_total"]]
    prior["feature_season"] = prior["season"] + 1
    prior = prior.drop(columns=["season"])

    target = base.rename(columns={"raptor_total": TARGET_COLUMN})
    target = target[["player_id", "season", TARGET_COLUMN]]
    target["feature_season"] = target["season"] - 1
    target["target_season"] = target["season"]
    target = target.drop(columns=["season"])

    table = current.merge(prior, on=["player_id", "feature_season"], how="left")
    table = table.merge(target, on=["player_id", "feature_season"], how="left")

    table["has_prior_season"] = table["prior_raptor_total"].notna()
    table["raptor_total_change"] = table["current_raptor_total"] - table["prior_raptor_total"]
    table["mp_change"] = table["current_mp"] - table["prior_mp"]
    avg_columns = ["current_raptor_total", "prior_raptor_total"]
    table["two_season_avg_raptor_total"] = table[avg_columns].mean(axis=1)

    ordered = ["player_id", "feature_season", "target_season", *FEATURE_COLUMNS, TARGET_COLUMN]
    return table[ordered]


def training_rows(table: pd.DataFrame) -> pd.DataFrame:
    """Rows with a known target — the only rows usable for training/backtesting.
    Rows without one (the most recent season on record) are inference-only."""
    return table[table[TARGET_COLUMN].notna()].reset_index(drop=True)


def assert_no_leakage(table: pd.DataFrame) -> None:
    """docs/ml-specification.md §8: feature_season < target_season wherever a
    target exists. Called by tests and by the training entry point."""
    with_target = table[table["target_season"].notna()]
    if not (with_target["feature_season"] < with_target["target_season"]).all():
        raise AssertionError("Leakage check failed: a row has target_season <= feature_season")
