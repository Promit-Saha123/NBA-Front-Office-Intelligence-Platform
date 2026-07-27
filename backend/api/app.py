"""FastAPI application exposing the roster scenario engine (decision 0007 free MVP).

One route: POST /scenarios. The 2014-15 HistoricalSeasonData is loaded once
at startup (scenario-engine.md §29: "model artifact loaded once at
application startup", "no live external request during a scenario
calculation") and reused for every request; the route itself only parses the
request, calls RosterScenarioService.build_scenario(), and maps the result —
all business logic stays in backend/scenario/service.py.
"""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from dataclasses import dataclass

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.errors import status_for
from backend.api.lookups import (
    get_player_detail,
    get_team_detail,
    list_season_players,
    list_team_ids,
    list_team_roster,
)
from backend.api.schemas import (
    ContributionProviderChoice,
    ErrorResponse,
    ExplanationFactorResponse,
    PlayerDetailResponse,
    PlayerSummaryResponse,
    RosterPlayerResponse,
    RotationEntryResponse,
    ScenarioRequest,
    ScenarioResponse,
    SeasonPlayersResponse,
    TeamDetailResponse,
    TeamProfileCategoryResponse,
    TeamRosterResponse,
    TeamsResponse,
    TeamStintResponse,
)
from backend.domain.errors import DomainError
from backend.domain.models import RosterScenarioRequest, RosterScenarioResult
from backend.fixtures.historical_loader import HistoricalSeasonData, load_historical_season
from backend.providers.base import ContributionProvider
from backend.providers.raptor_benchmark import HistoricalRaptorBenchmarkProvider
from backend.providers.synthetic import SyntheticContributionProvider
from backend.scenario.service import RosterScenarioService

SEASON_LABEL = "2014-15"

# The browser calls this API directly — no Next.js proxy route (decision 0008,
# clarification 6: a proxy solves no CORS/auth/deployment problem this free,
# unauthenticated MVP actually has, so it would be an unjustified extra layer).
# CORS is therefore the one thing the backend must configure for the frontend
# to work at all. Comma-separated so multiple dev/preview origins can be listed.
DEFAULT_FRONTEND_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"


def _frontend_origins() -> list[str]:
    raw = os.environ.get("FRONTEND_ORIGINS", DEFAULT_FRONTEND_ORIGINS)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@dataclass(frozen=True)
class AppState:
    service: RosterScenarioService
    providers: dict[ContributionProviderChoice, ContributionProvider]
    season_data: HistoricalSeasonData


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    season_data = load_historical_season(SEASON_LABEL)
    app.state.nba = AppState(
        service=RosterScenarioService(season_data),
        providers={
            ContributionProviderChoice.HISTORICAL_BENCHMARK: HistoricalRaptorBenchmarkProvider(
                season_data
            ),
            ContributionProviderChoice.SYNTHETIC: SyntheticContributionProvider(),
        },
        season_data=season_data,
    )
    yield


