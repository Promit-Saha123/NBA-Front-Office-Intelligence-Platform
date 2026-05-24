"""
fetch_historical.py
-------------------
Pulls 5 seasons of NBA game logs from nba_api and saves them as CSVs.
Run this ONCE to bootstrap your dataset before training the model.

Usage:
    python scripts/fetch_historical.py
"""

import time
import logging
import pandas as pd
import os
from pathlib import Path
from nba_api.stats.endpoints import leaguegamelog, teamgamelogs
from nba_api.stats.static import teams

# ── Config ────────────────────────────────────────────────────────────────────
SEASONS = ["2019-20", "2020-21", "2021-22", "2022-23", "2023-24"]

# Resolve paths relative to this file for robust execution from any CWD
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "backend" / "data" / "raw"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# nba_api is rate-limited — always sleep between calls
API_DELAY = 1.0  # seconds


# ── Helpers ───────────────────────────────────────────────────────────────────

def fetch_season_games(season: str) -> pd.DataFrame:
    """Fetch all regular season game logs for a given season."""
    logger.info("Fetching season %s", season)
    log = leaguegamelog.LeagueGameLog(
        season=season,
        season_type_all_star="Regular Season",
        league_id="00",
    )
    df = log.get_data_frames()[0]
    time.sleep(API_DELAY)
    return df


def build_game_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transform raw game logs into a matchup feature table.

    Each row = one game from ONE team's perspective.
    We'll merge home/away pairs in the training script.

    Key columns produced:
        GAME_ID, TEAM_ID, GAME_DATE, HOME, WL,
        PTS, FG_PCT, FT_PCT, FG3_PCT, REB, AST, TOV, PLUS_MINUS
    """
    df = df.copy()

    # Derive home/away from MATCHUP string  ("BOS vs. MIA" = home, "BOS @ MIA" = away)
    df["HOME"] = df["MATCHUP"].apply(lambda m: 1 if "vs." in m else 0)

    # Binary win label
    df["WIN"] = (df["WL"] == "W").astype(int)

    # Keep only the columns we need
    cols = [
        "SEASON_ID", "GAME_ID", "GAME_DATE", "TEAM_ID", "TEAM_ABBREVIATION",
        "HOME", "WIN", "WL",
        "PTS", "FGA", "FGM", "FG_PCT",
        "FG3A", "FG3M", "FG3_PCT",
        "FTA", "FTM", "FT_PCT",
        "OREB", "DREB", "REB",
        "AST", "TOV", "STL", "BLK",
        "PLUS_MINUS",
    ]
    df = df[[c for c in cols if c in df.columns]]

    # Parse date
    df["GAME_DATE"] = pd.to_datetime(df["GAME_DATE"])

    return df.sort_values(["TEAM_ID", "GAME_DATE"]).reset_index(drop=True)


def add_rolling_averages(df: pd.DataFrame, windows: list[int] = [5, 10]) -> pd.DataFrame:
    """
    For each team, compute rolling averages of key stats.
    Uses shift(1) so we never leak future data into features.
    """
    stat_cols = ["PTS", "FG_PCT", "FG3_PCT", "FT_PCT", "REB", "AST", "TOV", "PLUS_MINUS"]

    for window in windows:
        for col in stat_cols:
            if col not in df.columns:
                continue
            df[f"{col}_roll{window}"] = (
                df.groupby("TEAM_ID")[col]
                .transform(lambda x: x.shift(1).rolling(window, min_periods=1).mean())
            )

    return df


def add_rest_days(df: pd.DataFrame) -> pd.DataFrame:
    """Days since each team's last game (capped at 7)."""
    df = df.sort_values(["TEAM_ID", "GAME_DATE"])
    df["PREV_GAME_DATE"] = df.groupby("TEAM_ID")["GAME_DATE"].shift(1)
    df["REST_DAYS"] = (df["GAME_DATE"] - df["PREV_GAME_DATE"]).dt.days.clip(upper=7).fillna(3)
    df.drop(columns=["PREV_GAME_DATE"], inplace=True)
    return df


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    all_seasons = []

    logger.info("Fetching raw game logs from nba_api...")
    for season in SEASONS:
        raw = fetch_season_games(season)
        processed = build_game_features(raw)
        all_seasons.append(processed)
        logger.info("%s: %d team-game rows", season, len(processed))

    logger.info("Combining seasons and engineering features...")
    df = pd.concat(all_seasons, ignore_index=True)
    df = add_rolling_averages(df)
    df = add_rest_days(df)

    # Save team-level features (one row per team per game)
    team_path = OUTPUT_DIR / "team_game_logs.csv"
    df.to_csv(team_path, index=False)
    logger.info("Saved team game logs → %s (%d rows)", team_path, len(df))

    # Build matchup table: merge home team row with away team row on the same GAME_ID
    logger.info("Building matchup (home vs. away) table...")
    home = df[df["HOME"] == 1].copy()
    away = df[df["HOME"] == 0].copy()

    matchup = home.merge(
        away,
        on="GAME_ID",
        suffixes=("_home", "_away"),
    )

    # Drop redundant GAME_DATE_away columns if present
    matchup.drop(
        columns=[c for c in matchup.columns if c.endswith("_away") and "GAME_DATE" in c],
        errors="ignore",
        inplace=True,
    )

    matchup_path = OUTPUT_DIR / "matchups.csv"
    matchup.to_csv(matchup_path, index=False)
    logger.info("Saved matchup table → %s (%d games)", matchup_path, len(matchup))

    logger.info("Data pipeline complete. Next step: run backend/models/train.py")


if __name__ == "__main__":
    main()
