"""Export the FastAPI OpenAPI schema for frontend codegen.

Thin CLI over backend.api.openapi_export.

Usage:
    uv run python scripts/export_openapi_schema.py [--output backend/api/openapi.json]
    uv run python scripts/export_openapi_schema.py --check   # exit 1 if the committed file is stale

Never starts a server; ``FastAPI.openapi()`` only inspects routes/models.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from backend.api.openapi_export import (
    DEFAULT_OUTPUT_PATH,
    build_openapi_schema,
    export_openapi_schema,
    render_openapi_schema,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Do not write; exit 1 if --output does not match a freshly generated schema",
    )
    args = parser.parse_args(argv)

    if args.check:
        current = render_openapi_schema(build_openapi_schema())
        on_disk = args.output.read_text(encoding="utf-8") if args.output.is_file() else None
        if on_disk != current:
            print(f"{args.output} is stale; regenerate with:", file=sys.stderr)
            print("  uv run python scripts/export_openapi_schema.py", file=sys.stderr)
            return 1
        print(f"{args.output} is up to date.")
        return 0

    export_openapi_schema(args.output)
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