app = FastAPI(title="NBA Front Office Intelligence Platform API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_frontend_origins(),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    body = ErrorResponse(code=exc.code, message=exc.message)
    return JSONResponse(status_code=status_for(exc), content=body.model_dump())


@app.post("/scenarios", response_model=ScenarioResponse)
def create_scenario(payload: ScenarioRequest, request: Request) -> ScenarioResponse:
    state: AppState = request.app.state.nba
    provider = state.providers[payload.contribution_provider]
    domain_request = RosterScenarioRequest(
        team_id=payload.team_id,
        season_label=payload.season,
        player_out_id=payload.player_out_id,
        player_in_id=payload.player_in_id,
        manual_minutes=payload.manual_minutes,
    )
    result = state.service.build_scenario(domain_request, provider)
    return _to_response(result)


@app.get("/seasons/{season}/teams", response_model=TeamsResponse)
def list_teams(season: str, request: Request) -> TeamsResponse:
    state: AppState = request.app.state.nba
    team_ids = list_team_ids(state.season_data, season)
    return TeamsResponse(season=season, teams=team_ids)


@app.get("/seasons/{season}/teams/{team_id}/roster", response_model=TeamRosterResponse)
def get_team_roster(season: str, team_id: str, request: Request) -> TeamRosterResponse:
    state: AppState = request.app.state.nba
    rows = list_team_roster(state.season_data, season, team_id)
    return TeamRosterResponse(
        season=season,
        team_id=team_id,
        players=[
            RosterPlayerResponse(player_id=player_id, name=name, minutes=minutes)
            for player_id, name, minutes in rows
        ],
    )


@app.get("/seasons/{season}/players", response_model=SeasonPlayersResponse)
def list_players(season: str, request: Request) -> SeasonPlayersResponse:
    state: AppState = request.app.state.nba
    rows = list_season_players(state.season_data, season)
    return SeasonPlayersResponse(
        season=season,
        players=[PlayerSummaryResponse(player_id=player_id, name=name) for player_id, name in rows],
    )


@app.get("/seasons/{season}/players/{player_id}", response_model=PlayerDetailResponse)
def get_player(
    season: str,
    player_id: str,
    contribution_provider: ContributionProviderChoice,
    request: Request,
) -> PlayerDetailResponse:
    state: AppState = request.app.state.nba
    detail = get_player_detail(state.season_data, season, player_id)
    provider = state.providers[contribution_provider]
    contribution_value = provider.get_player_contribution(player_id, season)
    profile = provider.get_player_profile(player_id, season)
    return PlayerDetailResponse(
        season=season,
        player_id=detail.player_id,
        name=detail.name,
        minutes=detail.minutes,
        possessions=detail.possessions,
        team_stints=[
            TeamStintResponse(team_id=s.team_id, minutes=s.minutes, possessions=s.possessions)
            for s in detail.team_stints
        ],
        contribution_value=contribution_value,
        provider_type=provider.get_provider_type(),
        provider_version=provider.get_provider_version(),
        data_version=provider.get_data_version(),
        contribution_epistemic_type=provider.get_epistemic_type(),
        offensive_impact=profile.offensive_impact,
        defensive_impact=profile.defensive_impact,
        attribution=[provider.get_attribution()],
    )


@app.get("/seasons/{season}/teams/{team_id}", response_model=TeamDetailResponse)
def get_team(season: str, team_id: str, request: Request) -> TeamDetailResponse:
    state: AppState = request.app.state.nba
    detail = get_team_detail(state.season_data, season, team_id)
    return TeamDetailResponse(
        season=season,
        team_id=detail.team_id,
        players=[
            RosterPlayerResponse(player_id=player_id, name=name, minutes=minutes)
            for player_id, name, minutes in detail.players
        ],
        roster_size=detail.roster_size,
        total_roster_minutes=detail.total_roster_minutes,
    )


def _to_response(result: RosterScenarioResult) -> ScenarioResponse:
    return ScenarioResponse(
        team_id=result.team_id,
        season=result.season_label,
        player_out_id=result.player_out_id,
        player_in_id=result.player_in_id,
        baseline_rotation=[
            RotationEntryResponse(player_id=e.player_id, minutes=e.minutes)
            for e in result.baseline_rotation
        ],
        scenario_rotation=[
            RotationEntryResponse(player_id=e.player_id, minutes=e.minutes)
            for e in result.scenario_rotation
        ],
        baseline_contribution=result.baseline_contribution,
        scenario_contribution=result.scenario_contribution,
        contribution_change=result.contribution_change,
        provider_type=result.provider_type,
        provider_version=result.provider_version,
        data_version=result.data_version,
        contribution_epistemic_type=result.contribution_epistemic_type,
        minutes_method=result.minutes_method,
        minutes_assumptions=result.minutes_assumptions,
        allocation_repairs=list(result.allocation_repairs),
        explanation_factors=[
            ExplanationFactorResponse(
                metric=f.metric,
                baseline_value=f.baseline_value,
                scenario_value=f.scenario_value,
                change=f.change,
                direction=f.direction,
                importance=f.importance,
            )
            for f in result.explanation_factors
        ],
        team_profile=[
            TeamProfileCategoryResponse(
                category=c.category,
                baseline_value=c.baseline_value,
                scenario_value=c.scenario_value,
                change=c.change,
                direction=c.direction,
                epistemic_type=c.epistemic_type,
            )
            for c in result.team_profile
        ],
        historical_only=result.historical_only,
        attribution=list(result.attribution),
        model_version=result.model_version,
    )
