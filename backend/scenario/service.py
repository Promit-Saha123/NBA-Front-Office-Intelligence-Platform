"""One-player, same-season roster scenario service.

Implements the swap rule from decision 0005 §3: the incoming player must have
a player-season record in the selected season and must not already be on the
selected roster; any team of origin within that season is allowed.

No win conversion exists yet (decision 0007 §10 — unresolved), so this
service deliberately never produces a ``projected_wins`` value. Only the
contribution-value change is calculated.
"""

from __future__ import annotations

from backend.domain.errors import (
    InvalidRosterError,
    PlayerAlreadyOnRosterError,
    PlayerNotFoundError,
    PlayerNotOnRosterError,
    SamePlayerSwapError,
    TeamNotFoundError,
    UnsupportedSeasonError,
)
from backend.domain.models import (
    RosterScenarioRequest,
    RosterScenarioResult,
    RotationEntry,
    ScenarioExplanationFactor,
    TeamRoster,
)
from backend.fixtures.historical_loader import HistoricalSeasonData
from backend.minutes.allocator import (
    DEFAULT_MINUTES_CONFIG,
    MinutesAllocationConfig,
    allocate_minutes,
    apply_manual_minutes,
)
from backend.providers.base import ContributionProvider

MINUTES_METHOD = "heuristic-v1"
_DIRECTION_TOLERANCE = 1e-9


