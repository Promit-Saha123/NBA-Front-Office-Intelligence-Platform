"""Read-only season/team/player lookup projections for the Roster Lab selectors (UI-002).

Pure data projections over an already-loaded HistoricalSeasonData — no
business logic, no validation rules beyond "does this identifier exist."
RosterScenarioService (backend/scenario/service.py) remains the only place
scenario domain logic lives; nothing here duplicates or modifies it.
"""

from __future__ import annotations

from backend.domain.errors import TeamNotFoundError, UnsupportedSeasonError
from backend.fixtures.historical_loader import HistoricalSeasonData


def _validate_season(season_data: HistoricalSeasonData, season: str) -> None:
    if season != season_data.season.label:
        raise UnsupportedSeasonError(
            f"This service instance only supports season "
            f"{season_data.season.label!r}, got {season!r}"
        )


def list_team_ids(season_data: HistoricalSeasonData, season: str) -> list[str]:
    """All team IDs with a roster in this season, alphabetically."""
    _validate_season(season_data, season)
    return sorted(season_data.rosters)


def list_team_roster(
    season_data: HistoricalSeasonData, season: str, team_id: str
) -> list[tuple[str, str, float]]:
    """(player_id, name, minutes) for every player on one team's roster, by name."""
    _validate_season(season_data, season)
    roster = season_data.rosters.get(team_id)
    if roster is None:
        raise TeamNotFoundError(f"Team {team_id!r} not found in season {season!r}")
    return sorted(
        ((m.player.internal_player_id, m.player.name, m.minutes) for m in roster.members),
        key=lambda row: row[1],
    )


def list_season_players(season_data: HistoricalSeasonData, season: str) -> list[tuple[str, str]]:
    """(player_id, name) for every player with a record in this season, by name.

    Season-wide, not team-scoped — mirrors RosterScenarioService's own swap
    rule (backend/scenario/service.py: an incoming player may come from any
    team in the selected season, not just the selected team's roster).
    """
    _validate_season(season_data, season)
    return sorted(
        ((player_id, ps.player.name) for player_id, ps in season_data.player_seasons.items()),
        key=lambda row: row[1],
    )
