"""Tests for backend.scenario.service — synthetic fixtures for exact calculations,
the pinned 2014-15 snapshot for integration coverage. No live endpoints."""

import dataclasses
import math

import pytest

from backend.domain.errors import (
    InvalidManualMinutesError,
    MissingContributionError,
    PlayerAlreadyOnRosterError,
    PlayerNotFoundError,
    PlayerNotOnRosterError,
    SamePlayerSwapError,
    TeamNotFoundError,
    UnsupportedSeasonError,
)
from backend.domain.models import (
    EpistemicType,
    Player,
    PlayerImpactProfile,
    PlayerSeason,
    ProviderType,
    RosterMember,
    RosterScenarioRequest,
    Season,
    Team,
    TeamRoster,
)
from backend.fixtures.historical_loader import HistoricalSeasonData, load_historical_season
from backend.minutes.allocator import MinutesAllocationConfig
from backend.providers.base import ContributionProvider
from backend.providers.raptor_benchmark import HistoricalRaptorBenchmarkProvider
from backend.providers.synthetic import SyntheticContributionConfig, SyntheticContributionProvider
from backend.scenario.service import RosterScenarioService

SEASON_LABEL = "2014-15"
SEASON = Season(label=SEASON_LABEL, start_year=2014, end_year=2015, source_value=2015)

# The synthetic fixture rosters below have only 3-4 players; the default
# 40-minute max cap requires at least 6 active players to reach 240 total, so
# these tests need a higher per-player cap suited to a tiny league.
_SYNTHETIC_MINUTES_CONFIG = MinutesAllocationConfig(max_player_minutes=100.0)


def _member(player_id: str, team_id: str, minutes: float) -> RosterMember:
    team = Team(internal_team_id=team_id, season=SEASON)
    return RosterMember(
        player=Player(internal_player_id=player_id, name=player_id),
        team=team,
        season=SEASON,
        minutes=minutes,
        possessions=int(minutes * 2),
    )


def _synthetic_season_data(contribution_values: dict[str, float]) -> HistoricalSeasonData:
    """A small, fully synthetic two-team league for exact hand-calculated tests."""
    team_a_weights = [("a1", 2000.0), ("a2", 1000.0), ("a3", 500.0)]
    team_a_members = tuple(_member(pid, "TMA", minutes) for pid, minutes in team_a_weights)
    team_b_members = tuple(_member("b1", "TMB", 1800.0) for _ in range(1))
    team_a = Team(internal_team_id="TMA", season=SEASON)
    team_b = Team(internal_team_id="TMB", season=SEASON)
    rosters = {
        "TMA": TeamRoster(team=team_a, season=SEASON, members=team_a_members),
        "TMB": TeamRoster(team=team_b, season=SEASON, members=team_b_members),
    }
    all_ids = {m.player.internal_player_id for members in rosters.values() for m in members.members}
    player_seasons = {
        pid: PlayerSeason(
            player=Player(internal_player_id=pid, name=pid),
            season=SEASON,
            minutes=1000.0,
            possessions=2000,
        )
        for pid in all_ids
    }
    return HistoricalSeasonData(
        season=SEASON,
        rosters=rosters,
        player_seasons=player_seasons,
        contribution_values=contribution_values,
        # Not consulted by SyntheticContributionProvider.get_player_profile()
        # (it never reads HistoricalSeasonData) — these tests all use the
        # synthetic provider, so zero-filled maps are enough to construct.
        offense_values=dict.fromkeys(all_ids, 0.0),
        defense_values=dict.fromkeys(all_ids, 0.0),
        data_version="synthetic-fixtures-v1",
        attribution="Synthetic test fixture",
        source_license="N/A (test fixture)",
    )


def _synthetic_provider(values: dict[str, float]) -> SyntheticContributionProvider:
    explicit = {(pid, SEASON_LABEL): value for pid, value in values.items()}
    return SyntheticContributionProvider(
        SyntheticContributionConfig(data_version="synthetic-fixtures-v1"), explicit_values=explicit
    )


