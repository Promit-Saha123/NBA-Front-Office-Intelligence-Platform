# CLAUDE.md

## Project

This repository contains the **NBA Front Office Intelligence Platform**.

The platform combines:

* a backtested next-season player-impact model
* transparent rotation assumptions
* deterministic roster-scenario calculations
* grounded explanations of projected changes

The primary product question is:

> How could adding or removing a player affect a team’s projected performance under explicit, inspectable assumptions?

The roster scenario engine is the project’s primary differentiator. Supporting player, team, and comparison pages exist to support that experience.

---

## Read Before Working

Use these documents as the source of truth:

```text
docs/project-specification.md
docs/data-source-evaluation.md
docs/ml-specification.md
docs/scenario-engine.md
docs/testing-strategy.md
docs/decisions/
workflows/
```

Read only the documents relevant to the current task.

When instructions conflict, use this priority:

1. Explicit user instruction
2. Approved decision record
3. Project specification
4. Specialized documentation
5. This file
6. Existing repository conventions

Do not silently contradict an approved decision.

---

## Development Priority

Build the smallest credible version of the scenario loop before polishing supporting pages.

The first meaningful end-to-end workflow is:

```text
Select a team
→ remove one player
→ add one player
→ generate a valid default rotation
→ calculate projected impact and win change
→ show assumptions and explanation factors
```

Build in this order:

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

## Product Claims

Describe the platform as:

> A player-projection and roster-scenario platform that combines a backtested next-season impact model with transparent, user-inspectable rotation assumptions.

Do not claim that the system predicts:

* exact coaching rotations
* exact season records
* chemistry
* leadership
* playoff performance
* guaranteed real-world outcomes

Clearly distinguish:

* **Model prediction** — output from a trained model
* **Heuristic assumption** — output from a documented rule-based method
* **Deterministic calculation** — direct calculation from data or inputs
* **Descriptive interpretation** — explanation of calculated differences

Preserve these labels in APIs, documentation, and the interface.

---

## Architecture

Use a modular monolith.

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

Do not introduce microservices, queues, streaming systems, or separate model-serving infrastructure without a demonstrated need.

Backend request flow:

```text
API route
→ application service
→ repository or ML module
→ response schema
```

Rules:

* Keep API routes thin.
* Put business logic in services.
* Put database access in repositories.
* Keep database models separate from API schemas.
* Do not place core scenario or ML calculations in frontend components.
* Do not change the database schema without a migration.

---

## Data Rules

Do not make the system dependent on a live undocumented endpoint.

Introduce data tiers only when needed:

1. Historical training snapshot
2. Latest completed-season snapshot
3. Current roster snapshot

Slice 1 only requires the historical tier. Current rosters are introduced during the scenario-engine phase.

Before selecting or replacing a source, update:

```text
docs/data-source-evaluation.md
```

Do not:

* scrape Sports Reference properties without confirmed permission
* assume a third-party license overrides the original source’s rights
* depend on live external APIs in automated tests
* overwrite raw source files
* use names as primary identifiers
* silently discard invalid records
* mix observations, features, predictions, assumptions, or scenario results

Treat `nba_api` as a replaceable adapter, not the system of record.

Preserve raw snapshots with:

* source
* retrieval date
* checksum
* license information
* data version
* code version where available

Use canonical internal player and team identifiers with explicit source crosswalks.

Ambiguous identity matches require review.

---

## Machine Learning Rules

The initial target is next-season Box Plus/Minus unless an approved decision changes it.

One training row represents one player during one completed season.

Before training XGBoost, establish simple baselines such as:

* previous-season BPM
* multi-season average BPM
* linear regression

A complex model is only better if it outperforms reasonable baselines in time-respecting evaluation.

Never use target-season or future information in features.

Do not use random row-level splitting as the primary validation method.

Use season-based validation or rolling backtests:

```text
Train through season N
→ predict season N+1
```

Training and inference must use the same feature-generation code.

Every model artifact must include:

* model version
* data version
* target definition
* feature list
* hyperparameters
* evaluation results
* training date
* artifact location
* code commit where available

Never overwrite an existing model artifact.

Detailed requirements live in:

```text
docs/ml-specification.md
```

---

## Scenario Engine Rules

The v1 minutes engine is a **heuristic assumption engine**, not a rotation-prediction model.

Do not present unvalidated weights or rules as established basketball truth.

The engine must enforce:

* exactly 240 regulation minutes
* no negative minutes
* removed players receive zero minutes
* only rostered players receive minutes
* player workload limits
* a valid rotation
* basic positional viability

The first scenario should support one player added and one player removed.

For a fixed combination of:

* roster input
* data version
* model version
* minutes method
* configuration

the result must be deterministic.

Scenario responses must expose:

```text
model_version
data_version
minutes_method
minutes_assumptions
```

Editable minutes belong after the automatic scenario loop works.

Do not apply arbitrary fit bonuses or penalties to projected wins.

In v1, shooting, playmaking, rebounding, defensive activity, availability, and positional balance are descriptive profile outputs unless an empirically evaluated model says otherwise.

