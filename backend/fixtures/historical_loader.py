"""Historical fixture loader for the pinned FiveThirtyEight RAPTOR snapshot.

Loads only the local pinned snapshot audited in
docs/data-audits/fivethirtyeight-raptor-audit.md. No network access; raw
source files under data/raw/ are read, never modified.

Only the 2014-15 regular season is supported in this slice. Team-outcome data
(nba-elo) is deliberately not loaded here: no domain model in the free-MVP
scenario slice needs wins/losses, and win conversion is not yet an approved
methodology (decision 0007 §10). A future slice that adds win conversion will
need a small team-code crosswalk — RAPTOR uses "CHA" for the Charlotte
Hornets in 2014-15, nba-elo uses "CHO" — documented here so it is not
rediscovered from scratch.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from backend.domain.errors import (
    IncompatibleDataVersionError,
    MissingRequiredColumnError,
    MissingSourceFileError,
    UnsupportedSeasonError,
)
from backend.domain.models import (
    Player,
    PlayerSeason,
    RosterMember,
    Season,
    Team,
    TeamRoster,
    parse_season_label,
)

SUPPORTED_SEASON_LABELS = frozenset({"2014-15"})

_REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_RAPTOR_SNAPSHOT_DIR = (
    _REPO_ROOT / "data" / "raw" / "fivethirtyeight-nba-raptor" / "2026-07-19"
)

EXPECTED_RAPTOR_DATA_VERSION = "fivethirtyeight-nba-raptor-2022-11-29"

_BY_TEAM_REQUIRED_COLUMNS = (
    "player_id",
    "player_name",
    "season",
    "season_type",
    "team",
    "mp",
    "poss",
    "raptor_total",
)
_BY_PLAYER_REQUIRED_COLUMNS = ("player_id", "player_name", "season", "mp", "poss", "raptor_total")


@dataclass(frozen=True)
class HistoricalSeasonData:
    """Everything the scenario domain needs for one supported historical season."""

    season: Season
    rosters: Mapping[str, TeamRoster]
    player_seasons: Mapping[str, PlayerSeason]
    contribution_values: Mapping[str, float]
    data_version: str
    attribution: str
    source_license: str


def load_historical_season(
    season_label: str,
    snapshot_dir: Path = DEFAULT_RAPTOR_SNAPSHOT_DIR,
) -> HistoricalSeasonData:
    """Load one supported historical season from the pinned RAPTOR snapshot.

    Raises UnsupportedSeasonError, MissingSourceFileError,
    MissingRequiredColumnError, or IncompatibleDataVersionError.
    """
    if season_label not in SUPPORTED_SEASON_LABELS:
        raise UnsupportedSeasonError(
            f"Season {season_label!r} is not supported by this loader; "
            f"supported seasons: {sorted(SUPPORTED_SEASON_LABELS)}"
        )
    try:
        season = parse_season_label(season_label)
    except ValueError as exc:
        raise UnsupportedSeasonError(str(exc)) from exc

    manifest = _read_manifest(snapshot_dir / "manifest.json")
    data_version = _require_manifest_field(manifest, "data_version", snapshot_dir)
    if data_version != EXPECTED_RAPTOR_DATA_VERSION:
        raise IncompatibleDataVersionError(
            f"Expected RAPTOR data version {EXPECTED_RAPTOR_DATA_VERSION!r}, "
            f"found {data_version!r} in {snapshot_dir / 'manifest.json'}"
        )
    attribution = _require_manifest_field(manifest, "attribution", snapshot_dir)
    source_license = _require_manifest_field(manifest, "license", snapshot_dir)

    by_team = _read_csv(snapshot_dir / "historical_RAPTOR_by_team.csv", _BY_TEAM_REQUIRED_COLUMNS)
    by_player = _read_csv(
        snapshot_dir / "historical_RAPTOR_by_player.csv", _BY_PLAYER_REQUIRED_COLUMNS
    )

    rosters = _build_rosters(by_team, season)
    player_seasons, contribution_values = _build_player_seasons(by_player, season)

    return HistoricalSeasonData(
        season=season,
        rosters=rosters,
        player_seasons=player_seasons,
        contribution_values=contribution_values,
        data_version=data_version,
        attribution=attribution,
        source_license=source_license,
    )


def _as_float(value: object) -> float:
    """Narrow a pandas itertuples() cell (typed as a broad union by pandas-stubs) to float."""
    return float(value)  # type: ignore[arg-type]


def _as_int(value: object) -> int:
    """Narrow a pandas itertuples() cell (typed as a broad union by pandas-stubs) to int."""
    return int(value)  # type: ignore[call-overload,no-any-return]


def _read_manifest(manifest_path: Path) -> dict[str, object]:
    if not manifest_path.is_file():
        raise MissingSourceFileError(f"Manifest not found: {manifest_path}")
    with manifest_path.open(encoding="utf-8") as handle:
        data: dict[str, object] = json.load(handle)
    return data


def _require_manifest_field(manifest: dict[str, object], field: str, snapshot_dir: Path) -> str:
    if field not in manifest:
        raise MissingRequiredColumnError(
            f"Manifest at {snapshot_dir / 'manifest.json'} is missing required field {field!r}"
        )
    return str(manifest[field])


def _read_csv(path: Path, required_columns: tuple[str, ...]) -> pd.DataFrame:
    if not path.is_file():
        raise MissingSourceFileError(f"Required source file not found: {path}")
    frame = pd.read_csv(path)
    missing = [column for column in required_columns if column not in frame.columns]
    if missing:
        raise MissingRequiredColumnError(f"{path} is missing required columns: {missing}")
    return frame


def _build_rosters(by_team: pd.DataFrame, season: Season) -> dict[str, TeamRoster]:
    regular_season = by_team[
        (by_team["season"] == season.source_value) & (by_team["season_type"] == "RS")
    ].sort_values(["team", "player_id"])

    rosters: dict[str, TeamRoster] = {}
    for team_id, rows in regular_season.groupby("team", sort=True):
        team = Team(internal_team_id=str(team_id), season=season)
        members = tuple(
            RosterMember(
                player=Player(
                    internal_player_id=str(row.player_id), name=str(row.player_name)
                ),
                team=team,
                season=season,
                minutes=_as_float(row.mp),
                possessions=_as_int(row.poss),
            )
            for row in rows.itertuples(index=False)
        )
        rosters[str(team_id)] = TeamRoster(team=team, season=season, members=members)
    return rosters


def _build_player_seasons(
    by_player: pd.DataFrame, season: Season
) -> tuple[dict[str, PlayerSeason], dict[str, float]]:
    season_rows = by_player[by_player["season"] == season.source_value].sort_values("player_id")

    player_seasons: dict[str, PlayerSeason] = {}
    contribution_values: dict[str, float] = {}
    for row in season_rows.itertuples(index=False):
        player_id = str(row.player_id)
        player = Player(internal_player_id=player_id, name=str(row.player_name))
        player_seasons[player_id] = PlayerSeason(
            player=player,
            season=season,
            minutes=_as_float(row.mp),
            possessions=_as_int(row.poss),
        )
        contribution_values[player_id] = _as_float(row.raptor_total)
    return player_seasons, contribution_values
