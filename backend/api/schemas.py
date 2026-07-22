"""API request/response schemas for the scenario endpoint.

Deliberately distinct from backend.domain.models' dataclasses (CLAUDE.md:
"keep database models separate from API schemas" — the same separation
applies to domain models, so the wire format can evolve independently of the
domain's internal representation).
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel

from backend.domain.models import EpistemicType, ProviderType


class ContributionProviderChoice(StrEnum):
    """The contribution providers exposed over HTTP (backend/providers/).

    No default: the domain layer never falls back from one provider to
    another (backend/providers/base.py), so the API requires an explicit
    choice on every request rather than inventing one.
    """

    HISTORICAL_BENCHMARK = "historical_benchmark"
    SYNTHETIC = "synthetic"


class ScenarioRequest(BaseModel):
    team_id: str
    season: str
    player_out_id: str
    player_in_id: str
    contribution_provider: ContributionProviderChoice


class RotationEntryResponse(BaseModel):
    player_id: str
    minutes: float


class ExplanationFactorResponse(BaseModel):
    metric: str
    baseline_value: float
    scenario_value: float
    change: float
    direction: str
    importance: float


class ScenarioResponse(BaseModel):
    team_id: str
    season: str
    player_out_id: str
    player_in_id: str
    baseline_rotation: list[RotationEntryResponse]
    scenario_rotation: list[RotationEntryResponse]
    baseline_contribution: float
    scenario_contribution: float
    contribution_change: float
    provider_type: ProviderType
    provider_version: str
    data_version: str
    contribution_epistemic_type: EpistemicType
    minutes_method: str
    minutes_assumptions: dict[str, float | bool]
    allocation_repairs: list[str]
    explanation_factors: list[ExplanationFactorResponse]
    historical_only: bool
    attribution: list[str]
    model_version: str | None


class ErrorResponse(BaseModel):
    code: str
    message: str


class TeamsResponse(BaseModel):
    season: str
    teams: list[str]


class RosterPlayerResponse(BaseModel):
    player_id: str
    name: str
    minutes: float


class TeamRosterResponse(BaseModel):
    season: str
    team_id: str
    players: list[RosterPlayerResponse]


class PlayerSummaryResponse(BaseModel):
    player_id: str
    name: str


class SeasonPlayersResponse(BaseModel):
    season: str
    players: list[PlayerSummaryResponse]
