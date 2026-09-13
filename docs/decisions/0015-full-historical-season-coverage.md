# 0015 — Full Historical Season Coverage

**Status:** Accepted (2026-09-13)

## Context

Decision 0011 added a second season (2015-16) and explicitly **rejected**
loading every season in the pinned snapshot as "unbounded scope, no product
need," flagging two re-evaluation triggers for later: whether `AppState`'s
explicit dict-of-N-seasons approach still scales past a third season, and
whether a season with real team-code drift from 2014-15/2015-16 would force
`nba-teams.ts` to become season-aware. The user has now explicitly asked for
"all possible seasons," triggering both at once, at maximum scale.

The pinned FiveThirtyEight RAPTOR snapshot
(`data/raw/fivethirtyeight-nba-raptor/2026-07-19/`) was queried directly
before any code changed:

* Its `historical_RAPTOR_by_team.csv` has complete RS (regular-season) rows
  for **46 seasons**, 1976-77 through 2021-22 (the ABA-NBA merger through
  the last season before this snapshot was pinned).
* Team counts grow from 22 franchises (1976-77) to today's 30 (stable since
  2004-05).
* **2013-14 through 2021-22 (9 seasons) use the exact same 30 team codes**
  `nba-teams.ts` already had — zero crosswalk needed for that range.
  Everything earlier has real drift: 42 distinct codes appear across the
  full 46-season history (relocations, renames, defunct franchises), most
  notably **"CHA"**, which names two different franchise identities across
  one continuous run — the expansion "Charlotte Bobcats" (2004-05–2013-14)
  before the 2014-15 rename/rebrand back to "Charlotte Hornets."
* The loader itself (`parse_season_label`, `_build_rosters`,
  `_build_player_seasons`) is already fully generic — no season-range
  assumption baked into any of it.

The user was asked, and chose explicitly: **all 46 seasons**, and **full
era-appropriate franchise names** rather than falling back to raw codes for
pre-2013-14 seasons.

## Options Considered

**Season range:**
1. A narrower "modern realignment era" (2004-05–2021-22, 18 seasons) —
   today's 30 franchises exist throughout, with only SEA/OKC, NJN/BRK, and
   the three Hornets-related codes (NOH/NOK/NOP) as drift.
2. The zero-crosswalk range only (2013-14–2021-22, 9 seasons) — no
   `nba-teams.ts` change needed at all.
3. **All 46 seasons the pinned snapshot covers RS data for (1976-77–2021-22).
   Decision: option 3**, per the user's explicit choice, confirmed after
   seeing the real season/team-code numbers above.

**Historical team-name coverage:**
4. Raw 3-letter codes for any code/season `nba-teams.ts` doesn't recognize
   (zero extra frontend work, defers the naming work).
5. **A full, season-aware, era-accurate franchise-name lookup covering all
   42 codes. Decision: option 5**, per the user's explicit choice.

**Loading architecture** (not asked — a straightforward efficiency fix, not
a product trade-off, decided directly): `load_historical_season()` was
re-reading and re-parsing *both entire multi-decade CSVs from disk* on every
single-season call — tolerable at 2 seasons, but the FastAPI startup loop
calls it once per entry in `SUPPORTED_SEASON_LABELS`, so at 46 seasons that
would mean 46 full-file reads of the same ~50k-row CSVs.
6. Rewrite the startup loop into one bulk `load_all_supported_seasons()`
   function. **Rejected** — a new public API surface duplicating
   `load_historical_season()`'s per-season logic, and every existing test
   calls `load_historical_season()` directly.
7. Move to fully lazy per-season loading (load on first request, cache
   after). **Rejected** — a much larger, more invasive change (thread-safety
   for concurrent first-requests, cache-eviction questions) for a problem
   that a much smaller fix already solves; also drops the
   "no live I/O during a request" guarantee scenario-engine.md §29 already
   established.
