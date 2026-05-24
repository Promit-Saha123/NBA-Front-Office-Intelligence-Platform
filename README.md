# 🏀 NBA Game Predictor

A full-stack ML app that predicts NBA game winners and point spreads using historical team stats.

## Project Structure

```
nba-predictor/
├── backend/
│   ├── data/           # Data fetching & storage
│   ├── models/         # ML model training & inference
│   └── api/            # FastAPI server
├── frontend/           # Next.js dashboard
└── scripts/            # Utility & setup scripts
```

## Tech Stack

| Layer | Tech |
|---|---|
| Data | `nba_api`, pandas |
| Modeling | scikit-learn, XGBoost |
| Backend | FastAPI, APScheduler |
| Database | PostgreSQL (Supabase) |
| Frontend | Next.js, Tailwind, Recharts |
| Deploy | Vercel (frontend), Render (backend) |

## Setup

### 1. Install Python dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Set environment variables
```bash
cp .env.example .env
# Fill in your Supabase credentials
```

### 3. Fetch historical data (run once)
```bash
python scripts/fetch_historical.py
```

### 4. Train the model
```bash
python backend/models/train.py
```

### 5. Start the API
```bash
uvicorn backend.api.main:app --reload
```

### 6. Start the frontend
```bash
cd frontend
npm install
npm run dev
```

## How It Works

1. **Data Pipeline**: Pulls 5 seasons of NBA game logs via `nba_api`
2. **Feature Engineering**: Computes rolling averages, rest days, home/away splits
3. **Model**: XGBoost classifier trained on team matchup features
4. **API**: FastAPI serves daily predictions + historical accuracy
5. **Dashboard**: Next.js UI shows today's games, predictions, and model stats

## Target Accuracy

A well-tuned model should hit **65-70% accuracy** — comparable to Vegas lines.
