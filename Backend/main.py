"""
main.py
-------
FastAPI server that serves NBA game predictions.

Endpoints:
    GET /                        → health check
    GET /predictions/today       → today's predicted games
    GET /predictions/{game_id}   → single game prediction
    GET /accuracy                → model historical accuracy stats
"""

import logging
import joblib
import numpy as np
import pandas as pd
import os
from datetime import date, timedelta
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Load .env if present
load_dotenv()

# ── Setup ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="NBA Predictor API", version="1.0")

# Configure CORS origins from env (default to localhost during development)
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve paths relative to this file and allow ARTIFACTS_DIR override
BASE_DIR = Path(__file__).resolve().parent
artifacts_env = os.getenv("ARTIFACTS_DIR")
if artifacts_env:
    ARTIFACTS_DIR = Path(artifacts_env)
    MODEL_DIR = ARTIFACTS_DIR / "models" / "saved"
    DATA_DIR = ARTIFACTS_DIR / "data" / "raw"
else:
    MODEL_DIR = BASE_DIR / "backend" / "models" / "saved"
    DATA_DIR  = BASE_DIR / "backend" / "data" / "raw"

# Globals that will be populated on startup
model = None
feature_cols = None
matchups_df = None
_cached_accuracy = None


# ── Schemas ───────────────────────────────────────────────────────────────────

class TeamPrediction(BaseModel):
    game_id: str
    game_date: str
    home_team: str
    away_team: str
    predicted_winner: str
    home_win_probability: float
    away_win_probability: float
    confidence: str  # "High" / "Medium" / "Low"


class AccuracyStats(BaseModel):
    overall_accuracy: float
    last_30_days_accuracy: float
    total_games_predicted: int
    correct_predictions: int


# ── Helpers ───────────────────────────────────────────────────────────────────

def confidence_label(prob: float) -> str:
    if prob >= 0.65:
        return "High"
    elif prob >= 0.55:
        return "Medium"
    return "Low"


def predict_game(row: pd.Series) -> TeamPrediction:
    """Run model inference on a single matchup row."""
    X = row[feature_cols].fillna(0).values.reshape(1, -1)
    prob = model.predict_proba(X)[0]
    home_prob, away_prob = float(prob[1]), float(prob[0])

    predicted_winner = (
        row.get("TEAM_ABBREVIATION_home", "HOME")
        if home_prob >= 0.5
        else row.get("TEAM_ABBREVIATION_away", "AWAY")
    )

    return TeamPrediction(
        game_id=str(row["GAME_ID"]),
        game_date=str(row["GAME_DATE_home"].date()),
        home_team=row.get("TEAM_ABBREVIATION_home", "HOME"),
        away_team=row.get("TEAM_ABBREVIATION_away", "AWAY"),
        predicted_winner=predicted_winner,
        home_win_probability=round(home_prob, 4),
        away_win_probability=round(away_prob, 4),
        confidence=confidence_label(max(home_prob, away_prob)),
    )


def compute_accuracy_stats() -> dict:
    global _cached_accuracy
    if model is None or feature_cols is None or matchups_df is None:
        return None

    df = matchups_df.dropna(subset=feature_cols + ["WIN_home"]).copy()
    X  = df[feature_cols].fillna(0)
    y  = df["WIN_home"]

    preds   = model.predict(X)
    correct = int((preds == y).sum())
    total   = len(y)

    # Last 30 days
    cutoff    = pd.Timestamp(date.today()) - timedelta(days=30)
    recent    = df[df["GAME_DATE_home"] >= cutoff]
    recent_acc = 0.0
    if not recent.empty:
        X_r = recent[feature_cols].fillna(0)
        y_r = recent["WIN_home"]
        recent_acc = float((model.predict(X_r) == y_r).mean())

    _cached_accuracy = {
        "overall_accuracy": round(correct / total, 4) if total else 0.0,
        "last_30_days_accuracy": round(recent_acc, 4),
        "total_games_predicted": int(total),
        "correct_predictions": int(correct),
    }
    return _cached_accuracy


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    return {"status": "ok", "model": "NBA Predictor v1"}


@app.get("/predictions/today", response_model=list[TeamPrediction])
def predictions_today():
    today = pd.Timestamp(date.today())
    games = matchups_df[matchups_df["GAME_DATE_home"].dt.date == today.date()]

    if games.empty:
        # Fall back to most recent game day in dataset (useful during off-season)
        latest = matchups_df["GAME_DATE_home"].max().date()
        games = matchups_df[matchups_df["GAME_DATE_home"].dt.date == latest]

    # Batch predict: operate on DataFrame for performance when possible
    return [predict_game(row) for _, row in games.iterrows()]


@app.get("/predictions/{game_id}", response_model=TeamPrediction)
def prediction_by_game(game_id: str):
    row = matchups_df[matchups_df["GAME_ID"].astype(str) == game_id]
    if row.empty:
        raise HTTPException(status_code=404, detail=f"Game {game_id} not found")
    return predict_game(row.iloc[0])


@app.get("/accuracy", response_model=AccuracyStats)
def accuracy_stats():
    # Serve cached accuracy computed at startup (cheap). If not available, compute on demand.
    if _cached_accuracy is None:
        compute_accuracy_stats()
    return AccuracyStats(**_cached_accuracy)


@app.on_event("startup")
def load_artifacts():
    global model, feature_cols, matchups_df
    try:
        logger.info("Loading model from %s", MODEL_DIR)
        model = joblib.load(MODEL_DIR / "best_model.pkl")
        feature_cols = joblib.load(MODEL_DIR / "feature_cols.pkl")
        matchups_df = pd.read_csv(DATA_DIR / "matchups.csv", parse_dates=["GAME_DATE_home"]) 
        compute_accuracy_stats()
        logger.info("Loaded model and data; accuracy cached: %s", _cached_accuracy)
    except Exception as e:
        logger.exception("Failed to load model or data on startup: %s", e)
