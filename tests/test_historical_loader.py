"""Tests for backend.fixtures.historical_loader — offline only, no network."""

import json
from pathlib import Path

import pytest

from backend.domain.errors import (
    IncompatibleDataVersionError,
    MissingRequiredColumnError,
    MissingSourceFileError,
    UnsupportedSeasonError,
)
from backend.fixtures.historical_loader import (
    EXPECTED_RAPTOR_DATA_VERSION,
    load_historical_season,
)

# --- Integration tests against the real pinned 2014-15 snapshot ---


def test_2014_15_loads_successfully() -> None:
    season_data = load_historical_season("2014-15")
    assert season_data.season.label == "2014-15"
    assert season_data.season.source_value == 2015
    assert season_data.data_version == EXPECTED_RAPTOR_DATA_VERSION


def test_expected_teams_exist() -> None:
    season_data = load_historical_season("2014-15")
    expected_teams = {
        "ATL", "BOS", "BRK", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
        "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
        "OKC", "ORL", "PHI", "PHO", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
    }  # fmt: skip
    assert set(season_data.rosters) == expected_teams
    assert len(season_data.rosters) == 30


def test_expected_roster_records_exist() -> None:
    season_data = load_historical_season("2014-15")
    gsw = season_data.rosters["GSW"]
    assert len(gsw.members) > 0
    assert gsw.has_player("curryst01")


def test_regular_season_rows_only() -> None:
    season_data = load_historical_season("2014-15")
    total_stint_rows = sum(len(roster.members) for roster in season_data.rosters.values())
    # Verified in the 2026-07-20 audit round: 575 RS by-team rows for season 2015.
    assert total_stint_rows == 575


def test_traded_player_stints_handled_correctly() -> None:
    season_data = load_historical_season("2014-15")
    den = season_data.rosters["DEN"]
    por = season_data.rosters["POR"]
    assert den.has_player("afflaar01")
    assert por.has_player("afflaar01")
    assert den.member_minutes("afflaar01") == 1750.0
    assert por.member_minutes("afflaar01") == 752.0
    assert den.member_minutes("afflaar01") != por.member_minutes("afflaar01")


def test_deterministic_identity_mapping() -> None:
    first = load_historical_season("2014-15")
    second = load_historical_season("2014-15")
    assert set(first.rosters) == set(second.rosters)
    assert first.contribution_values == second.contribution_values
    assert first.rosters["GSW"] == second.rosters["GSW"]


def test_expected_data_version_is_enforced(tmp_path: Path) -> None:
    _write_minimal_snapshot(tmp_path, data_version="some-other-data-version")
    with pytest.raises(IncompatibleDataVersionError):
        load_historical_season("2014-15", snapshot_dir=tmp_path)


def test_unsupported_season_fails_clearly() -> None:
    with pytest.raises(UnsupportedSeasonError):
        load_historical_season("2015-16")


def test_missing_source_file_fails_clearly(tmp_path: Path) -> None:
    with pytest.raises(MissingSourceFileError):
        load_historical_season("2014-15", snapshot_dir=tmp_path)


def test_missing_required_columns_fail_clearly(tmp_path: Path) -> None:
    _write_minimal_snapshot(tmp_path, drop_column="raptor_total")
    with pytest.raises(MissingRequiredColumnError):
        load_historical_season("2014-15", snapshot_dir=tmp_path)


def _write_minimal_snapshot(
    directory: Path,
    data_version: str = EXPECTED_RAPTOR_DATA_VERSION,
    drop_column: str | None = None,
) -> None:
    manifest = {
        "data_version": data_version,
        "attribution": "Data by FiveThirtyEight, test fixture, CC BY 4.0",
        "license": "CC BY 4.0 (test fixture)",
    }
    (directory / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

    by_team_columns = [
        "player_id", "player_name", "season", "season_type", "team", "mp", "poss", "raptor_total",
    ]  # fmt: skip
    by_player_columns = ["player_id", "player_name", "season", "mp", "poss", "raptor_total"]
    if drop_column is not None:
        by_team_columns = [c for c in by_team_columns if c != drop_column]
        by_player_columns = [c for c in by_player_columns if c != drop_column]

    (directory / "historical_RAPTOR_by_team.csv").write_text(
        ",".join(by_team_columns) + "\n", encoding="utf-8"
    )
    (directory / "historical_RAPTOR_by_player.csv").write_text(
        ",".join(by_player_columns) + "\n", encoding="utf-8"
    )
