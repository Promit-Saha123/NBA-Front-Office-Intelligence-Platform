"""Canonical historical scenario domain models (decision 0007 free MVP).

These types are independent of any source schema (RAPTOR, nba-elo, synthetic),
any persistence layer, and any API request/response schema. Source-specific
adapters translate into these models; nothing downstream depends on
source-specific field names.
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum

_SEASON_LABEL_RE = re.compile(r"^(\d{4})-(\d{2})$")


class EpistemicType(StrEnum):
    """Epistemic category a value belongs to (scenario-engine.md §3, decision 0007 §2)."""

    HISTORICAL_BENCHMARK = "historical_benchmark"
    SYNTHETIC_ESTIMATE = "synthetic_estimate"
    MODEL_PREDICTION = "model_prediction"
    HEURISTIC_ASSUMPTION = "heuristic_assumption"
    DETERMINISTIC_CALCULATION = "deterministic_calculation"
    DESCRIPTIVE_INTERPRETATION = "descriptive_interpretation"


class ProviderType(StrEnum):
    """Contribution-provider implementation identity (decision 0007 §7)."""

    HISTORICAL_RAPTOR_BENCHMARK = "historical_raptor_benchmark"
    SYNTHETIC = "synthetic"


@dataclass(frozen=True)
class Season:
    """A canonical NBA season.

    ``source_value`` preserves the RAPTOR dataset's own season convention
    (named by the year the season ends, e.g. 2014-15 -> 2015) so adapters can
    round-trip without guessing.
    """

    label: str
    start_year: int
    end_year: int
    source_value: int


def parse_season_label(label: str) -> Season:
    """Parse a ``"2014-15"``-style label into a Season.

    Uses the end-year convention shared by both approved historical sources
    (RAPTOR's ``season`` column and nba-elo's ``year_id`` both name a season
    by the calendar year it ends in). Raises ``ValueError`` for a malformed
    label; callers translate that into a domain error as appropriate.
    """
    match = _SEASON_LABEL_RE.match(label)
    if match is None:
        raise ValueError(f"Season label must look like 'YYYY-YY', got {label!r}")
    start_year = int(match.group(1))
    end_suffix = int(match.group(2))
    end_year = (start_year // 100) * 100 + end_suffix
    if end_year <= start_year:
        end_year += 100
    return Season(label=label, start_year=start_year, end_year=end_year, source_value=end_year)


@dataclass(frozen=True)
class Team:
    internal_team_id: str
    season: Season


@dataclass(frozen=True)
class Player:
    internal_player_id: str
    name: str


@dataclass(frozen=True)
class PlayerSeason:
    """A player's season-level record (season-blended, per FiveThirtyEight's own grain)."""

    player: Player
    season: Season
    minutes: float
    possessions: int


@dataclass(frozen=True)
class RosterMember:
    """One player's stint on one team in one season (regular-season only, per stint)."""

    player: Player
    team: Team
    season: Season
    minutes: float
    possessions: int


@dataclass(frozen=True)
class TeamRoster:
    team: Team
    season: Season
    members: tuple[RosterMember, ...]

    def player_ids(self) -> frozenset[str]:
        return frozenset(member.player.internal_player_id for member in self.members)

    def has_player(self, player_id: str) -> bool:
        return player_id in self.player_ids()

    def member_minutes(self, player_id: str) -> float | None:
        for member in self.members:
            if member.player.internal_player_id == player_id:
                return member.minutes
        return None


@dataclass(frozen=True)
class PlayerContribution:
    """A player's contribution value as returned by a ContributionProvider."""

    player_id: str
    season: Season
    value: float
    provider_type: ProviderType
    provider_version: str
    data_version: str
    epistemic_type: EpistemicType
    attribution: str


@dataclass(frozen=True)
class RotationEntry:
    player_id: str
    minutes: float


@dataclass(frozen=True)
class RosterScenarioRequest:
    team_id: str
    season_label: str
    player_out_id: str
    player_in_id: str
    # A complete player_id -> minutes assignment for the post-swap scenario
    # roster (never the baseline, which is never editable). When present, it
    # replaces the heuristic allocator for the scenario side entirely rather
    # than being blended with it — see apply_manual_minutes in
    # backend/minutes/allocator.py for the exact validation rules.
    manual_minutes: Mapping[str, float] | None = None


@dataclass(frozen=True)
class ScenarioExplanationFactor:
    metric: str
    baseline_value: float
    scenario_value: float
    change: float
    direction: str
    importance: float


@dataclass(frozen=True)
class MinutesAllocationResult:
    entries: tuple[RotationEntry, ...]
    repairs: tuple[str, ...]


@dataclass(frozen=True)
class RosterScenarioResult:
    team_id: str
    season_label: str
    player_out_id: str
    player_in_id: str
    baseline_rotation: tuple[RotationEntry, ...]
    scenario_rotation: tuple[RotationEntry, ...]
    baseline_contribution: float
    scenario_contribution: float
    contribution_change: float
    provider_type: ProviderType
    provider_version: str
    data_version: str
    contribution_epistemic_type: EpistemicType
    minutes_method: str
    minutes_assumptions: dict[str, float | bool | str]
    allocation_repairs: tuple[str, ...]
    explanation_factors: tuple[ScenarioExplanationFactor, ...]
    historical_only: bool
    attribution: tuple[str, ...]
    model_version: str | None = None
