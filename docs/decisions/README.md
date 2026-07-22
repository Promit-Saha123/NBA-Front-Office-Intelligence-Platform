# Decision Records

One file per decision, named `NNNN-short-title.md` (e.g. `0001-historical-data-source.md`).

Required for changes to: primary data source, canonical identifiers, model target,
validation strategy, feature schema, minutes methodology, win-conversion methodology,
database technology, service boundaries, or major dependencies.

Each record includes: context, options considered, decision, rationale, consequences,
and re-evaluation triggers.

## Recorded Decisions

* [0001 — Historical Data Source](0001-historical-data-source.md) — no historical
  source approved for the then-current next-season BPM target; FiveThirtyEight
  `nba-raptor` permitted for pipeline prototyping only. Historical record of the
  BPM-era search; superseded in direction by 0003 (2026-07-19).
* [0002 — Environment and Toolchain](0002-environment-and-toolchain.md) — Python 3.12
  + uv, Node 22 + pnpm, PostgreSQL 16.14 via Docker Compose, Ruff, mypy, Pytest,
  Next.js with TypeScript (2026-07-19).
* [0003 — Internal Player-Impact Target](0003-internal-player-impact-target.md) —
  **Accepted**: model target changed from next-season BPM to the internally
  computed Player Contribution Estimate (PCE, initial version `pce-v1`), via an
  Option-A-anchored staged hybrid with learned coefficients; box-score +
  team-outcome source search is the next step (2026-07-19).
* [0004 — PCE Data-Source Options](0004-pce-data-source-options.md) —
  **Proposed**: nine candidates evaluated for PCE inputs; no free source is both
  field-complete and legally clear; recommended staged path = permitted CC BY 4.0
  prototyping now + owner-approved outreach for production (2026-07-20).
  Partially superseded by 0005 (current-coverage criteria dropped).
* [0005 — Historical-Only Product Scope](0005-historical-only-product-scope.md) —
  **Accepted**: the initial product is a historical roster-scenario and
  player-projection platform; no current rosters, current-season data, live
  refreshes, or live NBA endpoints; same-season one-for-one swaps; the source
  blocker is reframed to a historical box-score + team-outcome source
  (2026-07-20).
* [0006 — Historical PCE Data Source](0006-historical-pce-data-source.md) —
  **Proposed, deferred by 0007**: ten candidates scored under the historical-only
  scope; no clean free source exists for PCE; the two-track paid/consent path
  (BigDataBall inquiry ~$1,200–$1,600 contingent; narrowed NBA consent) is an
  optional future path (2026-07-20).
* [0007 — Fully Free Historical Prototype](0007-fully-free-historical-prototype.md) —
  **Accepted**: the initial release is built and deployed entirely with free,
  clearly licensed FiveThirtyEight historical data (CC BY 4.0) and synthetic
  fixtures via a contribution-provider abstraction (RAPTOR benchmark / synthetic
  / future PCE); seed season 2014-15; no paid data, NBA consent, or PCE required
  for release (2026-07-20).
* [0008 — Roster Lab Frontend Architecture](0008-roster-lab-frontend-architecture.md) —
  **Accepted**: first Next.js vertical slice over `POST /scenarios` — client
  component (no Server Actions/RSC data-fetching), API types generated from
  FastAPI's OpenAPI schema and validated at the one fetch boundary, local
  component state synced to URL search params (no state library, no
  TanStack Query for v1), a thin reshape-only view-model boundary, and no new
  backend/database/auth (2026-07-21).
