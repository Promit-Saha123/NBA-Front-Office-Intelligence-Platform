"""Reusable data-source audit checks for tabular player-season data.

Deterministic, offline profiling of a local CSV or Parquet file. Produces the
structured findings recorded under docs/data-audits/ by the audit workflow
(workflows/audit-data-source.md). Auditing never modifies the input file.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd


@dataclass
class ColumnProfile:
    name: str
    dtype: str
    null_count: int
    null_fraction: float
    distinct_count: int


@dataclass
class AuditReport:
    source_path: str
    row_count: int
    column_count: int
    columns: list[ColumnProfile]
    key_columns: list[str]
    duplicate_key_rows: int
    season_column: str | None
    season_min: int | None
    season_max: int | None
    missing_seasons: list[int] = field(default_factory=list)
    rows_per_season: dict[int, int] = field(default_factory=dict)
    unparseable_season_rows: int = 0
    id_column: str | None = None
    blank_id_rows: int = 0
    names_per_id_max: int = 0
    ids_per_name_max: int = 0


def load_table(path: Path) -> pd.DataFrame:
    """Load a CSV or Parquet file into a DataFrame without mutating the source."""
    suffix = path.suffix.lower()
    if suffix == ".csv":
        try:
            return pd.read_csv(path)
        except pd.errors.EmptyDataError as exc:
            raise ValueError(f"Empty CSV file with no columns: {path}") from exc
    if suffix == ".parquet":
        return pd.read_parquet(path)
    raise ValueError(f"Unsupported file type '{suffix}': expected .csv or .parquet")


def audit_table(
    df: pd.DataFrame,
    source_path: str,
    key_columns: list[str],
    season_column: str | None = None,
    id_column: str | None = None,
    name_column: str | None = None,
) -> AuditReport:
    """Profile a table: nulls, duplicate keys, season continuity, identifier sanity.

    `key_columns` defines the intended canonical grain; duplicated keys indicate
    potential double counting. Season continuity flags gaps inside the covered
    range. Identifier checks require `id_column` (and `name_column` for
    id-vs-name consistency).
    """
    missing = [c for c in key_columns if c not in df.columns]
    if missing:
        raise ValueError(f"Key columns not present in table: {missing}")

    columns = [
        ColumnProfile(
            name=str(col),
            dtype=str(df[col].dtype),
            null_count=int(df[col].isna().sum()),
            null_fraction=float(df[col].isna().mean()) if len(df) else 0.0,
            distinct_count=int(df[col].nunique(dropna=True)),
        )
        for col in df.columns
    ]

    duplicate_key_rows = int(df.duplicated(subset=key_columns).sum())

    season_min: int | None = None
    season_max: int | None = None
    missing_seasons: list[int] = []
    rows_per_season: dict[int, int] = {}
    unparseable_season_rows = 0
    if season_column is not None:
        if season_column not in df.columns:
            raise ValueError(f"Season column '{season_column}' not present in table")
        parsed = pd.to_numeric(df[season_column], errors="coerce")
        unparseable_season_rows = int((parsed.isna() & df[season_column].notna()).sum())
        seasons = parsed.dropna().astype(int)
        if not seasons.empty:
            season_min = int(seasons.min())
            season_max = int(seasons.max())
            present = set(seasons.unique())
            missing_seasons = [s for s in range(season_min, season_max + 1) if s not in present]
            counts = seasons.value_counts().sort_index()
            rows_per_season = {int(str(k)): int(v) for k, v in counts.items()}

    blank_id_rows = 0
    names_per_id_max = 0
    ids_per_name_max = 0
    if id_column is not None:
        if id_column not in df.columns:
            raise ValueError(f"Id column '{id_column}' not present in table")
        ids = df[id_column]
        blank_id_rows = int((ids.isna() | (ids.astype(str).str.strip() == "")).sum())
        if name_column is not None:
            if name_column not in df.columns:
                raise ValueError(f"Name column '{name_column}' not present in table")
            names_per_id = df.groupby(id_column)[name_column].nunique()
            ids_per_name = df.groupby(name_column)[id_column].nunique()
            names_per_id_max = int(names_per_id.max()) if not names_per_id.empty else 0
            ids_per_name_max = int(ids_per_name.max()) if not ids_per_name.empty else 0

    return AuditReport(
        source_path=source_path,
        row_count=len(df),
        column_count=len(df.columns),
        columns=columns,
        key_columns=list(key_columns),
        duplicate_key_rows=duplicate_key_rows,
        season_column=season_column,
        season_min=season_min,
        season_max=season_max,
        missing_seasons=missing_seasons,
        rows_per_season=rows_per_season,
        unparseable_season_rows=unparseable_season_rows,
        id_column=id_column,
        blank_id_rows=blank_id_rows,
        names_per_id_max=names_per_id_max,
        ids_per_name_max=ids_per_name_max,
    )


def render_markdown(report: AuditReport) -> str:
    """Render an AuditReport as a Markdown fragment for docs/data-audits/."""
    lines = [
        f"### Automated audit: `{report.source_path}`",
        "",
        f"* Rows: {report.row_count}",
        f"* Columns: {report.column_count}",
        f"* Key columns: {', '.join(f'`{c}`' for c in report.key_columns)}",
        f"* Duplicate rows on key: **{report.duplicate_key_rows}**",
    ]
    if report.season_column is not None:
        lines.append(
            f"* Season range (`{report.season_column}`): "
            f"{report.season_min}–{report.season_max}"
        )
        gap_text = ", ".join(map(str, report.missing_seasons)) if report.missing_seasons else "none"
        lines.append(f"* Missing seasons inside range: {gap_text}")
        lines.append(f"* Unparseable season values: {report.unparseable_season_rows}")
    if report.id_column is not None:
        lines.append(f"* Blank/null `{report.id_column}` rows: {report.blank_id_rows}")
        if report.names_per_id_max:
            lines.append(f"* Max distinct names per id: {report.names_per_id_max}")
            lines.append(f"* Max distinct ids per name: {report.ids_per_name_max}")
    lines += [
        "",
        "| Column | Dtype | Nulls | Null % | Distinct |",
        "|---|---|---|---|---|",
    ]
    for col in report.columns:
        lines.append(
            f"| `{col.name}` | {col.dtype} | {col.null_count} "
            f"| {col.null_fraction:.2%} | {col.distinct_count} |"
        )
    lines.append("")
    return "\n".join(lines)
