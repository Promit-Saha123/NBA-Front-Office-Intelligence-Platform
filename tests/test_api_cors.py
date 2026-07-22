"""Tests for the configurable CORS origin list (backend/api/app.py).

Two levels: unit tests for `_frontend_origins()`'s parsing rules in isolation
(no app/env-import-order coupling), and an integration check that a real CORS
preflight against the running app actually reflects an allowed origin and
rejects an unlisted one -- proving the parsed list is the one Starlette's
CORSMiddleware is actually configured with, not just that the parser works.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from backend.api.app import DEFAULT_FRONTEND_ORIGINS, _frontend_origins, app


def test_default_frontend_origins_cover_the_documented_next_dev_addresses() -> None:
    assert _frontend_origins() == [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


def test_frontend_origins_reads_a_custom_comma_separated_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("FRONTEND_ORIGINS", "https://example.com,https://staging.example.com")
    assert _frontend_origins() == ["https://example.com", "https://staging.example.com"]


def test_frontend_origins_strips_whitespace_and_drops_empty_entries(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("FRONTEND_ORIGINS", " https://example.com , , https://other.example.com ")
    assert _frontend_origins() == ["https://example.com", "https://other.example.com"]


def test_frontend_origins_never_returns_a_wildcard(monkeypatch: pytest.MonkeyPatch) -> None:
    # No code path parses "*" specially -- documenting the invariant directly:
    # a wildcard would only ever appear if someone put it in the env var, and
    # this test exists so that possibility is at least visible in the suite.
    monkeypatch.setenv("FRONTEND_ORIGINS", "https://example.com")
    assert "*" not in _frontend_origins()


def test_default_frontend_origins_constant_matches_the_documented_env_default() -> None:
    assert DEFAULT_FRONTEND_ORIGINS == "http://localhost:3000,http://127.0.0.1:3000"


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def test_cors_preflight_allows_a_configured_dev_origin(client: TestClient) -> None:
    response = client.options(
        "/scenarios",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_preflight_rejects_an_unlisted_origin(client: TestClient) -> None:
    response = client.options(
        "/scenarios",
        headers={
            "Origin": "https://not-an-allowed-origin.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    # Starlette's CORSMiddleware still returns 200 for the preflight itself,
    # but omits the allow-origin header for a disallowed origin -- that
    # missing header is what makes the browser block the real request.
    assert "access-control-allow-origin" not in response.headers


def test_cors_credentials_are_not_enabled(client: TestClient) -> None:
    response = client.options(
        "/scenarios",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    # No auth exists yet (decision 0008) -- allow_credentials must stay unset/False
    # until authentication is actually added, per CORSMiddleware's own security model.
    assert "access-control-allow-credentials" not in response.headers
