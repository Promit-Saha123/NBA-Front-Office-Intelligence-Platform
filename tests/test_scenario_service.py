"""Tests for backend.scenario.service — synthetic fixtures for exact calculations,
the pinned 2014-15 snapshot for integration coverage. No live endpoints."""

import dataclasses

import pytest

from backend.domain.errors import (
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
        data_version="synthetic-fixtures-v1",
        attribution="Synthetic test fixture",
        source_license="N/A (test fixture)",
    )


def _synthetic_provider(values: dict[str, float]) -> SyntheticContributionProvider:
    explicit = {(pid, SEASON_LABEL): value for pid, value in values.items()}
    return SyntheticContributionProvider(
        SyntheticContributionConfig(data_version="synthetic-fixtures-v1"), explicit_values=explicit
    )


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
    total_minutes = result.minutes_assumptions["total_minutes"]
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
    assert result.minutes_assumptions["editable"] is False
    assert result.minutes_assumptions["validated"] is False
    assert result.minutes_assumptions["total_minutes"] == 240.0


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


# --- Integration test against the real pinned 2014-15 snapshot ---


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
