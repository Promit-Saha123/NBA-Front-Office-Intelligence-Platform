# Handoff

**Purpose of this file:** load this at the start of a new session (after clearing
conversation / starting fresh) to get back up to speed without re-reading the full
history. Update it at the end of each work session — see "Keeping this file
current" at the bottom.

**Last updated:** 2026-07-20

---

## One-line project state

A **historical-only, fully free** NBA roster-scenario prototype. The backend domain
core (schemas, contribution providers, minutes allocator, scenario service) for the
**2014-15 season** is built and tested. Nothing is committed to git yet. No FastAPI
routes, no frontend, no database, no trained model exist.

## Read first, in this order

1. `CLAUDE.md` — root rules (already reflects everything below)
2. `docs/decisions/0007-fully-free-historical-prototype.md` — the current product
   direction (supersedes the paid-data framing of 0004/0006)
3. `docs/architecture/README.md` — maps the `backend/` code to the specs
4. This file, for "what's next"

Skip 0001–0006 unless you need the historical reasoning for *why* — they're
preserved as history, not the current plan.

---

## Decision history (chronological, each still valid as a historical record)

| # | Decision | Status |
|---|---|---|
| [0001](docs/decisions/0001-historical-data-source.md) | No source approved for next-season BPM | Superseded (target changed) |
| [0002](docs/decisions/0002-environment-and-toolchain.md) | Python 3.12+uv, Node 22+pnpm, Postgres 16.14, Ruff/mypy/Pytest | Accepted, still current |
| [0003](docs/decisions/0003-internal-player-impact-target.md) | Target = Player Contribution Estimate (PCE), not BPM | Accepted (future work) |
| [0004](docs/decisions/0004-pce-data-source-options.md) | PCE data-source options (paid/consent outreach) | Proposed, deferred by 0007 |
| [0005](docs/decisions/0005-historical-only-product-scope.md) | Product is historical-only, no current data | Accepted, current |
| [0006](docs/decisions/0006-historical-pce-data-source.md) | Historical box-score source for PCE | Proposed, deferred by 0007 |
| [0007](docs/decisions/0007-fully-free-historical-prototype.md) | **Fully free**: CC BY 4.0 data + synthetic only, PCE not a blocker | **Accepted, current plan** |

**The short version:** we wanted PCE (an internal, learned player-impact metric) but
found no legally-usable free historical box-score source for it. Rather than pay or
wait on NBA consent, 0007 pivoted to a provider-abstraction design so the app can
ship now on FiveThirtyEight's CC BY 4.0 data alone, with PCE as a pluggable future
provider.

## What's actually built

**Data** (pinned, checksummed, CC BY 4.0, attribution required):
- `data/raw/fivethirtyeight-nba-raptor/2026-07-19/` — player RAPTOR values,
  1977–2022 (audit: `docs/data-audits/fivethirtyeight-raptor-audit.md`)
- `data/raw/fivethirtyeight-nba-elo/2026-07-19/` — team game outcomes, 1947–2015
  (audit: `docs/data-audits/fivethirtyeight-nba-elo-audit.md`) — **loaded/pinned but
  not yet wired into any code**; no current feature needs it (see below)

**Backend domain core** (`backend/`, no FastAPI yet):
- `backend/domain/models.py` — Season, Team, Player, PlayerSeason, TeamRoster,
  RosterMember, PlayerContribution, RotationEntry, RosterScenarioRequest/Result,
  ScenarioExplanationFactor, EpistemicType, ProviderType
- `backend/domain/errors.py` — 12 typed errors, each with a stable `.code`
- `backend/fixtures/historical_loader.py` — loads **2014-15 only** from the pinned
  RAPTOR snapshot (regular-season rows only; `raptor_total` = season-blended
  RS+PO value, used as-is)
- `backend/providers/` — `ContributionProvider` ABC +
  `HistoricalRaptorBenchmarkProvider` (labeled `historical_benchmark`) +
  `SyntheticContributionProvider` (labeled `synthetic_estimate`, deterministic via
  SHA-256, never auto-selected)
- `backend/minutes/allocator.py` — heuristic 240-minute allocator with cap/drop
  repair logic (see "gotcha" below)
- `backend/scenario/service.py` — one-player, same-season swap; no win conversion,
  no PCE — `model_version` is always `None`, no `projected_wins` field exists

**Tests:** 72 passing, offline only (`uv run pytest`). Ruff and mypy both clean.

## Known gotchas / non-obvious facts worth remembering

- **Team code mismatch**: RAPTOR uses `"CHA"` for the Charlotte Hornets in 2014-15;
  nba-elo uses `"CHO"`. Undocumented anywhere except
  `backend/fixtures/historical_loader.py`'s module docstring and
  `docs/architecture/README.md`. Will bite whoever wires up nba-elo next.
- **Minutes allocator had a real bug**, found and fixed this session: capping could
  silently blow past `max_player_minutes` when the active player pool was small
  relative to the cap. Fixed with a per-call feasibility check
  (`len(pool) * max_player_minutes >= total_team_minutes`), proven correct in the
  `_validate_pool_can_reach_total` docstring. Regression-tested with a 500-trial
  fuzz test. If you touch `backend/minutes/allocator.py`, re-read that docstring
  first.
- **PCE is not implemented and not blocking anything.** Don't accidentally start
  building it without re-reading 0007 — it's an explicitly deferred future
  provider (`PceProvider`), not part of the current plan.
- **Nothing is committed to git.** `git status` shows the entire session's work
  (many docs, all of `backend/`, all data snapshots) as uncommitted. Decide with
  the user whether/when to commit before doing anything destructive with git.

## Exact next task

**One thin FastAPI scenario endpoint over the completed domain service.**
`backend/scenario/service.py`'s `RosterScenarioService.build_scenario()` is fully
built and tested — this next slice is just an API route + request/response schema
wrapping it (per CLAUDE.md's architecture rule: routes stay thin, logic stays in
the service). No missing backend requirement blocks this.

After that, per `CLAUDE.md`'s build order: minimal Next.js Roster Lab UI with the
required disclosures from decision 0007 §8 (banner, badges, attribution footer,
methodology note — exact wording is in that section).

## Commands to re-verify state after resuming

```bash
uv run ruff check .
uv run mypy
uv run pytest -q
```

All three should pass clean. If they don't, something changed since this file was
last updated — trust the code over this document.

---

## Keeping this file current

Update this file (don't just append — edit the relevant sections) whenever:
- a new decision record is created or an existing one's status changes
- a new slice is completed (update "What's actually built" and "Exact next task")
- a bug or gotcha worth remembering is found
- anything gets committed to git (update the "nothing is committed" note)

Keep it short enough to read in two minutes. Long-form detail belongs in
`docs/architecture/README.md`, decision records, or code docstrings — link to
those rather than duplicating them here.
