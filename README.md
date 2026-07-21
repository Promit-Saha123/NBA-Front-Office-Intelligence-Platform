# NBA Front Office Intelligence Platform

A **historical** NBA front-office simulation platform that combines versioned
historical contribution benchmarks with transparent, user-inspectable rotation
assumptions.

The core question it answers:

> How could adding or removing a player have affected a historical team's projected
> performance under explicit, inspectable assumptions?

The **roster scenario engine is the differentiator**: select a historical season,
select a team from it, remove one player, add another player from that same season,
generate a valid default rotation, and see the estimated scenario difference —
with every output labeled by its epistemic type (historical benchmark, synthetic
estimate, heuristic assumption, deterministic calculation, or descriptive
interpretation).

**Fully free and historical-only**
([decision 0005](docs/decisions/0005-historical-only-product-scope.md),
[decision 0007](docs/decisions/0007-fully-free-historical-prototype.md)): the
initial release uses only clearly licensed FiveThirtyEight historical data
(CC BY 4.0, attributed), synthetic fixtures, and versioned local snapshots — no
paid datasets, no live NBA endpoints, no current-season data. Seed season:
**2014-15**. Scenario outputs are historical simulations, not predictions of real
outcomes.

The **Player Contribution Estimate (PCE)**
([decision 0003](docs/decisions/0003-internal-player-impact-target.md)) is the
approved future research direction; it requires a historical box-score source
([decision 0006](docs/decisions/0006-historical-pce-data-source.md), deferred) and
is not a blocker for the first release.

## Free MVP (decision 0007)

1. One historical season (2014-15) with canonical player/team/roster schemas
2. Contribution-provider abstraction: RAPTOR benchmark + synthetic providers
3. One-player same-season swap with a heuristic 240-minute rotation
4. Deterministic scenario calculation behind one FastAPI endpoint
5. Minimal Next.js Roster Lab with source attribution and methodology disclosures
6. Offline tests and public historical deployment

## Current Status

Documentation, toolchain, audit tooling, and two audited CC BY 4.0 snapshots
(FiveThirtyEight RAPTOR and NBA Elo — pinned commits, manifests, checksums). The
free-path decision removes all data blockers for the initial release; the next
step is the first implementation slice (schemas, fixture loader, providers,
minutes allocator, swap service, tests).

## Documentation

* [CLAUDE.md](CLAUDE.md) — root operational rules and priorities
* [docs/project-specification.md](docs/project-specification.md) — product scope,
  architecture, build order
* [docs/data-source-evaluation.md](docs/data-source-evaluation.md) — data source
  evaluation record
* [docs/ml-specification.md](docs/ml-specification.md) — modeling requirements
  (future PCE phase)
* [docs/scenario-engine.md](docs/scenario-engine.md) — scenario engine methodology
* [docs/testing-strategy.md](docs/testing-strategy.md) — testing and quality strategy
* [docs/decisions/](docs/decisions/) — decision records
* [docs/data-audits/](docs/data-audits/) — data source audit results
* [workflows/](workflows/) — repeatable multi-step procedures
