# 0013 — RAPTOR-Trend Projection Model

**Status:** Accepted (2026-09-13)

## Context

The user asked for a real ML component ("which players will have best
impact") as part of a broader push beyond the shipped MVP (alongside a
separate roster-builder frontend redesign, `feature/roster-builder-ui`).
The approved future target is PCE (decision 0003), but decision 0006 already
researched real PCE thoroughly and found it **infeasible from currently held
data** — no box-score fields exist anywhere in this project's licensed
sources, and the only viable paths (BigDataBall, ~$1,200-1,600 plus a
written-permission exchange; or NBA consent, free but unresolved timeline)
require a real-world action outside a coding session. The user chose to
sequence: build a real, honest, smaller model now from data already
licensed, and treat real PCE as a separate future track.

This record covers that smaller model. It is **not** PCE and must never be
labeled as such (ml-specification §2.2's labeling rules apply here just as
strictly as they would to PCE itself).

## Options Considered

**What to predict, given no box-score data:**
1. Predict next-season PCE from box-score rates, per `docs/ml-specification.md`'s
   existing spec. **Rejected** — no box-score data exists to compute the
   input features `docs/ml-specification.md` §5-7 require.
2. Skip modeling entirely until real PCE data is resolved. **Rejected** —
   the user explicitly asked for a working ML component now, and RAPTOR
   itself already contains enough season-over-season signal (a player's own
   `raptor_total` history) to build something real and honestly labeled
   without inventing data.
3. Predict a player's **next-season RAPTOR `raptor_total`** from their own
   multi-season RAPTOR history (prior values, year-over-year trend, minutes
   trend, seasons-of-history as an experience proxy — no age feature, since
   no age field exists in any licensed source here either, documented rather
   than fabricated). **Decision: option 3.** This is a materially different,
   narrower target than PCE: it predicts a *derived projection of RAPTOR*,
   not an independently-constructed impact metric from raw box-score rates.

**Epistemic labeling:** the model's output is `EpistemicType.MODEL_PREDICTION`
(an existing, previously-unused enum value on `backend.domain.models`) —
never `pce-v1`, never described as validated PCE, and never presented as
equivalent to RAPTOR itself (it estimates *next season's* RAPTOR, it does not
recompute the current one).

**Pipeline shape:** follows `docs/ml-specification.md`'s existing 27-section
structure directly (rolling backtest per §9, required baselines per §10,
XGBoost per §11, versioned artifact per §17-18, inference contract per §20)
— adapted only for the retargeted objective and the absence of a team-context
feature group (would require joining the by-team CSV per season; deferred,
documented as a limitation, not silently added or silently omitted).

**Training/serving location:** a new top-level `ml/` package (already
reserved in `.gitignore`'s `ml/artifacts/` entry and in CLAUDE.md's
architecture diagram, which draws "ML modules" as a sibling of the FastAPI
backend, not nested inside it) — registered in `pyproject.toml`'s wheel
packages and mypy's `files` list alongside `backend`/`data_pipeline`.

## Rationale

RAPTOR's own `raptor_total` already encodes a real, licensed, defensible
measure of player value; predicting its next-season value from a player's
own trend is a legitimate, modest forecasting problem — not a fabrication,
not a reinvention of RAPTOR, and buildable entirely from data already
audited and licensed (no new source, no new licensing question). Backtested
on the pinned snapshot (1977-2022, held-out final test season 2022): the
model beats a naive persistence baseline (2022 test: model R²=0.25 vs.
persistence R²=-0.64; model MAE=2.40 vs. persistence MAE=3.04), i.e. it adds
real, measurable value over "assume no change," not just a fitted line
memorized from noise.

## Consequences

* A new `ml/` package (`features.py`, `baselines.py`, `model.py`,
  `backtest.py`, `artifact.py`, `train.py`, `inference.py`) and
  `scripts/train_raptor_trend_model.py`, plus `scikit-learn`/`xgboost` as
  new dependencies (justified: XGBoost is ml-specification's own named
  primary model; scikit-learn supplies the required linear-regression
  baseline and standard metrics — no lighter-weight alternative satisfies
  both without reimplementing them).
* Versioned artifacts live under `ml/artifacts/` (gitignored, matching the
  existing `Backend/backend/models/saved/`-style convention elsewhere in
  this project's history) — never overwritten; a new version bumps the
  `model_version` string.
* No team-context features (team pace/offensive/defensive rating) in this
  version — would require a per-season by-team join not yet built; a
  documented limitation, not a silent gap.
* No API-level "current-season" claim anywhere: predictions are always a
  historical `feature_season -> feature_season + 1` backtest-style forecast,
  consistent with decision 0005's historical-only scope.
* **API exposure deliberately deferred, not forgotten.** `ml/inference.py`'s
  `RaptorTrendProjector` is a complete, tested serving contract, but wiring
  it into `backend/api/app.py` raises real questions this record doesn't
  answer yet: the artifact is gitignored (never committed), so an eagerly-
  loaded-at-startup route would crash app boot in any environment without a
  locally-trained model (CI, a fresh clone, Render) — it would need a lazy-
  load-with-graceful-503 pattern, and a production deploy would need the
  training script wired into the build step. None of that is needed until
  there's a real consumer (the parallel `feature/roster-builder-ui` branch's
  player browser is the natural first one) — added then, not spec'd blind
  now.

## Re-evaluation Triggers

* Real box-score data becomes available (BigDataBall permission granted, or
  NBA consent obtained) — re-open PCE construction per decision 0003/0006's
  original plan; this model does not block or substitute for that work.
* The model is asked to feed the scenario engine's contribution values
  directly (today it is a standalone player-level projection, not wired into
  `ContributionProvider`) — would need its own decision record given
  `ContributionProvider`'s existing "never silently substitute a value from
  a different provider" contract.
* Backtest performance degrades materially on a newer RAPTOR snapshot (data
  version bump) — retrain and version a new model, never overwrite `v1`.
