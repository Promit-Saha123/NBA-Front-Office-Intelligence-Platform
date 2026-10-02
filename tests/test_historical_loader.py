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


def test_offense_and_defense_values_loaded() -> None:
    # afflaar01's season-2015 raptor_offense/raptor_defense, verified directly against the CSV.
    season_data = load_historical_season("2014-15")
    assert season_data.offense_values["afflaar01"] == pytest.approx(-0.985917143, abs=1e-6)
    assert season_data.defense_values["afflaar01"] == pytest.approx(-1.673151448, abs=1e-6)


def test_expected_data_version_is_enforced(tmp_path: Path) -> None:
    _write_minimal_snapshot(tmp_path, data_version="some-other-data-version")
    with pytest.raises(IncompatibleDataVersionError):
        load_historical_season("2014-15", snapshot_dir=tmp_path)


def test_unsupported_season_fails_clearly() -> None:
    # 2022-23 is real but deliberately outside SUPPORTED_SEASON_LABELS — the
    # pinned snapshot's own RS data ends at 2021-22 (decision 0015).
    with pytest.raises(UnsupportedSeasonError):
        load_historical_season("2022-23")


# --- Integration tests against the real pinned 2015-16 snapshot ---


def test_2015_16_loads_successfully() -> None:
    season_data = load_historical_season("2015-16")
    assert season_data.season.label == "2015-16"
    assert season_data.season.source_value == 2016
    assert season_data.data_version == EXPECTED_RAPTOR_DATA_VERSION


def test_2015_16_expected_teams_exist() -> None:
    season_data = load_historical_season("2015-16")
    expected_teams = {
        "ATL", "BOS", "BRK", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
        "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
        "OKC", "ORL", "PHI", "PHO", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
    }  # fmt: skip
    assert set(season_data.rosters) == expected_teams
    assert len(season_data.rosters) == 30
    # Verified against the pinned CSV: 528 RS by-team rows for season 2016.
    total_stint_rows = sum(len(roster.members) for roster in season_data.rosters.values())
    assert total_stint_rows == 528


def test_2015_16_expected_roster_record_exists() -> None:
    season_data = load_historical_season("2015-16")
    gsw = season_data.rosters["GSW"]
    assert gsw.has_player("curryst01")
    assert gsw.member_minutes("curryst01") == 2700.0


def test_2015_16_offense_and_defense_values_loaded() -> None:
    # curryst01's season-2016 raptor_offense/raptor_defense, verified directly against the CSV.
    season_data = load_historical_season("2015-16")
    assert season_data.contribution_values["curryst01"] == pytest.approx(12.487858, abs=1e-6)
    assert season_data.offense_values["curryst01"] == pytest.approx(10.379411, abs=1e-6)
    assert season_data.defense_values["curryst01"] == pytest.approx(2.108447, abs=1e-6)


# --- Full historical range (decision 0015) ---


def test_earliest_supported_season_loads_successfully() -> None:
    # 1976-77 is the ABA-merger season — the earliest RS season with complete
    # rows in the pinned snapshot, 22 teams (fewer than today's 30).
    season_data = load_historical_season("1976-77")
    assert season_data.season.label == "1976-77"
    assert len(season_data.rosters) == 22
    assert "NYN" in season_data.rosters  # New York Nets, one season before NJN


def test_latest_supported_season_loads_successfully() -> None:
    season_data = load_historical_season("2021-22")
    assert season_data.season.label == "2021-22"
    assert len(season_data.rosters) == 30


def test_season_after_pinned_range_is_unsupported() -> None:
    with pytest.raises(UnsupportedSeasonError):
        load_historical_season("2022-23")


def test_season_before_pinned_range_is_unsupported() -> None:
    with pytest.raises(UnsupportedSeasonError):
        load_historical_season("1975-76")


def test_seattle_to_oklahoma_city_relocation_boundary() -> None:
    # The SuperSonics played their final Seattle season in 2007-08, then
    # relocated and became the Thunder starting 2008-09 — same franchise,
    # different team_id, no crosswalk needed since RosterScenarioService is
    # always scoped to one season's own rosters.
    before = load_historical_season("2007-08")
    after = load_historical_season("2008-09")
    assert "SEA" in before.rosters
    assert "OKC" not in before.rosters
    assert "SEA" not in after.rosters
    assert "OKC" in after.rosters


def test_missing_source_file_fails_clearly(tmp_path: Path) -> None:
    with pytest.raises(MissingSourceFileError):
        load_historical_season("2014-15", snapshot_dir=tmp_path)


def test_missing_required_columns_fail_clearly(tmp_path: Path) -> None:
    _write_minimal_snapshot(tmp_path, drop_column="raptor_total")
    with pytest.raises(MissingRequiredColumnError):
        load_historical_season("2014-15", snapshot_dir=tmp_path)


def test_missing_offense_column_fails_clearly(tmp_path: Path) -> None:
    _write_minimal_snapshot(tmp_path, drop_column="raptor_offense")
    with pytest.raises(MissingRequiredColumnError):
        load_historical_season("2014-15", snapshot_dir=tmp_path)


def test_missing_defense_column_fails_clearly(tmp_path: Path) -> None:
    _write_minimal_snapshot(tmp_path, drop_column="raptor_defense")
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
    by_player_columns = [
        "player_id", "player_name", "season", "mp", "poss",
        "raptor_total", "raptor_offense", "raptor_defense",
    ]  # fmt: skip
    if drop_column is not None:
        by_team_columns = [c for c in by_team_columns if c != drop_column]
        by_player_columns = [c for c in by_player_columns if c != drop_column]

    (directory / "historical_RAPTOR_by_team.csv").write_text(
        ",".join(by_team_columns) + "\n", encoding="utf-8"
    )
    (directory / "historical_RAPTOR_by_player.csv").write_text(
        ",".join(by_player_columns) + "\n", encoding="utf-8"
    )
