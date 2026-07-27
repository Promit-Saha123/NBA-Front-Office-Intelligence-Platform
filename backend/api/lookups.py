"""Read-only season/team/player lookup projections.

Pure data projections over an already-loaded HistoricalSeasonData — no
business logic, no validation rules beyond "does this identifier exist," and
no ContributionProvider calls (those stay in backend/api/app.py's routes, so
provider selection remains an explicit per-request caller choice, same rule
as RosterScenarioService.build_scenario). RosterScenarioService
(backend/scenario/service.py) remains the only place scenario domain logic
lives; nothing here duplicates or modifies it.

Originally added for the Roster Lab selectors (UI-002: list_team_ids,
list_team_roster, list_season_players); get_player_detail/get_team_detail
(step 8) support standalone player/team detail pages.
"""

from __future__ import annotations

from dataclasses import dataclass

from backend.domain.errors import PlayerNotFoundError, TeamNotFoundError, UnsupportedSeasonError
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


@dataclass(frozen=True)
class TeamStint:
    """One player's stint on one team (backend.domain.models.RosterMember, projected)."""

    team_id: str
    minutes: float
    possessions: int


@dataclass(frozen=True)
class PlayerDetail:
    """A player's season-blended identity/usage plus their per-team stints.

    ``minutes``/``possessions`` are the season-blended totals from
    PlayerSeason (by_player CSV); ``team_stints`` are the regular-season-only
    per-team breakdown (by_team CSV) — the two can disagree (e.g. a blended
    total including playoff minutes a per-team stint doesn't) since they come
    from different source rows. No contribution/profile values here — those
    require an explicit ContributionProvider choice, supplied by the caller
    (backend/api/app.py), not this provider-free projection layer.
    """

    player_id: str
    name: str
    minutes: float
    possessions: int
    team_stints: tuple[TeamStint, ...]


def get_player_detail(
    season_data: HistoricalSeasonData, season: str, player_id: str
) -> PlayerDetail:
    """Season-blended identity/usage plus per-team stints for one player.

    A player can have more than one stint in a season (mid-season trade) —
    76 of the 2014-15 season's players did — so ``team_stints`` is a list,
    sorted by team_id, not a single team_id field.
    """
    _validate_season(season_data, season)
    player_season = season_data.player_seasons.get(player_id)
    if player_season is None:
        raise PlayerNotFoundError(f"Player {player_id!r} not found in season {season!r}")
    stints = sorted(
        (
            TeamStint(
                team_id=roster.team.internal_team_id,
                minutes=member.minutes,
                possessions=member.possessions,
            )
            for roster in season_data.rosters.values()
            for member in roster.members
            if member.player.internal_player_id == player_id
        ),
        key=lambda stint: stint.team_id,
    )
    return PlayerDetail(
        player_id=player_id,
        name=player_season.player.name,
        minutes=player_season.minutes,
        possessions=player_season.possessions,
        team_stints=tuple(stints),
    )


@dataclass(frozen=True)
class TeamDetail:
    """A team's roster plus honestly-derivable aggregates (no provider values).

    No summed possessions aggregate: RAPTOR's per-player possession count
    would overcount a team's actual season possessions roughly 5x if summed
    (each possession credits ~5 players simultaneously), so that sum would
    misrepresent a stat rather than honestly derive one. Minutes don't have
    this problem — the aggregate is transparently "the column already shown
    per player, added up."
    """

    team_id: str
    players: list[tuple[str, str, float]]
    roster_size: int
    total_roster_minutes: float


def get_team_detail(season_data: HistoricalSeasonData, season: str, team_id: str) -> TeamDetail:
    rows = list_team_roster(season_data, season, team_id)
    return TeamDetail(
        team_id=team_id,
        players=rows,
        roster_size=len(rows),
        total_roster_minutes=sum(minutes for _, _, minutes in rows),
    )
