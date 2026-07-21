# CLAUDE.md

## Project

This repository contains the **NBA Front Office Intelligence Platform** — a
**historical** product (decision 0005): no current rosters, current-season data,
live refreshes, or live NBA endpoints. The historical cutoff must be explicit and
visible in the product.

The initial release is **fully free** (decision 0007): built and deployed only
with clearly licensed FiveThirtyEight historical data (CC BY 4.0, attributed),
synthetic fixtures, and derived outputs the licenses permit. No paid datasets,
no NBA consent prerequisite, no restricted raw data. PCE (decision 0003) is the
future research direction, not a blocker for the first release.

The platform combines:

* versioned historical player contribution benchmarks served through a
  contribution-provider abstraction (RAPTOR benchmark / synthetic / future PCE)
* transparent rotation assumptions
* deterministic roster-scenario calculations
* grounded explanations of projected changes

The primary product question is:

> How could adding or removing a player have affected a historical team’s projected performance under explicit, inspectable assumptions?

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

Detailed rule sets live as project skills in `.claude/skills/` (`data-rules`,
`ml-rules`, `scenario-rules`, `testing-rules`). They load automatically when
relevant; invoke the matching skill before starting work in its area.

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
Select a historical season
→ select a team from that season
→ view the historical roster
→ remove one player
→ add another player from the same season
→ generate a valid default rotation
→ aggregate historical benchmark contribution values
→ estimate a scenario difference
→ show assumptions, data version, provider type, and explanation factors
```

Build in this order (free MVP first — decision 0007):

1. Canonical historical player/team/season/roster schemas (seed season 2014-15)
2. Contribution-provider interface + RAPTOR benchmark and synthetic providers
3. Basic roster scenario engine (same-season one-for-one swap)
4. One backend scenario endpoint
5. Minimal functional Roster Lab interface with required disclosures
6. Editable minutes and sensitivity analysis
7. Team-profile interpretation
8. Supporting player and team pages; public historical deployment
9. Visual polish and broader features
10. Future phase (separate approval): historical box-score source, PCE
    construction and validation, PCE prediction model

Do not build the application page-by-page while postponing the scenario engine.

---

## Product Claims

Describe the platform as:

> A historical NBA front-office simulation platform that combines versioned historical contribution benchmarks with transparent rotation assumptions.

Do not describe the product as current, live, real-time, or production NBA
forecasting. Do not label RAPTOR benchmark or synthetic values as PCE, validated,
or causal; use the exact UI labels in decision 0007 §8.

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

Binding rules live in the `data-rules` project skill — use it before any work
on data sources, ingestion, snapshots, licensing, identifiers, or validation.
Non-negotiables: historical-only (decision 0005), fully free sources only
(decision 0007), never overwrite raw snapshots, never use names as primary
identifiers.

---

## Machine Learning Rules

Binding rules live in the `ml-rules` project skill — use it before any work on
PCE, features, training, evaluation, or model artifacts. Non-negotiables: the
first release ships no trained model (decision 0007); never use target-season
or future information in features; never overwrite a model artifact.

---

## Scenario Engine and Explainability Rules

Binding rules live in the `scenario-rules` project skill — use it before any
work on the scenario engine, minutes allocation, swaps, scenario responses, or
explanations. Non-negotiables: exactly 240 minutes, deterministic results,
version metadata exposed, no arbitrary fit bonuses, explanations traceable to
calculated values.

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

A change is not complete because it ran successfully once. The required minimum
coverage list and end-to-end requirement live in the `testing-rules` project
skill — use it when writing tests or completing a task. Detailed requirements:
`docs/testing-strategy.md`.

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

Backend domain/service layer: backend/ (domain models, fixture loader,
  contribution providers, minutes allocator, scenario service — see
  docs/architecture/README.md); no FastAPI routes yet
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

Full quality check (stops on first failure; run in a POSIX shell such as Git Bash):
  uv run ruff check . && uv run mypy && uv run pytest
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

For scenario-engine changes, also verify the scenario-engine checklist in the
`scenario-rules` skill (240 minutes, version metadata, heuristic labeling,
traceable explanations, no arbitrary fit constants).

---

## Core Principle

Build the smallest credible version of the hard part first.

For this project, the hard part is producing a transparent and defensible roster scenario from:

* versioned data
* backtested player projections
* explicit rotation assumptions
* deterministic calculations
* grounded explanations
