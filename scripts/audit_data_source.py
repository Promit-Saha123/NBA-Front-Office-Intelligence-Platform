"""Audit a local CSV or Parquet data file (thin CLI over data_pipeline.audit).

Usage:
    uv run python scripts/audit_data_source.py <file> --key player_id season \
        [--season-col season] [--id-col player_id] [--name-col player_name] \
        [--output docs/data-audits/<name>.md]

Runs offline against a local file only; never contacts a live endpoint.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from data_pipeline.audit import audit_table, load_table, render_markdown


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path, help="Local .csv or .parquet file to audit")
    parser.add_argument(
        "--key", nargs="+", required=True, help="Columns forming the intended canonical key"
    )
    parser.add_argument("--season-col", default=None, help="Season column for coverage checks")
    parser.add_argument("--id-col", default=None, help="Player identifier column")
    parser.add_argument("--name-col", default=None, help="Player name column (id consistency)")
    parser.add_argument(
        "--output", type=Path, default=None, help="Write Markdown report here (default: stdout)"
    )
    args = parser.parse_args(argv)

    df = load_table(args.file)
    report = audit_table(
        df,
        source_path=str(args.file),
        key_columns=args.key,
        season_column=args.season_col,
        id_column=args.id_col,
        name_column=args.name_col,
    )
    markdown = render_markdown(report)
    if args.output is not None:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(markdown, encoding="utf-8")
        print(f"Wrote {args.output}")
    else:
        print(markdown)
    return 0


if __name__ == "__main__":
    sys.exit(main())
