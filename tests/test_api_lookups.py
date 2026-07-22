"""API contract tests for the read-only season/team/player lookup routes (UI-002).

Uses FastAPI's TestClient against the real app and the real pinned 2014-15
snapshot, same as tests/test_api_scenarios.py — no live server, no network.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from backend.api.app import app
from backend.fixtures.historical_loader import load_historical_season

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