Detailed methodology lives in:

```text
docs/scenario-engine.md
```

---

## Explainability

Every explanation must be traceable to calculated values.

Acceptable:

```text
Three-point volume increased while defensive rebounding declined.
```

Unacceptable:

```text
The incoming player adds championship leadership and winning mentality.
```

An LLM may rewrite verified analytical factors into clearer prose, but it must not create new basketball claims.

Preserve the underlying factors used to generate every explanation.

Use this label where appropriate:

> Heuristic scenario profile, not a validated causal fit model.

---

## Workflows and Scripts

Use:

* `workflows/` for repeatable multi-step procedures
* `scripts/` for focused executable entry points
* importable project modules for reusable implementation logic

A workflow describes what should happen.

A script invokes reusable code that performs a deterministic action.

Before creating a new script or abstraction:

1. Inspect existing code.
2. Reuse or extend an appropriate implementation.
3. Avoid duplicating logic.
4. Keep scripts thin.
5. Add tests to reusable modules.

When a workflow fails:

1. Read the complete error.
2. Identify the underlying cause.
3. Reproduce it with the smallest useful test.
4. Fix the reusable implementation.
5. Add a regression test.
6. Rerun the workflow.
7. Document reusable findings.

Do not bypass validation or fabricate missing data to make a workflow finish.

---

## Coding Behavior

Before editing:

* inspect relevant files
* inspect nearby tests
* read relevant documentation
* trace the existing data flow
* identify the smallest coherent change

Prefer small, reviewable changes.

Do not:

* modify unrelated code
* perform large rewrites without justification
* add unused abstractions
* leave dead code
* leave commented-out experiments
* add dependencies without explaining why
* add infrastructure merely because it is popular
* invent commands that are not configured

Keep assumptions explicit and configurable.

---

## Security

Never hardcode or commit secrets.

Use environment variables and maintain:

```text
.env
.env.example
.gitignore
```

Validate all external input.

Do not expose stack traces or log:

* API keys
* tokens
* passwords
* full connection strings
* sensitive environment values

Use parameterized database access and appropriately restricted CORS.

---

## Testing

A change is not complete because it ran successfully once.

Add tests appropriate to the change.

At minimum, protect:

* API contracts
* database behavior
* data validation
* identity resolution
* temporal leakage
* feature-schema consistency
* model artifact loading
* deterministic inference
* 240-minute enforcement
* removed-player handling
* impossible rotations
* assumption metadata
* frontend loading and error states
* scenario result rendering

At least one end-to-end test must cover:

```text
Select team
→ remove player
→ add player
→ run scenario
→ display valid result
```

Detailed requirements live in:

```text
docs/testing-strategy.md
```

---

## Commands

Do not guess commands.

Toolchain (decision 0002): Python 3.12 + uv, Node.js 22 LTS + pnpm, PostgreSQL 16 via
Docker Compose, Ruff, mypy, Pytest, Next.js with TypeScript.

```text
Package managers: uv (Python), pnpm (Node — frontend not yet scaffolded)

Start database: docker compose up -d db

Frontend development: not yet scaffolded (Next.js + TypeScript via pnpm)
Frontend lint: not yet scaffolded
Frontend type-check: not yet scaffolded
Frontend tests: not yet scaffolded

Backend development: not yet scaffolded (FastAPI)
Python lint: uv run ruff check .
Python type-check: uv run mypy
Python tests: uv run pytest

Database migration: not yet configured

Data-source audit: uv run python scripts/audit_data_source.py <csv-or-parquet> [--output <path>]
Historical ingestion: not yet configured
Data validation: not yet configured
Feature generation: not yet configured

Model training: not yet configured
Model evaluation: not yet configured
Projection generation: not yet configured

Full quality check: uv run ruff check . ; uv run mypy ; uv run pytest
```

Sections marked "not yet scaffolded/configured" must be filled in when that
component is initialized.

Whenever a command changes, update this section in the same change.

---

## Decision Records

Create a decision record under:

```text
docs/decisions/
```

when changing:

* primary data source
* canonical identifiers
* model target
* validation strategy
* feature schema
* minutes methodology
* win-conversion methodology
* database technology
* service boundaries
* major dependencies

Each decision record should include:

* context
* options considered
* decision
* rationale
* consequences
* re-evaluation triggers

---

## Definition of Done

A task is complete only when:

* requested behavior works
* architecture boundaries are respected
* relevant tests pass
* linting passes
* type checking passes
* migrations are included when needed
* API and model contracts are updated when needed
* documentation is updated
* error states are handled
* assumptions are labeled honestly
* no secrets are committed
* the final diff has been reviewed

For scenario-engine changes, also verify:

* minutes total exactly 240
* model and data versions are present
* heuristic status is visible
* explanations match calculated factors
* no arbitrary fit constant was introduced

---

## Core Principle

Build the smallest credible version of the hard part first.

For this project, the hard part is producing a transparent and defensible roster scenario from:

* versioned data
* backtested player projections
* explicit rotation assumptions
* deterministic calculations
* grounded explanations
