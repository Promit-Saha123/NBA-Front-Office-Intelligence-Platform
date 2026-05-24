"""
train.py
--------
Trains a Logistic Regression and XGBoost classifier on NBA matchup data,
evaluates them, and saves the best model to disk.

Usage:
    python backend/models/train.py
"""

import logging
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss, confusion_matrix
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
import os

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATA_PATH  = BASE_DIR / "backend" / "data" / "raw" / "matchups.csv"
MODEL_DIR  = BASE_DIR / "backend" / "models" / "saved"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# Rolling average windows to use as features
ROLL_WINDOWS = [5, 10]

# Stats we computed rolling averages for
STAT_COLS = ["PTS", "FG_PCT", "FG3_PCT", "FT_PCT", "REB", "AST", "TOV", "PLUS_MINUS"]

TARGET = "WIN_home"  # 1 = home team won, 0 = away team won


# ── Feature Selection ─────────────────────────────────────────────────────────

def get_feature_columns(df: pd.DataFrame) -> list[str]:
    """Return all engineered feature column names present in the dataframe."""
    features = []

    # Rolling averages for home and away
    for window in ROLL_WINDOWS:
        for stat in STAT_COLS:
            for side in ["home", "away"]:
                col = f"{stat}_roll{window}_{side}"
                if col in df.columns:
                    features.append(col)

    # Rest days
    for side in ["home", "away"]:
        col = f"REST_DAYS_{side}"
        if col in df.columns:
            features.append(col)

    return features


# ── Evaluation ────────────────────────────────────────────────────────────────

def evaluate(name: str, y_true, y_pred, y_prob) -> dict:
    acc  = accuracy_score(y_true, y_pred)
    loss = log_loss(y_true, y_prob)
    cm   = confusion_matrix(y_true, y_pred)

    logger.info("%s - Accuracy: %.4f (%.1f%%)", name, acc, acc * 100)
    logger.info("%s - Log Loss: %.4f", name, loss)
    logger.info("%s - Confusion Matrix:\n%s", name, cm)

    return {"name": name, "accuracy": acc, "log_loss": loss}


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    logger.info("Loading matchup data from %s", DATA_PATH)
    df = pd.read_csv(DATA_PATH, parse_dates=["GAME_DATE_home"])
    df = df.sort_values("GAME_DATE_home").reset_index(drop=True)

    feature_cols = get_feature_columns(df)
    logger.info("Using %d features", len(feature_cols))

    X = df[feature_cols].fillna(0)
    y = df[TARGET]

    # ── Time-series split (no data leakage) ───────────────────────────────────
    # Use the last 20% of games as the test set (chronological)
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    logger.info("Train: %d games | Test: %d games", len(X_train), len(X_test))

    results = []

    # ── Model 1: Logistic Regression ──────────────────────────────────────────
    logger.info("Training Logistic Regression...")
    lr_pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    LogisticRegression(max_iter=1000, C=0.1)),
    ])
    lr_pipe.fit(X_train, y_train)
    lr_pred = lr_pipe.predict(X_test)
    lr_prob = lr_pipe.predict_proba(X_test)
    results.append(evaluate("Logistic Regression", y_test, lr_pred, lr_prob))
    joblib.dump(lr_pipe, MODEL_DIR / "logistic_regression.pkl")

    # ── Model 2: XGBoost ──────────────────────────────────────────────────────
    logger.info("Training XGBoost...")
    xgb = XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
        verbosity=0,
        n_jobs=-1,
    )
    xgb.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        early_stopping_rounds=10,
        verbose=False,
    )
    xgb_pred = xgb.predict(X_test)
    xgb_prob = xgb.predict_proba(X_test)
    results.append(evaluate("XGBoost", y_test, xgb_pred, xgb_prob))
    joblib.dump(xgb, MODEL_DIR / "xgboost.pkl")

    # ── Save feature list ─────────────────────────────────────────────────────
    joblib.dump(feature_cols, MODEL_DIR / "feature_cols.pkl")

    # ── Pick best model ───────────────────────────────────────────────────────
    best = max(results, key=lambda r: r["accuracy"])
    logger.info("Best model: %s (%.1f%% accuracy)", best['name'], best['accuracy'] * 100)

    # Save best model alias
    best_path = MODEL_DIR / "best_model.pkl"
    if best["name"] == "XGBoost":
        joblib.dump(xgb, best_path)
    else:
        joblib.dump(lr_pipe, best_path)

    logger.info("Saved to %s", best_path)
    logger.info("Training complete. Next step: run the FastAPI server.")


if __name__ == "__main__":
    main()
