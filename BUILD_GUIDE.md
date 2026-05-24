# 🏀 NBA Predictor — Build Guide

A step-by-step guide to go from zero to deployed.

---

## Step 1: Install Python dependencies

```bash
cd nba-predictor/backend
pip install -r requirements.txt
```

**Key libraries:**
- `nba_api` — free NBA stats, no API key needed
- `pandas` / `numpy` — data manipulation
- `scikit-learn` — Logistic Regression + preprocessing
- `xgboost` — gradient boosting classifier
- `fastapi` + `uvicorn` — web server

---

## Step 2: Fetch historical data

```bash
python scripts/fetch_historical.py
```

This pulls **5 seasons** of NBA game logs and saves two CSVs:
- `backend/data/raw/team_game_logs.csv` — one row per team per game
- `backend/data/raw/matchups.csv` — one row per game (home vs away merged)

**What's being engineered:**
- Rolling 5 and 10-game averages for: PTS, FG%, REB, AST, TOV, +/-
- Home/away flag
- Days of rest since last game

> ⚠️ nba_api is rate-limited. The script adds a 1-second delay between calls. Fetching 5 seasons takes ~5 minutes.

---

## Step 3: Train the model

```bash
python backend/models/train.py
```

This trains two models and saves the best one:
1. **Logistic Regression** — fast, explainable baseline
2. **XGBoost** — usually wins by 1-3%

Key concepts to understand:
- **Time-series split** — we never train on future data. The last 20% of games (chronologically) are held out for testing.
- **Rolling averages with shift(1)** — we shift stats by 1 game so the model only sees what was known *before* the game.
- **Feature importance** — XGBoost tells you which stats matter most (usually rolling +/- and points).

Expect **65-68% accuracy** on the test set to start.

---

## Step 4: Start the API

```bash
uvicorn backend.api.main:app --reload --port 8000
```

Test it in your browser:
- `http://localhost:8000/` → health check
- `http://localhost:8000/predictions/today` → today's predictions
- `http://localhost:8000/accuracy` → model stats
- `http://localhost:8000/docs` → auto-generated Swagger UI (FastAPI gives this for free)

---

## Step 5: Connect the frontend

Open `frontend/dashboard.html` in a browser to see the dashboard.

To connect it to your real API, replace the mock data in the `<script>` section:

```javascript
// Replace mock games array with:
const response = await fetch('http://localhost:8000/predictions/today');
const games = await response.json();
```

To build a full Next.js app:
```bash
npx create-next-app@latest frontend --typescript --tailwind
cd frontend
npm install recharts
```

---

## Step 6: Deploy (free tier)

| Service | What it hosts | Free tier |
|---|---|---|
| [Vercel](https://vercel.com) | Next.js frontend | Yes |
| [Render](https://render.com) | FastAPI backend | Yes (spins down after inactivity) |
| [Neon](https://neon.tech) | Postgres DB | Yes (0.5GB) |

**Deploy backend to Render:**
1. Push to GitHub
2. New Web Service → connect repo
3. Build command: `pip install -r backend/requirements.txt`
4. Start command: `uvicorn backend.api.main:app --host 0.0.0.0 --port $PORT`

---

## Improving accuracy (next steps)

Once the base model works, try:

1. **Add opponent strength** — how good is the team you're playing?
2. **Injury data** — scrape basketball-reference or use a news API
3. **Back-to-back game flag** — teams on 0 rest days underperform significantly
4. **ELO ratings** — compute a running ELO score per team
5. **Ensemble** — average predictions from Logistic Regression + XGBoost

---

## What to say in interviews

> "I built an end-to-end ML pipeline that ingests 5 seasons of NBA game data,
> engineers time-series features like rolling averages and rest days,
> trains an XGBoost classifier, and serves predictions through a FastAPI endpoint
> connected to a React dashboard — achieving 67% accuracy, comparable to Vegas."

That's a complete story: **data → features → model → API → UI → deployed.**
