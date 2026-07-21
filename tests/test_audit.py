"""Tests for data_pipeline.audit and the audit CLI — offline only, no live endpoints."""

import importlib.util
from pathlib import Path
from types import ModuleType

import pandas as pd
import pytest

from data_pipeline.audit import audit_table, load_table, render_markdown

REPO_ROOT = Path(__file__).resolve().parent.parent


def sample_frame() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "player_id": ["a01", "b02", "b02", "c03", ""],
            "player_name": ["Ann One", "Bob Two", "Bob Two", "Cal Three", "Dee Four"],
            "season": [2019, 2019, 2019, 2021, 2021],
            "metric": [1.0, 2.0, 2.0, None, 4.0],
        }
    )


def load_cli() -> ModuleType:
    path = REPO_ROOT / "scripts" / "audit_data_source.py"
    spec = importlib.util.spec_from_file_location("audit_data_source", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_duplicate_key_detection() -> None:
    report = audit_table(sample_frame(), "s", key_columns=["player_id", "season"])
    assert report.duplicate_key_rows == 1


def test_season_gap_detection() -> None:
    report = audit_table(
        sample_frame(), "s", key_columns=["player_id", "season"], season_column="season"
    )
    assert report.season_min == 2019
    assert report.season_max == 2021
    assert report.missing_seasons == [2020]
    assert report.rows_per_season == {2019: 3, 2021: 2}
    assert report.unparseable_season_rows == 0


def test_null_and_blank_id_counts() -> None:
    report = audit_table(
        sample_frame(),
        "s",
        key_columns=["player_id", "season"],
        id_column="player_id",
        name_column="player_name",
    )
    assert report.blank_id_rows == 1
    metric = next(c for c in report.columns if c.name == "metric")
    assert metric.null_count == 1


def test_missing_key_column_raises() -> None:
    with pytest.raises(ValueError, match="Key columns not present"):
        audit_table(sample_frame(), "s", key_columns=["nope"])


def test_missing_season_column_raises() -> None:
    with pytest.raises(ValueError, match="Season column 'yr' not present"):
        audit_table(sample_frame(), "s", key_columns=["player_id"], season_column="yr")


def test_missing_id_column_raises() -> None:
    with pytest.raises(ValueError, match="Id column 'pid' not present"):
        audit_table(sample_frame(), "s", key_columns=["player_id"], id_column="pid")


def test_missing_name_column_raises() -> None:
    with pytest.raises(ValueError, match="Name column 'nm' not present"):
        audit_table(
            sample_frame(),
            "s",
            key_columns=["player_id"],
            id_column="player_id",
            name_column="nm",
        )


def test_empty_dataframe_does_not_fail() -> None:
    empty = sample_frame().iloc[0:0]
    report = audit_table(
        empty,
        "s",
        key_columns=["player_id", "season"],
        season_column="season",
        id_column="player_id",
        name_column="player_name",
    )
    assert report.row_count == 0
    assert report.duplicate_key_rows == 0
    assert report.season_min is None
    assert report.season_max is None
    assert report.blank_id_rows == 0
    assert report.names_per_id_max == 0
    assert report.ids_per_name_max == 0
    assert "Rows: 0" in render_markdown(report)


def test_malformed_season_values_are_counted_not_silently_dropped() -> None:
    df = sample_frame()
    df["season"] = ["2019", "2019", "not-a-year", "2021", "2019-20"]
    report = audit_table(df, "s", key_columns=["player_id"], season_column="season")
    assert report.season_min == 2019
    assert report.season_max == 2021
    assert report.unparseable_season_rows == 2
    assert "Unparseable season values: 2" in render_markdown(report)


def test_render_markdown_contains_findings() -> None:
    report = audit_table(
        sample_frame(), "s", key_columns=["player_id", "season"], season_column="season"
    )
    text = render_markdown(report)
    assert "Duplicate rows on key: **1**" in text
    assert "Missing seasons inside range: 2020" in text
    assert "| `metric` |" in text


def test_load_table_csv_and_rejects_unknown(tmp_path: Path) -> None:
    csv_path = tmp_path / "t.csv"
    sample_frame().to_csv(csv_path, index=False)
    df = load_table(csv_path)
    assert len(df) == 5
    with pytest.raises(ValueError, match="Unsupported file type"):
        load_table(tmp_path / "t.xlsx")


def test_load_table_parquet(tmp_path: Path) -> None:
    parquet_path = tmp_path / "t.parquet"
    sample_frame().to_parquet(parquet_path, index=False)
    df = load_table(parquet_path)
    assert len(df) == 5
    assert list(df.columns) == ["player_id", "player_name", "season", "metric"]


def test_load_table_headers_only_csv(tmp_path: Path) -> None:
    csv_path = tmp_path / "empty_rows.csv"
    csv_path.write_text("player_id,season\n", encoding="utf-8")
    df = load_table(csv_path)
    assert len(df) == 0
    report = audit_table(df, "s", key_columns=["player_id"], season_column="season")
    assert report.row_count == 0


def test_load_table_zero_byte_csv_raises(tmp_path: Path) -> None:
    csv_path = tmp_path / "zero.csv"
    csv_path.write_text("", encoding="utf-8")
    with pytest.raises(ValueError, match="Empty CSV file"):
        load_table(csv_path)


def test_audit_is_deterministic() -> None:
    key = ["player_id", "season"]
    a = audit_table(sample_frame(), "s", key_columns=key, season_column="season")
    b = audit_table(sample_frame(), "s", key_columns=key, season_column="season")
    assert render_markdown(a) == render_markdown(b)


def test_cli_requires_key_argument(tmp_path: Path) -> None:
    cli = load_cli()
    csv_path = tmp_path / "t.csv"
    sample_frame().to_csv(csv_path, index=False)
    with pytest.raises(SystemExit):
        cli.main([str(csv_path)])


def test_cli_writes_markdown_output(tmp_path: Path) -> None:
    cli = load_cli()
    csv_path = tmp_path / "t.csv"
    sample_frame().to_csv(csv_path, index=False)
    out_path = tmp_path / "reports" / "audit.md"
    code = cli.main(
        [
            str(csv_path),
            "--key",
            "player_id",
            "season",
            "--season-col",
            "season",
            "--id-col",
            "player_id",
            "--name-col",
            "player_name",
            "--output",
            str(out_path),
        ]
    )
    assert code == 0
    text = out_path.read_text(encoding="utf-8")
    assert "Duplicate rows on key: **1**" in text
    assert "Season range (`season`): 2019–2021" in text


def test_cli_prints_to_stdout_by_default(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    cli = load_cli()
    csv_path = tmp_path / "t.csv"
    sample_frame().to_csv(csv_path, index=False)
    code = cli.main([str(csv_path), "--key", "player_id", "season"])
    assert code == 0
    assert "Duplicate rows on key: **1**" in capsys.readouterr().out