8. **Cache the parsed manifest + both DataFrames per `snapshot_dir`
   (`functools.cache` on a new private `_load_source_frames()` helper),
   leaving `load_historical_season()`'s public signature, behavior, and
   every existing call site (including every test) completely unchanged.
   Decision: option 8.** Measured: loading all 46 seasons at startup now
   takes ~2 seconds total (a single CSV read shared across every season),
   down from a projected ~6+ seconds of redundant I/O with the un-cached
   loop. The raw snapshot is immutable for a process's lifetime (data-rules:
   raw snapshots are never overwritten), so caching by path is safe; an
   exception path is never cached (`functools.cache`'s standard behavior),
   so a test constructing a broken snapshot in a fresh `tmp_path` is
   unaffected.

**Frontend default season:** `DEFAULT_SEASON` was independently redeclared
as `SUPPORTED_SEASONS[0]` in four components. With `SUPPORTED_SEASONS` now
starting at 1976-77, that array-position pick would silently make the
*oldest* season the default landing experience everywhere (`/builder`,
`/scenario-lab`, `/players/[id]`, `/teams/[id]`) — a real UX regression, not
just an incidental side effect.
9. Keep `SUPPORTED_SEASONS[0]` as the default. **Rejected** — defaulting new
   users to the sparsest, least-recent season is a poor first impression.
10. **Centralize `DEFAULT_SEASON` in `url-state.ts` as the *most recent*
    supported season (`SUPPORTED_SEASONS[SUPPORTED_SEASONS.length - 1]`),
    removing the four independent redeclarations. Decision: option 10.**

## Decision

**Backend** (`backend/fixtures/historical_loader.py`):
`SUPPORTED_SEASON_LABELS` is now computed as every `"{start}-{end}"` label
for `end_year` in `range(1977, 2023)` (46 labels) rather than a 2-entry
literal set — still an explicit, auditable constant, just generated instead
of hand-typed, and verified to match the snapshot's own RS season range
directly (not assumed from FiveThirtyEight's stated coverage). A new
`_SourceFrames` dataclass plus `@functools.cache`-decorated
`_load_source_frames(snapshot_dir)` factor the manifest read + both CSV
parses + the `IncompatibleDataVersionError` check out of
`load_historical_season()`, which now just resolves the season, calls the
cached frame-loader, and runs the existing per-season `_build_rosters()`/
`_build_player_seasons()` filtering — identical public signature, identical
error semantics, identical behavior for every existing caller and test.

**Frontend:**
* `frontend/src/lib/url-state.ts`'s `SUPPORTED_SEASONS` is hand-mirrored to
  the same 46 labels (verified byte-for-byte against the backend's
  generated list — this project has no shared-codegen step for plain
  constants, only for the OpenAPI schema).
* `DEFAULT_SEASON` is now exported once from `url-state.ts` as the most
  recent season; `PlayerDetailView.tsx`, `RosterBuilderView.tsx`,
  `ScenarioForm.tsx`, and `TeamDetailView.tsx` all import it instead of
  redeclaring `SUPPORTED_SEASONS[0]`.
* `frontend/src/lib/nba-teams.ts` is now a season-aware lookup: each team
  code maps to one or more `{startSeason, endSeason, name}` eras (verified
  season-by-season directly against the pinned CSV's own team/season
  columns, not general franchise-history knowledge). `teamDisplayName(code,
  season)` finds the era containing `season`; an unrecognized code, or a
  season outside every era for a recognized code, falls back to the raw
  code (defensive — not expected to trigger for any pair this app's own
  loader actually produces). `ScenarioForm.tsx`/`TeamDetailView.tsx` were
  updated to pass their already-in-scope `season` value through.
* A new `seasonDecadeGroup()` helper in `url-state.ts` buckets a season into
  its decade (`"1999-00"` → `"1990s"`) so the 46-entry season `<select>` in
  `ScenarioForm.tsx`/`RosterBuilderView.tsx` renders as native
  `<optgroup>`s — the same chunking approach `ScenarioField` already uses
  for the ~570-player "Player to add" list (decision 0008's UI-003 review),
  not a new UI pattern.
* `player-positions.ts` (decision 0014) is unaffected: its documented
  partial coverage already degrades to "position not listed" for any
  unmapped player, which is now simply the common case for the ~44 seasons
  outside 2014-15/2015-16 rather than a rare edge case — no code change
  needed, the design already accounted for this.

**Tests:** every "unsupported season" fixture that used `"1999-00"` or
`"2016-17"` (arbitrary picks that predated this decision, both now real,
valid seasons) was updated to `"2022-23"` — real, but deliberately one
season past the pinned snapshot's own range. New coverage: the earliest
(1976-77) and latest (2021-22) supported seasons, the SEA→OKC relocation
boundary (2007-08/2008-09), a season immediately before and after the
pinned range, and (frontend) the CHA Bobcats/Hornets disambiguation, a
relocated code, and the Katrina-era NOK naming.

## Consequences

* Backend: 175 → 180 tests. All 46 seasons load correctly (spot-verified:
  1976-77's 22-team ABA-merger roster, 1990-91's Charlotte Hornets roster
  including Dell Curry, the SEA/OKC boundary) — not just the two previously
  supported seasons.
* Frontend: 176 → 186 tests.
* Startup cost: loading all 46 seasons now takes ~2 seconds (measured), a
  one-time FastAPI startup cost, not a per-request one.
* `docs/architecture/README.md`'s fixture-loader section and
  `docs/decisions/README.md`'s index were updated to match.
* Every other supporting page/table/link (rotation tables, player/team
  detail pages, the roster builder) needed no changes — none of them assume
  a specific season string, only `SUPPORTED_SEASONS`/`DEFAULT_SEASON`/
  `teamDisplayName()`, all fixed at the source.

## Re-evaluation Triggers

* If `nba-elo` (team win/loss outcomes, currently unloaded — decision 0007
  §10) is ever wired in for a future win-conversion methodology, its own
  coverage (1947-2015, per the audited manifest) is narrower than RAPTOR's
  46-season range and would need its own explicit scope decision, not a
  silent assumption that every RAPTOR-supported season also has Elo data.
* If a future data refresh changes which seasons the pinned snapshot has
  complete RS rows for, `SUPPORTED_SEASON_LABELS`/`SUPPORTED_SEASONS` must
  be regenerated and re-verified against the new file directly — never
  hand-adjusted by assumption.
* If `nba-teams.ts`'s era table is ever found to have a date-boundary error,
  fix it directly against `historical_RAPTOR_by_team.csv`'s own
  season/team columns (the same verification method used here), not from
  general franchise-history recall.
