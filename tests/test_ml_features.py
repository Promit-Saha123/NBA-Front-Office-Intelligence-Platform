"""Tests for ml.features — the RAPTOR-trend feature table (decision 0013)."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest

from backend.domain.errors import MissingRequiredColumnError, MissingSourceFileError
from ml.features import (
    TARGET_COLUMN,
    assert_no_leakage,
    build_feature_table,
    load_raw_player_seasons,
    training_rows,
)


def _raw(rows: list[dict[str, object]]) -> pd.DataFrame:
    return pd.DataFrame(rows)


def _row(player_id: str, season: int, raptor_total: float, mp: float = 2000.0) -> dict[str, object]:
    return {
        "player_id": player_id,
        "player_name": player_id,
        "season": season,
        "mp": mp,
        "raptor_total": raptor_total,
        "raptor_offense": raptor_total / 2,
        "raptor_defense": raptor_total / 2,
    }


def test_no_leakage_feature_season_precedes_target_season() -> None:
    raw = _raw([_row("a", 2014, 1.0), _row("a", 2015, 2.0), _row("a", 2016, 3.0)])
    table = build_feature_table(raw)
    assert_no_leakage(table)  # must not raise


def test_target_is_same_players_next_season_value() -> None:
    raw = _raw([_row("a", 2014, 1.0), _row("a", 2015, 2.5)])
    table = build_feature_table(raw)
    row = table[table["feature_season"] == 2014].iloc[0]
    assert row["target_season"] == 2015
    assert row[TARGET_COLUMN] == pytest.approx(2.5)


def test_no_target_for_most_recent_season_on_record() -> None:
    raw = _raw([_row("a", 2014, 1.0), _row("a", 2015, 2.5)])
    table = build_feature_table(raw)
    latest = table[table["feature_season"] == 2015].iloc[0]
    assert pd.isna(latest[TARGET_COLUMN])
    assert pd.isna(latest["target_season"])


def test_rookie_season_has_no_prior_and_is_flagged() -> None:
    raw = _raw([_row("a", 2014, 1.0)])
    table = build_feature_table(raw)
    row = table.iloc[0]
    assert row["has_prior_season"] is False or row["has_prior_season"] == False  # noqa: E712
    assert pd.isna(row["prior_raptor_total"])
    assert pd.isna(row["raptor_total_change"])


def test_gap_season_is_not_treated_as_prior_season() -> None:
    """A player who skipped a season (injury, out of the league) shouldn't have
    the two-seasons-ago row silently treated as "prior season"."""
    raw = _raw([_row("a", 2014, 1.0), _row("a", 2016, 5.0)])  # no 2015 row
    table = build_feature_table(raw)
    row_2016 = table[table["feature_season"] == 2016].iloc[0]
    assert row_2016["has_prior_season"] is False or row_2016["has_prior_season"] == False  # noqa: E712
    assert pd.isna(row_2016["prior_raptor_total"])


def test_seasons_of_history_counts_appearances_not_calendar_span() -> None:
    raw = _raw([_row("a", 2014, 1.0), _row("a", 2016, 2.0), _row("a", 2017, 3.0)])
    table = build_feature_table(raw)
    assert table.set_index("feature_season")["seasons_of_history"].to_dict() == {
        2014: 1,
        2016: 2,
        2017: 3,
    }


def test_training_rows_excludes_rows_without_a_target() -> None:
    raw = _raw([_row("a", 2014, 1.0), _row("a", 2015, 2.0)])
    table = build_feature_table(raw)
    train = training_rows(table)
    assert len(train) == 1
    assert train.iloc[0]["feature_season"] == 2014


def test_deterministic_output() -> None:
    raw = _raw([_row("a", 2014, 1.0), _row("a", 2015, 2.0), _row("b", 2014, 3.0)])
    first = build_feature_table(raw)
    second = build_feature_table(raw)
    pd.testing.assert_frame_equal(first, second)


def test_load_raw_rejects_duplicate_player_season_rows(tmp_path: Path) -> None:
    csv_path = tmp_path / "raptor.csv"
    pd.DataFrame(
        [_row("a", 2014, 1.0), _row("a", 2014, 2.0)]  # duplicate (player_id, season)
    ).to_csv(csv_path, index=False)
    with pytest.raises(MissingRequiredColumnError):
        load_raw_player_seasons(csv_path)


def test_load_raw_missing_file_fails_clearly(tmp_path: Path) -> None:
    with pytest.raises(MissingSourceFileError):
        load_raw_player_seasons(tmp_path / "does-not-exist.csv")


def test_load_raw_missing_column_fails_clearly(tmp_path: Path) -> None:
    csv_path = tmp_path / "raptor.csv"
    frame = pd.DataFrame([_row("a", 2014, 1.0)]).drop(columns=["raptor_total"])
    frame.to_csv(csv_path, index=False)
    with pytest.raises(MissingRequiredColumnError):
        load_raw_player_seasons(csv_path)


def test_leakage_check_raises_on_a_synthetically_corrupted_table() -> None:
    raw = _raw([_row("a", 2014, 1.0), _row("a", 2015, 2.0)])
    table = build_feature_table(raw)
    corrupted = table.copy()
    corrupted.loc[corrupted["feature_season"] == 2014, "target_season"] = 2013
    with pytest.raises(AssertionError):
        assert_no_leakage(corrupted)


# --- Integration test against the real pinned snapshot ---


def test_real_snapshot_curry_2015_predicts_from_2016_not_future_seasons() -> None:
    from backend.fixtures.historical_loader import DEFAULT_RAPTOR_SNAPSHOT_DIR

    raw = load_raw_player_seasons(DEFAULT_RAPTOR_SNAPSHOT_DIR / "historical_RAPTOR_by_player.csv")
    table = build_feature_table(raw)
    curry_2015 = table[(table["player_id"] == "curryst01") & (table["feature_season"] == 2015)]
    assert len(curry_2015) == 1
    row = curry_2015.iloc[0]
    assert row["target_season"] == 2016
    # Curry's real season-2015 (2014-15) raptor_total, verified against the pinned CSV.
    assert row["current_raptor_total"] == pytest.approx(11.038262, abs=1e-5)
