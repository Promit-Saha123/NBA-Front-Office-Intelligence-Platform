# Project Specification

Initial specification for the **NBA Front Office Intelligence Platform**, derived from
[CLAUDE.md](../CLAUDE.md), [ml-specification.md](ml-specification.md),
[scenario-engine.md](scenario-engine.md), and [testing-strategy.md](testing-strategy.md).
Unresolved decisions are listed at the end and are not presented as settled.

---

## 1. Product Purpose

> A historical NBA front-office simulation platform that combines versioned
> historical contribution benchmarks with transparent rotation assumptions.

The product is **historical-only**
([decision 0005](decisions/0005-historical-only-product-scope.md)) and the initial
release is **fully free**
([decision 0007](decisions/0007-fully-free-historical-prototype.md)): built and
deployed only with clearly licensed FiveThirtyEight historical data (CC BY 4.0,
attributed), synthetic fixtures, and versioned local snapshots. It requires no
current rosters, current-season data, live refreshes, live NBA endpoints, or paid
datasets, and must never be described as current, live, real-time, or production
NBA forecasting. The supported historical season range (seed: 2014-15) is explicit
and visible in the product. PCE
([decision 0003](decisions/0003-internal-player-impact-target.md)) is the future
research direction, served later through the same contribution-provider interface.

The primary product question:

> How could adding or removing a player have affected a historical team's projected
> performance under explicit, inspectable assumptions?

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
Select a historical season
→ select a team from that season
→ view the historical roster
→ remove one player
→ add another player from the same season
→ generate a valid heuristic rotation
→ aggregate historical benchmark contribution values
→ estimate a scenario difference
→ display assumptions, data version, provider type, and explanation factors
```

The v1 scenario supports exactly one player added and one player removed. The
added player must have a player-season record in the selected season and must not
already be on the selected roster (any team of origin within that season); no
cross-era swaps, salary-cap logic, or injury simulation
([decision 0005 §3](decisions/0005-historical-only-product-scope.md)). Scenario
results are deterministic for a fixed combination of roster input, data version, model
version, minutes method, and configuration, and every response exposes
`model_version`, `data_version`, `minutes_method`, and `minutes_assumptions`.

---

## 3. MVP Scope

The MVP is built as four vertical slices, following the build order in CLAUDE.md:

### Slice 1 — Free historical foundation (decision 0007)

Canonical historical player/team/season/roster schemas seeded from the audited
CC BY 4.0 snapshots (seed season 2014-15); fixture loader; contribution-provider
interface with the RAPTOR benchmark and synthetic providers.

### Slice 2 — Basic scenario loop

Basic roster scenario engine (one-in, one-out, same season); heuristic default
minutes with hard rotation constraints; one backend scenario endpoint; a minimal
functional Roster Lab interface completing the workflow in section 2 with the
required disclosures (decision 0007 §8).

### Slice 3 — Assumption transparency

Editable minutes with validation; sensitivity analysis comparing default and edited
assumptions; team-profile interpretation (descriptive only).

### Slice 4 — Supporting experience

Supporting player and team pages; visual polish; public historical deployment.

### Future phase (separate approval — decisions 0003/0006)

Historical box-score source acquisition; PCE construction, validation, and
next-season prediction model; `PceProvider` behind the same contribution
interface. Not a blocker for Slices 1–4.

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

* current rosters, current-season data, live refreshes, and live NBA endpoints
  (historical-only product — decision 0005)
* cross-era player swaps, salary-cap logic, and injury simulation
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
* **XGBoost** — primary model for the future PCE prediction phase, evaluated
  against simple baselines (Python ML stack); the free MVP ships no trained model

Toolchain (see [decisions/0002-environment-and-toolchain.md](decisions/0002-environment-and-toolchain.md)):

* **Python 3.12** managed with **uv**
* **Node.js 22 LTS** with **pnpm**
* **PostgreSQL 16** run locally via **Docker Compose**
* **Ruff** (lint), **mypy** (type-check), **Pytest** (tests)
* **Next.js with TypeScript** for the frontend

Deliberately not yet decided: the specific win-conversion method (see Unresolved
Decisions). The historical box-score source for future PCE construction is a
deferred optional path
([decision 0006](decisions/0006-historical-pce-data-source.md)), not a blocker
for the free MVP ([decision 0007](decisions/0007-fully-free-historical-prototype.md)).

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

* The model target is the next-season Player Contribution Estimate (PCE) — an
  internally computed, statistically estimated contribution metric
  ([decision 0003](decisions/0003-internal-player-impact-target.md)). It is
  associational, not causal; incompletely captures defense; and is not equivalent
  to BPM, RAPTOR, EPM, or another established metric.
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
* The product covers only its stated historical season range, fixed by the
  approved source and displayed with data, model, minutes-method, and
  win-conversion versions; no current-season claim is made anywhere.

---

## 9. Unresolved Decisions

These block or shape upcoming work and require decision records in
[decisions/](decisions/):

* Team-rating and win-conversion methodology (for the prototype it may be
  calibrated against nba-elo team outcomes; method and version still to be
  decided)
* Minutes-allocation weighting details for the heuristic engine
* Position representation (4-bucket vs. 5-position) and multi-position handling
* Low-minute, rookie, and replacement-level treatment thresholds
