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
* [0009 — Editable Scenario Minutes](0009-editable-scenario-minutes.md) —
  **Accepted**: `POST /scenarios` gains an optional `manual_minutes` field —
  a complete, strictly-validated (no silent rebalance) manual override of the
  full post-swap scenario rotation; baseline stays permanently read-only; a
  new `InvalidManualMinutesError`/`INVALID_MANUAL_MINUTES` distinguishes bad
  user input from an automatic-allocator failure; a new
  `EditableScenarioMinutes.tsx` frontend component shows default and edited
  results side by side (2026-07-23).
* [0010 — Team-Profile Interpretation](0010-team-profile-interpretation.md) —
  **Accepted**: a narrower, honest v1 of step 7 — offensive/defensive impact
  only, from RAPTOR's own `raptor_offense`/`raptor_defense` split, since the
  full spec's category list (shooting, playmaking, rebounding, etc.) needs
  box-score data this project doesn't have; `ContributionProvider` gains
  `get_player_profile()`; a new `TeamProfilePanel.tsx` renders it, always
  labeled `descriptive_interpretation` and never feeding win/contribution
  math (2026-07-23).
* [0011 — Second Historical Season](0011-second-historical-season.md) —
  **Accepted**: adds 2015-16 (identical team codes to 2014-15, no crosswalk
  needed) as a second supported season; `AppState` becomes season-keyed
  (`dict[str, HistoricalSeasonData]` etc.), loaded once at startup for both
  seasons; every route resolves its season slice via a small
  `_season_state()` lookup (2026-09-10).
* [0012 — Scenario Comparison View](0012-scenario-comparison-view.md) —
  **Accepted**: new `/compare` route renders two fully independent
  scenario selections (any season/team/players/provider per side) side by
  side; `url-state.ts`/`use-scenario-selection.ts` parameterized by a
  `paramKeys`/`hashPrefix` pair so one side's URL update can't drop the
  other's params and commit-history hashes can't collide; every result
  component gained an optional `idPrefix` to avoid duplicate DOM ids when
  two instances render at once (2026-09-10).
* [0014 — Roster-Builder Scenario Contract](0014-roster-builder-scenario-contract.md) —
  **Accepted**: a from-scratch 12-player roster builder (`CustomRosterRequest`/
  `CustomRosterResult`, `RosterScenarioService.build_custom_roster()`,
  `POST /custom-rosters`) replaces the swap-based Roster Lab as the default
  landing page (`/builder`, old page archived at `/scenario-lab`); no
  baseline/scenario/change triplet (there is no "before"); a new
  `RosterProfileCategory` carries a single aggregate profile value instead of
  reusing `TeamProfileCategory`; a hand-maintained, partially-covered
  `player-positions.ts` lookup backs the reference UI's position slots as a
  browsing aid only, never a hard constraint (2026-09-12).
* [0015 — Full Historical Season Coverage](0015-full-historical-season-coverage.md) —
  **Accepted**: `SUPPORTED_SEASON_LABELS` expands from 2 seasons to all 46 RS
  seasons the pinned RAPTOR snapshot covers (1976-77–2021-22); the loader's
  CSV reads are now cached per snapshot path (`~2s` to load all 46 at
  startup, was projected `~6s+` uncached); `nba-teams.ts` becomes a
  season-aware lookup covering all 42 historical team codes, most notably
  disambiguating "CHA" (Charlotte Bobcats 2004-05–2013-14 vs. Hornets
  2014-15–2021-22); `DEFAULT_SEASON` is centralized as the *most recent*
  season rather than array position 0 (2026-09-13).
