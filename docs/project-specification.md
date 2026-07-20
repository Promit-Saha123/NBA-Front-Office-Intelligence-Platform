# Project Specification

Initial specification for the **NBA Front Office Intelligence Platform**, derived from
[CLAUDE.md](../CLAUDE.md), [ml-specification.md](ml-specification.md),
[scenario-engine.md](scenario-engine.md), and [testing-strategy.md](testing-strategy.md).
Unresolved decisions are listed at the end and are not presented as settled.

---

## 1. Product Purpose

A player-projection and roster-scenario platform that combines a backtested next-season
impact model with transparent, user-inspectable rotation assumptions.

The primary product question:

> How could adding or removing a player affect a team's projected performance under
> explicit, inspectable assumptions?

The roster scenario engine is the primary differentiator. Player, team, and comparison
pages exist to support that experience.

Every output is labeled as one of:

* **Model prediction** — output from a trained model
* **Heuristic assumption** — output from a documented rule-based method
* **Deterministic calculation** — direct calculation from data or inputs
* **Descriptive interpretation** — explanation of calculated differences

---

## 2. Primary Scenario Workflow

The first meaningful end-to-end workflow:

```text
Select a team
→ remove one player
→ add one player
→ generate a valid default rotation
→ calculate projected impact and win change
→ show assumptions and explanation factors
```

The v1 scenario supports exactly one player added and one player removed. Scenario
results are deterministic for a fixed combination of roster input, data version, model
version, minutes method, and configuration, and every response exposes
`model_version`, `data_version`, `minutes_method`, and `minutes_assumptions`.

---

## 3. MVP Scope

The MVP is built as four vertical slices, following the build order in CLAUDE.md:

### Slice 1 — Player projection foundation

Historical data audit and canonical schema; baseline next-season player projections
(persistence, multi-season average, linear regression); XGBoost model with
time-based rolling backtests; versioned player projections.

### Slice 2 — Basic scenario loop

Basic roster scenario engine (one-in, one-out); heuristic default minutes with hard
rotation constraints; one backend scenario endpoint; a minimal functional Roster Lab
interface completing the workflow in section 2.

### Slice 3 — Assumption transparency

Editable minutes with validation; sensitivity analysis comparing default and edited
assumptions; team-profile interpretation (descriptive only).

### Slice 4 — Supporting experience

Supporting player and team pages; visual polish and broader features.

---

## 4. Excluded Scope

The platform does not claim to predict:

* exact coaching rotations or player roles
* exact season records
* chemistry, leadership, or locker-room impact
* injuries
* playoff performance
* guaranteed real-world outcomes

Out of scope for the MVP:

* multi-player transactions (only after the one-for-one flow is stable)
* validated causal "fit" effects on projected wins — no hand-tuned fit bonuses or
  penalties; v1 fit outputs are descriptive profile changes only
* an LLM explanation layer (optional later; may only rewrite verified factors)
* microservices, queues, streaming systems, or separate model-serving infrastructure
* scenario caching and persistence (optimizations, not required for the first loop)

---

## 5. Architecture

Modular monolith:

```text
Data-source adapters
        ↓
Raw snapshots and manifests
        ↓
Validation and transformation
        ↓
PostgreSQL
   ↙             ↘
FastAPI       ML modules
   ↓
Next.js frontend
```

Backend request flow: API route → application service → repository or ML module →
response schema. API routes stay thin, business logic lives in services, database
access lives in repositories, database models stay separate from API schemas, and no
core scenario or ML calculation runs in frontend components. Schema changes require
migrations.

Repository layout:

* `frontend/` — Next.js application
* `backend/` — FastAPI application
* `data_pipeline/` — ingestion, validation, canonicalization
* `ml/` — feature generation, training, evaluation, artifacts
* `scripts/` — thin executable entry points
* `workflows/` — repeatable multi-step procedures (documentation)
* `tests/` — automated tests
* `docs/` — specifications, decisions, audits

---

## 6. Major Technology Choices

Established:

* **PostgreSQL** — system of record
* **FastAPI** — backend API (Python)
* **Next.js** — frontend
* **XGBoost** — primary model, evaluated against simple baselines (Python ML stack)

Toolchain (see [decisions/0002-environment-and-toolchain.md](decisions/0002-environment-and-toolchain.md)):

* **Python 3.12** managed with **uv**
* **Node.js 22 LTS** with **pnpm**
* **PostgreSQL 16** run locally via **Docker Compose**
* **Ruff** (lint), **mypy** (type-check), **Pytest** (tests)
* **Next.js with TypeScript** for the frontend

Deliberately not yet decided: historical data source and the specific
win-conversion method (see Unresolved Decisions).

`nba_api` is treated only as a replaceable data-source adapter, never as the system of
record.

---

## 7. Build Order

Scenario-engine-first. Build the smallest credible version of the scenario loop before
polishing supporting pages:

1. Historical data audit and canonical schema
2. Baseline next-season player projection
3. XGBoost model and time-based evaluation
4. Basic roster scenario engine
5. One backend scenario endpoint
6. Minimal functional Roster Lab interface
7. Editable minutes and sensitivity analysis
8. Team-profile interpretation
9. Supporting player and team pages
10. Visual polish and broader features

Do not build the application page-by-page while postponing the scenario engine.

---

## 8. Major Limitations

* The initial model target is next-season Box Plus/Minus — a box-score-derived
  estimate, not a complete measure of player value.
* The v1 minutes engine is a heuristic assumption engine, not a rotation-prediction
  model. Its outputs carry the label: *"Heuristic scenario profile, not a validated
  causal fit model."*
* Projections are uncertain point estimates; documentation must state this even where
  the interface initially shows single values.
* Team-rating and win conversion are documented, versioned approximations, not
  guarantees.
* Low-minute players and rookies have unstable targets and features; their treatment
  requires explicit documentation and evaluation.
* Results depend on the selected historical data source, which has not yet been
  chosen.

---

## 9. Unresolved Decisions

These block or shape upcoming work and require decision records in
[decisions/](decisions/):

* Historical data source selection — see
  [data-source-evaluation.md](data-source-evaluation.md)
* Team-rating and win-conversion methodology
* Minutes-allocation weighting details for the heuristic engine
* Position representation (4-bucket vs. 5-position) and multi-position handling
* Low-minute, rookie, and replacement-level treatment thresholds
