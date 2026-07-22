"""API contract tests for POST /scenarios.

Uses FastAPI's TestClient against the real app (lifespan-loaded pinned
2014-15 RAPTOR snapshot, same offline local data backend.scenario.service's
own integration test uses) — no live server, no network access.
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


@pytest.fixture(scope="module")
def gsw_outgoing_and_incoming() -> tuple[str, str]:
    season_data = load_historical_season(SEASON_LABEL)
    gsw_ids = season_data.rosters["GSW"].player_ids()
    outgoing = sorted(gsw_ids)[0]
    incoming = next(pid for pid in season_data.player_seasons if pid not in gsw_ids)
    return outgoing, incoming


def _request_body(outgoing: str, incoming: str, **overrides: object) -> dict[str, object]:
    body: dict[str, object] = {
        "team_id": "GSW",
        "season": SEASON_LABEL,
        "player_out_id": outgoing,
        "player_in_id": incoming,
        "contribution_provider": "historical_benchmark",
    }
    body.update(overrides)
    return body


def test_successful_scenario_with_historical_benchmark_provider(
    client: TestClient, gsw_outgoing_and_incoming: tuple[str, str]
) -> None:
    outgoing, incoming = gsw_outgoing_and_incoming
    response = client.post("/scenarios", json=_request_body(outgoing, incoming))
    assert response.status_code == 200
    body = response.json()

    assert body["team_id"] == "GSW"
    assert body["season"] == SEASON_LABEL
    assert body["player_out_id"] == outgoing
    assert body["player_in_id"] == incoming
    assert body["provider_type"] == "historical_raptor_benchmark"
    assert body["contribution_epistemic_type"] == "historical_benchmark"
    assert body["data_version"] == "fivethirtyeight-nba-raptor-2022-11-29"
    assert body["minutes_method"] == "heuristic-v1"
    assert body["historical_only"] is True
    assert body["model_version"] is None
    assert body["attribution"] and isinstance(body["attribution"], list)

    baseline_total = sum(entry["minutes"] for entry in body["baseline_rotation"])
    scenario_total = sum(entry["minutes"] for entry in body["scenario_rotation"])
    assert baseline_total == pytest.approx(240.0, abs=1e-6)
    assert scenario_total == pytest.approx(240.0, abs=1e-6)

    removed = [e for e in body["scenario_rotation"] if e["player_id"] == outgoing]
    assert removed == [{"player_id": outgoing, "minutes": 0.0}]

    for factor in body["explanation_factors"]:
        expected_change = factor["scenario_value"] - factor["baseline_value"]
        assert factor["change"] == pytest.approx(expected_change)


def test_successful_scenario_with_synthetic_provider(
    client: TestClient, gsw_outgoing_and_incoming: tuple[str, str]
) -> None:
    outgoing, incoming = gsw_outgoing_and_incoming
    response = client.post(
        "/scenarios",
        json=_request_body(outgoing, incoming, contribution_provider="synthetic"),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["provider_type"] == "synthetic"
    assert body["contribution_epistemic_type"] == "synthetic_estimate"
    assert body["data_version"] == "synthetic-fixtures-v1"


def test_team_not_found_returns_404(
    client: TestClient, gsw_outgoing_and_incoming: tuple[str, str]
) -> None:
    outgoing, incoming = gsw_outgoing_and_incoming
    response = client.post("/scenarios", json=_request_body(outgoing, incoming, team_id="ZZZ"))
    assert response.status_code == 404
    assert response.json()["code"] == "TEAM_NOT_FOUND"


def test_player_not_found_returns_404(
    client: TestClient, gsw_outgoing_and_incoming: tuple[str, str]
) -> None:
    outgoing = gsw_outgoing_and_incoming[0]
    response = client.post("/scenarios", json=_request_body(outgoing, "no-such-player"))
    assert response.status_code == 404
    assert response.json()["code"] == "PLAYER_NOT_FOUND"


def test_player_not_on_roster_returns_422(
    client: TestClient, gsw_outgoing_and_incoming: tuple[str, str]
) -> None:
    incoming = gsw_outgoing_and_incoming[1]
    # incoming (not on GSW's roster) used as player_out_id -> PLAYER_NOT_ON_ROSTER.
    response = client.post("/scenarios", json=_request_body(incoming, incoming))
    assert response.status_code == 422
    assert response.json()["code"] == "PLAYER_NOT_ON_ROSTER"


def test_player_already_on_roster_returns_409(
    client: TestClient, gsw_outgoing_and_incoming: tuple[str, str]
) -> None:
    outgoing = gsw_outgoing_and_incoming[0]
    season_data = load_historical_season(SEASON_LABEL)
    gsw_ids = sorted(season_data.rosters["GSW"].player_ids())
    already_on_roster = next(pid for pid in gsw_ids if pid != outgoing)
    response = client.post("/scenarios", json=_request_body(outgoing, already_on_roster))
    assert response.status_code == 409
    assert response.json()["code"] == "PLAYER_ALREADY_ON_ROSTER"


def test_same_player_swap_returns_422(
    client: TestClient, gsw_outgoing_and_incoming: tuple[str, str]
) -> None:
    outgoing = gsw_outgoing_and_incoming[0]
    response = client.post("/scenarios", json=_request_body(outgoing, outgoing))
    assert response.status_code == 422
    assert response.json()["code"] == "SAME_PLAYER_SWAP"


def test_unsupported_season_returns_422(
    client: TestClient, gsw_outgoing_and_incoming: tuple[str, str]
) -> None:
    outgoing, incoming = gsw_outgoing_and_incoming
    response = client.post(
        "/scenarios", json=_request_body(outgoing, incoming, season="1999-00")
    )
    assert response.status_code == 422
    assert response.json()["code"] == "UNSUPPORTED_SEASON"


def test_invalid_provider_choice_returns_422_validation_error(
    client: TestClient, gsw_outgoing_and_incoming: tuple[str, str]
) -> None:
    outgoing, incoming = gsw_outgoing_and_incoming
    response = client.post(
        "/scenarios",
        json=_request_body(outgoing, incoming, contribution_provider="pce"),
    )
    assert response.status_code == 422
    # FastAPI's own request-validation error shape, not a domain error code.
    assert "detail" in response.json()


def test_missing_required_field_returns_422_validation_error(client: TestClient) -> None:
    response = client.post(
        "/scenarios",
        json={"team_id": "GSW", "season": SEASON_LABEL, "player_out_id": "x"},
    )
    assert response.status_code == 422