class RosterScenarioService:
    def __init__(
        self,
        season_data: HistoricalSeasonData,
        minutes_config: MinutesAllocationConfig = DEFAULT_MINUTES_CONFIG,
    ) -> None:
        self._season_data = season_data
        self._minutes_config = minutes_config

    def build_scenario(
        self, request: RosterScenarioRequest, provider: ContributionProvider
    ) -> RosterScenarioResult:
        self._validate_season(request.season_label)
        baseline_roster = self._get_roster(request.team_id)
        self._validate_outgoing_on_roster(baseline_roster, request.player_out_id)
        self._validate_incoming_exists(request.player_in_id)
        self._validate_not_same_player(request.player_out_id, request.player_in_id)
        self._validate_incoming_not_on_roster(baseline_roster, request.player_in_id)

        baseline_ids = baseline_roster.player_ids()
        scenario_ids = (baseline_ids - {request.player_out_id}) | {request.player_in_id}
        if len(scenario_ids) != len(baseline_ids):
            # Defensive invariant, not reachable through this method's public
            # validation sequence above (outgoing is on the roster, incoming is
            # not, and they differ, so this set arithmetic always nets to the
            # same size) — kept in case a future validation change breaks that
            # guarantee silently.
            raise InvalidRosterError(
                "Scenario roster does not have the same size as the baseline roster "
                "after the one-player swap"
            )

        outgoing_weight = baseline_roster.member_minutes(request.player_out_id)
        if outgoing_weight is None:
            # Defensive invariant: _validate_outgoing_on_roster already confirmed
            # player_out_id is a roster member, so member_minutes() cannot be None.
            raise InvalidRosterError(
                f"Player {request.player_out_id!r} is on the roster but has no recorded minutes"
            )

        baseline_weights = {
            pid: baseline_roster.member_minutes(pid) or 0.0 for pid in baseline_ids
        }
        scenario_weights = {
            pid: baseline_roster.member_minutes(pid) or 0.0
            for pid in baseline_ids
            if pid != request.player_out_id
        }
        scenario_weights[request.player_in_id] = outgoing_weight

        contribution_values = {
            pid: provider.get_player_contribution(pid, request.season_label)
            for pid in baseline_ids | {request.player_in_id}
        }

        baseline_allocation = allocate_minutes(baseline_weights, self._minutes_config)

        # Baseline is never editable (real historical minutes, re-normalized) — only
        # the scenario side can come from a manual override instead of the heuristic.
        if request.manual_minutes is not None:
            scenario_entries = apply_manual_minutes(
                request.manual_minutes, frozenset(scenario_weights), self._minutes_config
            )
            scenario_repairs: tuple[str, ...] = ()
            scenario_source = "manual"
        else:
            scenario_allocation = allocate_minutes(scenario_weights, self._minutes_config)
            scenario_entries = scenario_allocation.entries
            scenario_repairs = scenario_allocation.repairs
            scenario_source = "heuristic"

        total_minutes = self._minutes_config.total_team_minutes
        baseline_contribution = _minutes_weighted_contribution(
            baseline_allocation.entries, contribution_values, total_minutes
        )
        scenario_contribution = _minutes_weighted_contribution(
            scenario_entries, contribution_values, total_minutes
        )
        contribution_change = scenario_contribution - baseline_contribution

        final_scenario_rotation = scenario_entries + (
            RotationEntry(player_id=request.player_out_id, minutes=0.0),
        )

        explanation_factors = (
            _explanation_factor(
                "team_contribution", baseline_contribution, scenario_contribution
            ),
            _explanation_factor(
                "player_swap_contribution",
                contribution_values[request.player_out_id],
                contribution_values[request.player_in_id],
            ),
        )

        allocation_repairs = tuple(f"baseline: {r}" for r in baseline_allocation.repairs) + tuple(
            f"scenario: {r}" for r in scenario_repairs
        )

        return RosterScenarioResult(
            team_id=request.team_id,
            season_label=request.season_label,
            player_out_id=request.player_out_id,
            player_in_id=request.player_in_id,
            baseline_rotation=baseline_allocation.entries,
            scenario_rotation=final_scenario_rotation,
            baseline_contribution=baseline_contribution,
            scenario_contribution=scenario_contribution,
            contribution_change=contribution_change,
            provider_type=provider.get_provider_type(),
            provider_version=provider.get_provider_version(),
            data_version=provider.get_data_version(),
            contribution_epistemic_type=provider.get_epistemic_type(),
            minutes_method=MINUTES_METHOD,
            minutes_assumptions={
                # This deployment supports scenario-side manual minutes editing
                # (a capability flag) — whether *this* response actually used it
                # is the separate, per-response "scenario_source" fact below.
                "editable": True,
                "validated": False,
                "total_minutes": self._minutes_config.total_team_minutes,
                "maximum_player_minutes": self._minutes_config.max_player_minutes,
                "scenario_source": scenario_source,
            },
            allocation_repairs=allocation_repairs,
            explanation_factors=explanation_factors,
            historical_only=True,
            attribution=(provider.get_attribution(),),
            model_version=None,
        )

    def _validate_season(self, season_label: str) -> None:
        if season_label != self._season_data.season.label:
            raise UnsupportedSeasonError(
                f"This service instance only supports season "
                f"{self._season_data.season.label!r}, got {season_label!r}"
            )

    def _get_roster(self, team_id: str) -> TeamRoster:
        roster = self._season_data.rosters.get(team_id)
        if roster is None:
            raise TeamNotFoundError(
                f"Team {team_id!r} not found in season {self._season_data.season.label!r}"
            )
        return roster

    def _validate_outgoing_on_roster(self, roster: TeamRoster, player_out_id: str) -> None:
        if not roster.has_player(player_out_id):
            raise PlayerNotOnRosterError(
                f"Player {player_out_id!r} is not on team {roster.team.internal_team_id!r}'s "
                f"{self._season_data.season.label} roster"
            )

    def _validate_incoming_exists(self, player_in_id: str) -> None:
        if player_in_id not in self._season_data.player_seasons:
            raise PlayerNotFoundError(
                f"Player {player_in_id!r} has no record in season "
                f"{self._season_data.season.label!r}"
            )

    def _validate_not_same_player(self, player_out_id: str, player_in_id: str) -> None:
        if player_out_id == player_in_id:
            raise SamePlayerSwapError("The outgoing and incoming player must differ")

    def _validate_incoming_not_on_roster(self, roster: TeamRoster, player_in_id: str) -> None:
        if roster.has_player(player_in_id):
            raise PlayerAlreadyOnRosterError(
                f"Player {player_in_id!r} is already on team "
                f"{roster.team.internal_team_id!r}'s {self._season_data.season.label} roster"
            )


def _minutes_weighted_contribution(
    entries: tuple[RotationEntry, ...],
    contribution_values: dict[str, float],
    total_team_minutes: float,
) -> float:
    return sum(
        contribution_values[entry.player_id] * (entry.minutes / total_team_minutes)
        for entry in entries
    )


def _explanation_factor(
    metric: str, baseline_value: float, scenario_value: float
) -> ScenarioExplanationFactor:
    change = scenario_value - baseline_value
    if change > _DIRECTION_TOLERANCE:
        direction = "increase"
    elif change < -_DIRECTION_TOLERANCE:
        direction = "decrease"
    else:
        direction = "no_change"
    return ScenarioExplanationFactor(
        metric=metric,
        baseline_value=baseline_value,
        scenario_value=scenario_value,
        change=change,
        direction=direction,
        importance=1.0,
    )
