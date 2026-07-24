"""API contract tests for the read-only season/team/player lookup routes.

Uses FastAPI's TestClient against the real app and the real pinned 2014-15
snapshot, same as tests/test_api_scenarios.py — no live server, no network.

Covers the original 3 UI-002 lookup routes plus the 2 step-8 detail routes
(GET .../players/{player_id}, GET .../teams/{team_id}).
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from backend.api.app import app
from backend.fixtures.historical_loader import load_historical_season
from backend.providers.raptor_benchmark import HistoricalRaptorBenchmarkProvider

SEASON_LABEL = "2014-15"


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def test_list_teams_returns_real_teams_sorted(client: TestClient) -> None:
    response = client.get(f"/seasons/{SEASON_LABEL}/teams")
    assert response.status_code == 200
    body = response.json()
    assert body["season"] == SEASON_LABEL
    assert "GSW" in body["teams"]
    assert body["teams"] == sorted(body["teams"])
    assert len(body["teams"]) == len(set(body["teams"]))


def test_list_teams_unsupported_season_returns_422(client: TestClient) -> None:
    response = client.get("/seasons/1999-00/teams")
    assert response.status_code == 422
    assert response.json()["code"] == "UNSUPPORTED_SEASON"


def test_get_team_roster_returns_real_players_sorted_by_name(client: TestClient) -> None:
    response = client.get(f"/seasons/{SEASON_LABEL}/teams/GSW/roster")
    assert response.status_code == 200
    body = response.json()
    assert body["season"] == SEASON_LABEL
    assert body["team_id"] == "GSW"
    assert len(body["players"]) > 0
    names = [p["name"] for p in body["players"]]
    assert names == sorted(names)
    for player in body["players"]:
        assert isinstance(player["player_id"], str) and player["player_id"]
        assert isinstance(player["minutes"], (int, float))


def test_get_team_roster_matches_domain_loader(client: TestClient) -> None:
    season_data = load_historical_season(SEASON_LABEL)
    expected_ids = season_data.rosters["GSW"].player_ids()
    response = client.get(f"/seasons/{SEASON_LABEL}/teams/GSW/roster")
    actual_ids = {p["player_id"] for p in response.json()["players"]}
    assert actual_ids == expected_ids


def test_get_team_roster_unknown_team_returns_404(client: TestClient) -> None:
    response = client.get(f"/seasons/{SEASON_LABEL}/teams/ZZZ/roster")
    assert response.status_code == 404
    assert response.json()["code"] == "TEAM_NOT_FOUND"


def test_get_team_roster_unsupported_season_returns_422(client: TestClient) -> None:
    response = client.get("/seasons/1999-00/teams/GSW/roster")
    assert response.status_code == 422
    assert response.json()["code"] == "UNSUPPORTED_SEASON"


def test_list_season_players_returns_real_players_sorted_by_name(client: TestClient) -> None:
    response = client.get(f"/seasons/{SEASON_LABEL}/players")
    assert response.status_code == 200
    body = response.json()
    assert body["season"] == SEASON_LABEL
    # A real, well-known 2014-15 player who was NOT on GSW's roster, to prove
    # this endpoint is season-wide, not team-scoped (mirrors the scenario
    # service's own "any team of origin within the season" swap rule).
    season_data = load_historical_season(SEASON_LABEL)
    gsw_ids = season_data.rosters["GSW"].player_ids()
    non_gsw_player_id = next(pid for pid in season_data.player_seasons if pid not in gsw_ids)
    returned_ids = {p["player_id"] for p in body["players"]}
    assert non_gsw_player_id in returned_ids
    names = [p["name"] for p in body["players"]]
    assert names == sorted(names)
    assert len(body["players"]) == len(season_data.player_seasons)


def test_list_season_players_unsupported_season_returns_422(client: TestClient) -> None:
    response = client.get("/seasons/1999-00/players")
    assert response.status_code == 422
    assert response.json()["code"] == "UNSUPPORTED_SEASON"


def test_get_player_returns_real_data_with_full_provenance(client: TestClient) -> None:
    response = client.get(
        f"/seasons/{SEASON_LABEL}/players/curryst01",
        params={"contribution_provider": "historical_benchmark"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["season"] == SEASON_LABEL
    assert body["player_id"] == "curryst01"
    assert body["name"] == "Stephen Curry"
    assert isinstance(body["minutes"], (int, float)) and body["minutes"] > 0
    assert isinstance(body["possessions"], int) and body["possessions"] > 0
    # Single team for the season, but stint minutes/possessions (regular
    # season only) are not asserted equal to the season-blended totals above
    # — the 2014-15 Warriors made the playoffs, so the blended PlayerSeason
    # total includes playoff minutes the by-team regular-season stint doesn't.
    assert [s["team_id"] for s in body["team_stints"]] == ["GSW"]
    assert body["team_stints"][0]["minutes"] <= body["minutes"]
    assert body["team_stints"][0]["possessions"] <= body["possessions"]

    season_data = load_historical_season(SEASON_LABEL)
    provider = HistoricalRaptorBenchmarkProvider(season_data)
    assert body["contribution_value"] == pytest.approx(
        provider.get_player_contribution("curryst01", SEASON_LABEL)
    )
    profile = provider.get_player_profile("curryst01", SEASON_LABEL)
    assert body["offensive_impact"] == pytest.approx(profile.offensive_impact)
    assert body["defensive_impact"] == pytest.approx(profile.defensive_impact)

    assert body["provider_type"] == "historical_raptor_benchmark"
    assert body["provider_version"] == provider.get_provider_version()
    assert body["data_version"] == provider.get_data_version()
    assert body["contribution_epistemic_type"] == "historical_benchmark"
    assert body["attribution"] == [provider.get_attribution()]


def test_get_player_synthetic_provider_returns_synthetic_labels(client: TestClient) -> None:
    response = client.get(
        f"/seasons/{SEASON_LABEL}/players/curryst01",
        params={"contribution_provider": "synthetic"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["provider_type"] == "synthetic"
    assert body["contribution_epistemic_type"] == "synthetic_estimate"


def test_get_player_traded_player_returns_multiple_team_stints(client: TestClient) -> None:
    # Arron Afflalo was traded mid-2014-15: DEN then POR — proves team_stints
    # is a list, not a single team_id, for players who changed teams.
    response = client.get(
        f"/seasons/{SEASON_LABEL}/players/afflaar01",
        params={"contribution_provider": "historical_benchmark"},
    )
    assert response.status_code == 200
    body = response.json()
    stint_team_ids = [s["team_id"] for s in body["team_stints"]]
    assert stint_team_ids == sorted(stint_team_ids)
    assert set(stint_team_ids) == {"DEN", "POR"}
    # Stints are regular-season-only per-team minutes; the season-blended
    # total (PlayerSeason.minutes) may additionally include playoff minutes,
    # so the stint sum is bounded above by, not necessarily equal to, the
    # blended total.
    assert sum(s["minutes"] for s in body["team_stints"]) <= body["minutes"]


def test_get_player_unknown_player_returns_404(client: TestClient) -> None:
    response = client.get(
        f"/seasons/{SEASON_LABEL}/players/nobody00",
        params={"contribution_provider": "historical_benchmark"},
    )
    assert response.status_code == 404
    assert response.json()["code"] == "PLAYER_NOT_FOUND"


def test_get_player_unsupported_season_returns_422(client: TestClient) -> None:
    response = client.get(
        "/seasons/1999-00/players/curryst01",
        params={"contribution_provider": "historical_benchmark"},
    )
    assert response.status_code == 422
    assert response.json()["code"] == "UNSUPPORTED_SEASON"


def test_get_player_missing_contribution_provider_returns_422(client: TestClient) -> None:
    # A missing/invalid contribution_provider fails FastAPI's own request
    # validation before any domain code runs, so the body is FastAPI's
    # default {"detail": [...]}, not the domain {"code", "message"} shape.
    response = client.get(f"/seasons/{SEASON_LABEL}/players/curryst01")
    assert response.status_code == 422


def test_get_player_invalid_contribution_provider_returns_422(client: TestClient) -> None:
    response = client.get(
        f"/seasons/{SEASON_LABEL}/players/curryst01",
        params={"contribution_provider": "not_a_real_provider"},
    )
    assert response.status_code == 422


def test_get_team_returns_roster_and_honest_aggregates(client: TestClient) -> None:
    response = client.get(f"/seasons/{SEASON_LABEL}/teams/GSW")
    assert response.status_code == 200
    body = response.json()
    assert body["season"] == SEASON_LABEL
    assert body["team_id"] == "GSW"
    assert body["roster_size"] == len(body["players"])
    assert body["total_roster_minutes"] == pytest.approx(
        sum(p["minutes"] for p in body["players"])
    )
    # No possessions aggregate is exposed — see get_team_detail's docstring
    # for why summing per-player possessions would misrepresent a team stat.
    assert "total_roster_possessions" not in body

    roster_response = client.get(f"/seasons/{SEASON_LABEL}/teams/GSW/roster")
    assert body["players"] == roster_response.json()["players"]


def test_get_team_unknown_team_returns_404(client: TestClient) -> None:
    response = client.get(f"/seasons/{SEASON_LABEL}/teams/ZZZ")
    assert response.status_code == 404
    assert response.json()["code"] == "TEAM_NOT_FOUND"


def test_get_team_unsupported_season_returns_422(client: TestClient) -> None:
    response = client.get("/seasons/1999-00/teams/GSW")
    assert response.status_code == 422
    assert response.json()["code"] == "UNSUPPORTED_SEASON"
