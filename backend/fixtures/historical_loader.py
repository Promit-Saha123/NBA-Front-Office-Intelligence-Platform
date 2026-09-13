"""Historical fixture loader for the pinned FiveThirtyEight RAPTOR snapshot.

Loads only the local pinned snapshot audited in
docs/data-audits/fivethirtyeight-raptor-audit.md. No network access; raw
source files under data/raw/ are read, never modified.

Only the regular seasons in SUPPORTED_SEASON_LABELS are supported — every RS
season the pinned snapshot has complete team/player rows for, 1976-77 through
2021-22 (decision 0015). Team-outcome data (nba-elo) is deliberately not
loaded here: no domain model in the free-MVP scenario slice needs wins/
losses, and win conversion is not yet an approved methodology (decision 0007
§10). A future slice that adds win conversion will need a small team-code
crosswalk — RAPTOR uses "CHA" for the Charlotte Hornets/Bobcats since 2004-05,
nba-elo uses "CHO" — documented here so it is not rediscovered from scratch.
"""

from __future__ import annotations

import functools
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

# Every RS season with complete team/player rows in the pinned snapshot
# (decision 0015) — verified directly against historical_RAPTOR_by_team.csv's
# own season/season_type columns, not assumed from the source's stated range.
SUPPORTED_SEASON_LABELS = frozenset(
    {f"{end_year - 1}-{str(end_year)[-2:]}" for end_year in range(1977, 2023)}
)

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
_BY_PLAYER_REQUIRED_COLUMNS = (
    "player_id",
    "player_name",
    "season",
    "mp",
    "poss",
    "raptor_total",
    "raptor_offense",
    "raptor_defense",
)


@dataclass(frozen=True)
class HistoricalSeasonData:
    """Everything the scenario domain needs for one supported historical season."""

    season: Season
    rosters: Mapping[str, TeamRoster]
    player_seasons: Mapping[str, PlayerSeason]
    contribution_values: Mapping[str, float]
    # raptor_offense / raptor_defense (decision 0010) — same pinned, already-
    # licensed CSV as contribution_values, just two more of its columns.
    offense_values: Mapping[str, float]
    defense_values: Mapping[str, float]
    data_version: str
    attribution: str
    source_license: str


@dataclass(frozen=True)
class _SourceFrames:
    """The pinned snapshot's manifest fields plus both parsed CSVs.

    Cached per snapshot_dir by _load_source_frames() below: with
    SUPPORTED_SEASON_LABELS now covering 46 seasons (decision 0015), reading
    and parsing both multi-decade CSVs from disk on every single-season call
    (as this loader did when there were only 1-2 supported seasons) would
    mean the FastAPI startup loop re-reads the same ~50k-row files from disk
    once per season. The raw snapshot is immutable for the life of a process
    (data-rules: raw snapshots are never overwritten), so caching this by
    path is safe.
    """

    by_team: pd.DataFrame
    by_player: pd.DataFrame
    data_version: str
    attribution: str
    source_license: str


@functools.cache
def _load_source_frames(snapshot_dir: Path) -> _SourceFrames:
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
    return _SourceFrames(
        by_team=by_team,
        by_player=by_player,
        data_version=data_version,
        attribution=attribution,
        source_license=source_license,
    )


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

    frames = _load_source_frames(snapshot_dir)

    rosters = _build_rosters(frames.by_team, season)
    player_seasons, contribution_values, offense_values, defense_values = _build_player_seasons(
        frames.by_player, season
    )

    return HistoricalSeasonData(
        season=season,
        rosters=rosters,
        player_seasons=player_seasons,
        contribution_values=contribution_values,
        offense_values=offense_values,
        defense_values=defense_values,
        data_version=frames.data_version,
        attribution=frames.attribution,
        source_license=frames.source_license,
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
) -> tuple[dict[str, PlayerSeason], dict[str, float], dict[str, float], dict[str, float]]:
    season_rows = by_player[by_player["season"] == season.source_value].sort_values("player_id")

    player_seasons: dict[str, PlayerSeason] = {}
    contribution_values: dict[str, float] = {}
    offense_values: dict[str, float] = {}
    defense_values: dict[str, float] = {}
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
        offense_values[player_id] = _as_float(row.raptor_offense)
        defense_values[player_id] = _as_float(row.raptor_defense)
    return player_seasons, contribution_values, offense_values, defense_values
