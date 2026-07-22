"""Deterministic OpenAPI schema export for the frontend codegen workflow.

``FastAPI.openapi()`` only inspects registered routes and Pydantic models —
it never runs the ``lifespan`` startup (no season data is loaded, no
providers are constructed) and makes no network or filesystem access beyond
this write, so schema export never needs a running server (see
docs/decisions/0008-roster-lab-frontend-architecture.md, clarification 1).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DEFAULT_OUTPUT_PATH = Path(__file__).resolve().parent / "openapi.json"


def build_openapi_schema() -> dict[str, Any]:
    """Return the app's OpenAPI schema as a plain dict, without starting the app."""
    from backend.api.app import app

    return app.openapi()


def render_openapi_schema(schema: dict[str, Any]) -> str:
    """Serialize a schema deterministically (sorted keys, stable whitespace, trailing newline).

    Byte-for-byte stability is what lets a regenerate-and-diff check
    (``scripts/export_openapi_schema.py --check``) detect staleness reliably.
    """
    return json.dumps(schema, indent=2, sort_keys=True) + "\n"


def export_openapi_schema(output_path: Path = DEFAULT_OUTPUT_PATH) -> str:
    """Write the deterministic OpenAPI schema to ``output_path``; return the text written."""
    text = render_openapi_schema(build_openapi_schema())
    output_path.write_text(text, encoding="utf-8")
    return text