class _FixedProfileProvider(ContributionProvider):
    """Wraps a real provider but returns explicit, hand-verifiable profile
    values — SyntheticContributionProvider only supports explicit
    *contribution* overrides, not profile overrides, so team-profile tests
    that need exact/matching offense-defense numbers need this instead."""

    def __init__(
        self, inner: ContributionProvider, profiles: dict[str, PlayerImpactProfile]
    ) -> None:
        self._inner = inner
        self._profiles = profiles

    def get_player_contribution(self, player_id: str, season_label: str) -> float:
        return self._inner.get_player_contribution(player_id, season_label)

    def get_player_profile(self, player_id: str, season_label: str) -> PlayerImpactProfile:
        return self._profiles[player_id]

    def get_provider_type(self) -> ProviderType:
        return self._inner.get_provider_type()

    def get_provider_version(self) -> str:
        return self._inner.get_provider_version()

    def get_data_version(self) -> str:
        return self._inner.get_data_version()

    def get_epistemic_type(self) -> EpistemicType:
        return self._inner.get_epistemic_type()

    def get_attribution(self) -> str:
        return self._inner.get_attribution()


# --- Hand-calculated synthetic tests ---


def test_valid_one_player_same_season_swap() -> None:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)

    baseline_total = sum(e.minutes for e in result.baseline_rotation)
    scenario_total = sum(e.minutes for e in result.scenario_rotation)
    assert baseline_total == pytest.approx(240.0, abs=1e-6)
    assert scenario_total == pytest.approx(240.0, abs=1e-6)
    assert result.contribution_change == pytest.approx(
        result.scenario_contribution - result.baseline_contribution
    )


