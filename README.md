# NBA Front Office Intelligence Platform

A player-projection and roster-scenario platform that combines a backtested
next-season player-impact model with transparent, user-inspectable rotation
assumptions.

The core question it answers:

> How could adding or removing a player affect a team's projected performance under
> explicit, inspectable assumptions?

The **roster scenario engine is the differentiator**: select a team, remove one
player, add one player, generate a valid default rotation, and see the projected
impact and win change — with every assumption labeled as a model prediction,
heuristic assumption, deterministic calculation, or descriptive interpretation.

## Planned Vertical Slices

1. **Player projection foundation** — historical data audit, canonical schema,
   baseline models, XGBoost with rolling backtests, versioned projections
2. **Basic scenario loop** — one-in/one-out scenario engine, heuristic default
   minutes, one backend endpoint, minimal Roster Lab interface
3. **Assumption transparency** — editable minutes, sensitivity analysis,
   team-profile interpretation
4. **Supporting experience** — player and team pages, visual polish

## Current Status

Documentation and repository initialization only. No application code, data, or
models exist yet. **The historical data source has not been selected** — that
evaluation ([docs/data-source-evaluation.md](docs/data-source-evaluation.md)) is the
first prerequisite for Slice 1.

## Documentation

* [CLAUDE.md](CLAUDE.md) — root operational rules and priorities
* [docs/project-specification.md](docs/project-specification.md) — product scope,
  architecture, build order
* [docs/data-source-evaluation.md](docs/data-source-evaluation.md) — historical data
  source evaluation (open)
* [docs/ml-specification.md](docs/ml-specification.md) — modeling requirements
* [docs/scenario-engine.md](docs/scenario-engine.md) — scenario engine methodology
* [docs/testing-strategy.md](docs/testing-strategy.md) — testing and quality strategy
* [docs/decisions/](docs/decisions/) — decision records
* [docs/data-audits/](docs/data-audits/) — data source audit results
* [workflows/](workflows/) — repeatable multi-step procedures
