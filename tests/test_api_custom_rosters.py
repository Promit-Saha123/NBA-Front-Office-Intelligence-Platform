"""API contract tests for POST /custom-rosters (decision 0014).

Uses FastAPI's TestClient against the real app (lifespan-loaded pinned
2014-15 RAPTOR snapshot, same offline local data test_api_scenarios.py
uses) — no live server, no network access.
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
def twelve_player_ids() -> list[str]:
    season_data = load_historical_season(SEASON_LABEL)
    return sorted(season_data.player_seasons)[:12]


def _request_body(player_ids: list[str], **overrides: object) -> dict[str, object]:
    body: dict[str, object] = {
        "season": SEASON_LABEL,
        "player_ids": player_ids,
        "contribution_provider": "historical_benchmark",
    }
    body.update(overrides)
    return body


def test_successful_custom_roster_with_historical_benchmark_provider(
    client: TestClient, twelve_player_ids: list[str]
) -> None:
    response = client.post("/custom-rosters", json=_request_body(twelve_player_ids))
    assert response.status_code == 200
    body = response.json()

    assert body["season"] == SEASON_LABEL
    assert sorted(body["player_ids"]) == sorted(twelve_player_ids)
    assert body["provider_type"] == "historical_raptor_benchmark"
    assert body["contribution_epistemic_type"] == "historical_benchmark"
    assert body["data_version"] == "fivethirtyeight-nba-raptor-2022-11-29"
    assert body["minutes_method"] == "heuristic-v1"
    assert body["historical_only"] is True
    assert body["model_version"] is None
    assert body["attribution"] and isinstance(body["attribution"], list)

    total_minutes = sum(entry["minutes"] for entry in body["rotation"])
    assert total_minutes == pytest.approx(240.0, abs=1e-6)

    assert {c["category"] for c in body["team_profile"]} == {
        "offensive_impact",
        "defensive_impact",
    }
    for category in body["team_profile"]:
        assert category["epistemic_type"] == "descriptive_interpretation"
        assert "baseline_value" not in category
        assert "change" not in category

    assert "baseline_rotation" not in body
    assert "scenario_rotation" not in body
    assert "contribution_change" not in body


def test_successful_custom_roster_with_synthetic_provider(
    client: TestClient, twelve_player_ids: list[str]
) -> None:
    response = client.post(
        "/custom-rosters",
        json=_request_body(twelve_player_ids, contribution_provider="synthetic"),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["provider_type"] == "synthetic"
    assert body["contribution_epistemic_type"] == "synthetic_estimate"
    assert body["data_version"] == "synthetic-fixtures-v1"


def test_wrong_roster_size_returns_422(client: TestClient, twelve_player_ids: list[str]) -> None:
    response = client.post("/custom-rosters", json=_request_body(twelve_player_ids[:11]))
    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_CUSTOM_ROSTER"


def test_duplicate_player_returns_422(client: TestClient, twelve_player_ids: list[str]) -> None:
    duplicated = [*twelve_player_ids[:11], twelve_player_ids[0]]
    response = client.post("/custom-rosters", json=_request_body(duplicated))
    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_CUSTOM_ROSTER"


def test_unknown_player_returns_404(client: TestClient, twelve_player_ids: list[str]) -> None:
    with_unknown = [*twelve_player_ids[:11], "no-such-player"]
    response = client.post("/custom-rosters", json=_request_body(with_unknown))
    assert response.status_code == 404
    assert response.json()["code"] == "PLAYER_NOT_FOUND"


def test_unsupported_season_returns_422(client: TestClient, twelve_player_ids: list[str]) -> None:
    response = client.post(
        "/custom-rosters", json=_request_body(twelve_player_ids, season="1999-00")
    )
    assert response.status_code == 422
    assert response.json()["code"] == "UNSUPPORTED_SEASON"


def test_manual_minutes_override(client: TestClient, twelve_player_ids: list[str]) -> None:
    manual_minutes = dict.fromkeys(twelve_player_ids, 20.0)
    response = client.post(
        "/custom-rosters",
        json=_request_body(twelve_player_ids, manual_minutes=manual_minutes),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["minutes_assumptions"]["scenario_source"] == "manual"
    rotation_minutes = {entry["player_id"]: entry["minutes"] for entry in body["rotation"]}
    assert rotation_minutes == manual_minutes