def test_zero_change_scenario_produces_zero_difference() -> None:
    # Swap a3 out for a player with an identical contribution value; since the
    # incoming player also inherits a3's provisional minutes weight, the
    # aggregation is symmetric and the difference must be exactly zero.
    values = {"a1": 10.0, "a2": 5.0, "a3": 3.0, "b1": 3.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    assert result.contribution_change == pytest.approx(0.0, abs=1e-9)


def test_outgoing_player_not_on_roster() -> None:
    values = {"a1": 1.0, "a2": 1.0, "a3": 1.0, "b1": 1.0}
    service = RosterScenarioService(_synthetic_season_data(values), _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="b1", player_in_id="a1"
    )
    with pytest.raises(PlayerNotOnRosterError):
        service.build_scenario(request, provider)


def test_incoming_player_already_on_roster() -> None:
    values = {"a1": 1.0, "a2": 1.0, "a3": 1.0, "b1": 1.0}
    service = RosterScenarioService(_synthetic_season_data(values), _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="a2"
    )
    with pytest.raises(PlayerAlreadyOnRosterError):
        service.build_scenario(request, provider)


def test_same_player_added_and_removed() -> None:
    values = {"a1": 1.0, "a2": 1.0, "a3": 1.0, "b1": 1.0}
    service = RosterScenarioService(_synthetic_season_data(values), _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="a3"
    )
    with pytest.raises(SamePlayerSwapError):
        service.build_scenario(request, provider)


def test_incoming_player_not_found() -> None:
    values = {"a1": 1.0, "a2": 1.0, "a3": 1.0}
    service = RosterScenarioService(_synthetic_season_data(values), _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="nobody"
    )
    with pytest.raises(PlayerNotFoundError):
        service.build_scenario(request, provider)


def test_team_not_found() -> None:
    values = {"a1": 1.0, "a2": 1.0, "a3": 1.0, "b1": 1.0}
    service = RosterScenarioService(_synthetic_season_data(values), _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="ZZZ", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    with pytest.raises(TeamNotFoundError):
        service.build_scenario(request, provider)


def test_unsupported_season() -> None:
    values = {"a1": 1.0, "a2": 1.0, "a3": 1.0, "b1": 1.0}
    service = RosterScenarioService(_synthetic_season_data(values), _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label="1999-00", player_out_id="a3", player_in_id="b1"
    )
    with pytest.raises(UnsupportedSeasonError):
        service.build_scenario(request, provider)


def test_missing_contribution_propagates() -> None:
    # b1 (the incoming player) has no entry in contribution_values -> must raise.
    values = {"a1": 1.0, "a2": 1.0, "a3": 1.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = HistoricalRaptorBenchmarkProvider(season_data)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    with pytest.raises(MissingContributionError):
        service.build_scenario(request, provider)


def test_no_duplicate_roster_members() -> None:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    active_scenario_ids = [e.player_id for e in result.scenario_rotation if e.minutes > 0]
    assert len(active_scenario_ids) == len(set(active_scenario_ids))


def test_deterministic_result() -> None:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result_a = service.build_scenario(request, _synthetic_provider(values))
    result_b = service.build_scenario(request, _synthetic_provider(values))
    assert result_a == result_b


def test_same_aggregation_formula_for_baseline_and_scenario() -> None:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    total_minutes = float(result.minutes_assumptions["total_minutes"])
    recomputed_baseline = sum(
        values[e.player_id] * (e.minutes / total_minutes) for e in result.baseline_rotation
    )
    recomputed_scenario = sum(
        values[e.player_id] * (e.minutes / total_minutes)
        for e in result.scenario_rotation
        if e.minutes > 0
    )
    assert result.baseline_contribution == pytest.approx(recomputed_baseline)
    assert result.scenario_contribution == pytest.approx(recomputed_scenario)


def test_provider_metadata_propagates() -> None:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    assert result.provider_type == ProviderType.SYNTHETIC
    assert result.provider_version == provider.get_provider_version()
    assert result.data_version == provider.get_data_version()
    assert result.contribution_epistemic_type == EpistemicType.SYNTHETIC_ESTIMATE
    assert result.attribution == (provider.get_attribution(),)


def test_minutes_metadata_propagates() -> None:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    assert result.minutes_method == "heuristic-v1"
    assert result.minutes_assumptions["editable"] is True
    assert result.minutes_assumptions["validated"] is False
    assert result.minutes_assumptions["total_minutes"] == 240.0
    assert result.minutes_assumptions["scenario_source"] == "heuristic"


def test_removed_player_receives_zero_minutes() -> None:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    removed_entries = [e for e in result.scenario_rotation if e.player_id == "a3"]
    assert len(removed_entries) == 1
    assert removed_entries[0].minutes == 0.0


def test_explanation_factors_match_numerical_changes() -> None:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    for factor in result.explanation_factors:
        assert factor.change == pytest.approx(factor.scenario_value - factor.baseline_value)
        if factor.change > 1e-9:
            assert factor.direction == "increase"
        elif factor.change < -1e-9:
            assert factor.direction == "decrease"
        else:
            assert factor.direction == "no_change"


def test_no_projected_wins_value_is_invented() -> None:
    field_names = {f.name for f in dataclasses.fields(_synthetic_season_data({}).__class__)}
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    result_field_names = {f.name for f in dataclasses.fields(result)}
    assert "projected_wins" not in result_field_names
    assert "win_conversion_version" not in result_field_names
    assert field_names  # sanity: fixture helper still returns a real dataclass


def test_raptor_specific_fields_do_not_leak_into_response() -> None:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    result_field_names = {f.name for f in dataclasses.fields(result)}
    forbidden = {"raptor_total", "raptor_offense", "raptor_defense", "war_total"}
    assert result_field_names.isdisjoint(forbidden)
    rotation_field_names = {f.name for f in dataclasses.fields(result.scenario_rotation[0])}
    assert rotation_field_names.isdisjoint(forbidden)
    profile_field_names = {f.name for f in dataclasses.fields(result.team_profile[0])}
    assert profile_field_names.isdisjoint(forbidden)


# --- Team profile (decision 0010) ---

_PROFILES = {
    "a1": PlayerImpactProfile(offensive_impact=4.0, defensive_impact=-2.0),
    "a2": PlayerImpactProfile(offensive_impact=1.0, defensive_impact=1.0),
    "a3": PlayerImpactProfile(offensive_impact=0.0, defensive_impact=0.0),
    "b1": PlayerImpactProfile(offensive_impact=6.0, defensive_impact=-1.0),
}


def _fixed_profile_scenario() -> tuple[RosterScenarioService, _FixedProfileProvider]:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _FixedProfileProvider(_synthetic_provider(values), _PROFILES)
    return service, provider


def test_team_profile_formula_matches_minutes_weighted_aggregation() -> None:
    service, provider = _fixed_profile_scenario()
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    total_minutes = float(result.minutes_assumptions["total_minutes"])

    offense_by_category = {c.category: c for c in result.team_profile}["offensive_impact"]
    recomputed_baseline_offense = sum(
        _PROFILES[e.player_id].offensive_impact * (e.minutes / total_minutes)
        for e in result.baseline_rotation
    )
    recomputed_scenario_offense = sum(
        _PROFILES[e.player_id].offensive_impact * (e.minutes / total_minutes)
        for e in result.scenario_rotation
        if e.minutes > 0
    )
    assert offense_by_category.baseline_value == pytest.approx(recomputed_baseline_offense)
    assert offense_by_category.scenario_value == pytest.approx(recomputed_scenario_offense)


def test_team_profile_uses_same_minutes_weighting_as_contribution() -> None:
    # Same rotation entries/minutes drive both — changing only the profile
    # provider's offense/defense values must never move baseline/scenario
    # contribution, since they're computed from wholly separate value maps.
    service, provider = _fixed_profile_scenario()
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result_with_profile = service.build_scenario(request, provider)
    result_without_profile_wrapper = service.build_scenario(
        request, _synthetic_provider({"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0})
    )
    assert result_with_profile.baseline_contribution == pytest.approx(
        result_without_profile_wrapper.baseline_contribution
    )
    assert result_with_profile.scenario_contribution == pytest.approx(
        result_without_profile_wrapper.scenario_contribution
    )


def test_team_profile_reports_raw_values_no_normalization() -> None:
    # v1 does no league normalization; raw offense/defense values are
    # minutes-weighted and summed as-is — an honest, labeled simplicity
    # choice, not a gap. A single-player, single-minutes-share case makes
    # the "no rescaling happened" claim directly checkable.
    values = {"a1": 1.0, "a2": 1.0, "a3": 1.0, "b1": 1.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _FixedProfileProvider(_synthetic_provider(values), _PROFILES)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    total_minutes = float(result.minutes_assumptions["total_minutes"])
    offense = {c.category: c for c in result.team_profile}["offensive_impact"]
    expected_scenario = sum(
        _PROFILES[e.player_id].offensive_impact * (e.minutes / total_minutes)
        for e in result.scenario_rotation
        if e.minutes > 0
    )
    assert offense.scenario_value == pytest.approx(expected_scenario)


def test_team_profile_baseline_scenario_difference() -> None:
    service, provider = _fixed_profile_scenario()
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    for category in result.team_profile:
        assert category.change == pytest.approx(category.scenario_value - category.baseline_value)


def test_team_profile_missing_data_raises_missing_contribution_error() -> None:
    values = {"a1": 1.0, "a2": 1.0, "a3": 1.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = HistoricalRaptorBenchmarkProvider(season_data)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    with pytest.raises(MissingContributionError):
        service.build_scenario(request, provider)


def test_team_profile_zero_change_when_swap_is_value_neutral() -> None:
    # a3 and b1 share the exact same profile -> swapping them must produce
    # zero change in both categories.
    values = {"a1": 10.0, "a2": 5.0, "a3": 3.0, "b1": 3.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    profiles = {**_PROFILES, "b1": _PROFILES["a3"]}
    provider = _FixedProfileProvider(_synthetic_provider(values), profiles)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    for category in result.team_profile:
        assert category.change == pytest.approx(0.0, abs=1e-9)
        assert category.direction == "no_change"


def test_team_profile_output_is_always_a_finite_float() -> None:
    # No normalization -> no fixed range to assert beyond "finite" (contrast
    # with a percentile/index approach, which would have a defined range).
    service, provider = _fixed_profile_scenario()
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    for category in result.team_profile:
        assert math.isfinite(category.baseline_value)
        assert math.isfinite(category.scenario_value)
        assert math.isfinite(category.change)


def test_team_profile_epistemic_type_is_always_descriptive_interpretation() -> None:
    service, provider = _fixed_profile_scenario()
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    result = service.build_scenario(request, provider)
    assert all(
        c.epistemic_type == EpistemicType.DESCRIPTIVE_INTERPRETATION for c in result.team_profile
    )


def test_team_profile_never_influences_contribution_or_explanation_factors() -> None:
    # Regression test locking in the parallel-computation claim: two
    # scenarios differing only in the profile provider's offense/defense
    # values (contribution values held constant) must produce bit-identical
    # contribution_change/baseline_contribution/scenario_contribution/
    # explanation_factors, while team_profile itself differs.
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    request = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )

    provider_a = _FixedProfileProvider(_synthetic_provider(values), _PROFILES)
    other_profiles = {
        pid: PlayerImpactProfile(
            offensive_impact=-p.offensive_impact, defensive_impact=-p.defensive_impact
        )
        for pid, p in _PROFILES.items()
    }
    provider_b = _FixedProfileProvider(_synthetic_provider(values), other_profiles)

    result_a = service.build_scenario(request, provider_a)
    result_b = service.build_scenario(request, provider_b)

    assert result_a.contribution_change == result_b.contribution_change
    assert result_a.baseline_contribution == result_b.baseline_contribution
    assert result_a.scenario_contribution == result_b.scenario_contribution
    assert result_a.explanation_factors == result_b.explanation_factors
    assert result_a.team_profile != result_b.team_profile


# --- Integration test against the real pinned 2014-15 snapshot ---


def test_manual_minutes_override_produces_expected_scenario_rotation() -> None:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    manual_minutes = {"a1": 100.0, "a2": 100.0, "b1": 40.0}
    request = RosterScenarioRequest(
        team_id="TMA",
        season_label=SEASON_LABEL,
        player_out_id="a3",
        player_in_id="b1",
        manual_minutes=manual_minutes,
    )
    result = service.build_scenario(request, provider)
    minutes_by_id = {e.player_id: e.minutes for e in result.scenario_rotation}
    assert minutes_by_id == {**manual_minutes, "a3": 0.0}


def test_manual_minutes_leaves_baseline_rotation_unchanged() -> None:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request_without_override = RosterScenarioRequest(
        team_id="TMA", season_label=SEASON_LABEL, player_out_id="a3", player_in_id="b1"
    )
    request_with_override = RosterScenarioRequest(
        team_id="TMA",
        season_label=SEASON_LABEL,
        player_out_id="a3",
        player_in_id="b1",
        manual_minutes={"a1": 100.0, "a2": 100.0, "b1": 40.0},
    )
    default_result = service.build_scenario(request_without_override, provider)
    manual_result = service.build_scenario(request_with_override, provider)
    assert manual_result.baseline_rotation == default_result.baseline_rotation


def test_manual_minutes_with_outgoing_player_key_raises_invalid_manual_minutes_error() -> None:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA",
        season_label=SEASON_LABEL,
        player_out_id="a3",
        player_in_id="b1",
        # a3 (the outgoing player) is not part of the scenario roster; including
        # it as a key is an "unexpected" key by apply_manual_minutes's rules.
        manual_minutes={"a1": 100.0, "a2": 100.0, "a3": 0.0, "b1": 40.0},
    )
    with pytest.raises(InvalidManualMinutesError):
        service.build_scenario(request, provider)


def test_manual_minutes_sets_scenario_source_manual_in_minutes_assumptions() -> None:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA",
        season_label=SEASON_LABEL,
        player_out_id="a3",
        player_in_id="b1",
        manual_minutes={"a1": 100.0, "a2": 100.0, "b1": 40.0},
    )
    result = service.build_scenario(request, provider)
    assert result.minutes_assumptions["scenario_source"] == "manual"
    assert result.minutes_assumptions["editable"] is True


def test_swap_validation_errors_take_precedence_over_invalid_manual_minutes() -> None:
    # An unknown incoming player must still surface PlayerNotFoundError, never
    # InvalidManualMinutesError -- manual_minutes validation only makes sense
    # once the scenario roster (which depends on a valid swap) exists.
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    request = RosterScenarioRequest(
        team_id="TMA",
        season_label=SEASON_LABEL,
        player_out_id="a3",
        player_in_id="nobody",
        manual_minutes={"a1": 100.0, "a2": 100.0, "nobody": 40.0},
    )
    with pytest.raises(PlayerNotFoundError):
        service.build_scenario(request, provider)


def test_manual_minutes_contribution_values_computed_from_override_minutes() -> None:
    values = {"a1": 10.0, "a2": 5.0, "a3": 0.0, "b1": 20.0}
    season_data = _synthetic_season_data(values)
    service = RosterScenarioService(season_data, _SYNTHETIC_MINUTES_CONFIG)
    provider = _synthetic_provider(values)
    manual_minutes = {"a1": 100.0, "a2": 100.0, "b1": 40.0}
    request = RosterScenarioRequest(
        team_id="TMA",
        season_label=SEASON_LABEL,
        player_out_id="a3",
        player_in_id="b1",
        manual_minutes=manual_minutes,
    )
    result = service.build_scenario(request, provider)
    expected = sum(values[pid] * (minutes / 240.0) for pid, minutes in manual_minutes.items())
    assert result.scenario_contribution == pytest.approx(expected)


def test_integration_swap_on_real_2014_15_snapshot() -> None:
    season_data = load_historical_season(SEASON_LABEL)
    service = RosterScenarioService(season_data)
    provider = HistoricalRaptorBenchmarkProvider(season_data)
    gsw_ids = sorted(season_data.rosters["GSW"].player_ids())
    outgoing = gsw_ids[0]
    gsw_ids_set = season_data.rosters["GSW"].player_ids()
    incoming = next(pid for pid in season_data.player_seasons if pid not in gsw_ids_set)
    request = RosterScenarioRequest(
        team_id="GSW", season_label=SEASON_LABEL, player_out_id=outgoing, player_in_id=incoming
    )
    result = service.build_scenario(request, provider)
    assert sum(e.minutes for e in result.baseline_rotation) == pytest.approx(240.0, abs=1e-6)
    assert sum(e.minutes for e in result.scenario_rotation) == pytest.approx(240.0, abs=1e-6)
    assert result.data_version == "fivethirtyeight-nba-raptor-2022-11-29"
    assert result.historical_only is True
    assert result.model_version is None
