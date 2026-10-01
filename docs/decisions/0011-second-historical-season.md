# 0011 — Second Historical Season

**Status:** Accepted (2026-09-10)

## Context

`POST /scenarios` and the Roster Lab frontend are complete through step 8
(supporting player/team detail pages, decisions 0008-0010). Per CLAUDE.md's
build order, step 9 is "visual polish and broader features." `docs/decisions/
0008-roster-lab-frontend-architecture.md`'s "Re-evaluation Triggers" section
explicitly named a second season as one of three triggers to re-open that
ADR's single-season assumptions ("actually requested," not part of the
shipped MVP). The user requested it directly.

The product remains historical-only (decision 0005) and fully free (decision
0007) — this decision only adds a second season within the already-approved
FiveThirtyEight RAPTOR snapshot, no new data source.

## Season Choice

The pinned snapshot (`data/raw/fivethirtyeight-nba-raptor/2026-07-19/`) was
queried directly for every season's team-row completeness. 2013-14, 2015-16,
2016-17, and 2017-18 are all structurally clean: 30 teams, zero nulls, in
both `historical_RAPTOR_by_team.csv` and `historical_RAPTOR_by_player.csv`.

**2015-16** was chosen: it is 2014-15's forward neighbor (closest in time,
minimizing roster/team continuity drift) and — verified directly — uses
**identical team codes** to 2014-15 (`NOP`, `BRK`, `CHA` already settled by
2013-14 onward; 2012-13 still used `NOH`, one code short of matching). This
means `frontend/src/lib/nba-teams.ts`'s existing team-code → franchise-name
lookup table needs **no changes** — the season was picked specifically to
avoid that crosswalk (data-rules: "ambiguous identity matches require
review" — choosing a season with zero code drift sidesteps that review
entirely rather than doing it under time pressure).

## Options Considered

**Scope of the change:**
1. Make `AppState` season-agnostic by loading every season present in the
   1977-2022 snapshot. **Rejected** — unbounded scope, no product need, and
   the frontend has no UI for a 45-season picker; this decision is about
   proving multi-season support works, not maximizing coverage.
2. Add exactly one more season (2015-16), keeping `AppState` a small
   explicit dict keyed by label rather than a dynamic range. **Decision:
   option 2.** Matches the "smallest credible version" principle CLAUDE.md
   states for every build-order step.

**Backend season storage:**
1. Keep `AppState` holding one `HistoricalSeasonData`/`RosterScenarioService`/
   provider-dict, and reload per-request based on the `season` parameter.
   **Rejected** — reintroduces per-request I/O the project has deliberately
   avoided since decision 0007 ("model artifact loaded once at application
   startup," scenario-engine.md §29); also breaks determinism guarantees if
   a file changed between requests.
2. `AppState` holds `dict[str, HistoricalSeasonData]` /
   `dict[str, RosterScenarioService]` /
   `dict[str, dict[ContributionProviderChoice, ContributionProvider]]`, all
   built once at startup by looping over `SUPPORTED_SEASON_LABELS`, looked
   up by the request's `season` field. **Decision: option 2.** Every route
   already threaded `season` as an explicit parameter (it was structurally
   present but functionally single-season, enforced only by
   `lookups._validate_season` comparing against the one loaded season) — so
   this is a mechanical widening, not a new abstraction. An unsupported
   season now raises the pre-existing `UnsupportedSeasonError` from a small
   `_season_state()` lookup helper in `app.py`, reusing the existing 4xx
   mapping — no new error type.

## Consequences

- `backend/fixtures/historical_loader.py`'s `SUPPORTED_SEASON_LABELS` is now
  `{"2014-15", "2015-16"}`.
- `backend/api/app.py`'s `AppState` is season-keyed (see above); every route
  handler resolves its season slice via `_season_state()` before use.
- Test coverage added, not duplicated: one loader integration test group for
  2015-16 (`tests/test_historical_loader.py`, real hand-verified facts —
  Stephen Curry's `curryst01` 2015-16 team-stint minutes (2700.0, GSW) and
  RAPTOR offense/defense splits, pulled directly from the pinned CSV, not
  fabricated) plus one focused end-to-end test each in
  `tests/test_api_lookups.py` and `tests/test_api_scenarios.py` proving a
  `season=2015-16` request succeeds through the full route stack. The
  existing 2014-15 test suite is untouched and still the primary coverage.
- `tests/test_historical_loader.py::test_unsupported_season_fails_clearly`
  now asserts `"2016-17"` is unsupported (previously asserted `"2015-16"`,
  which is no longer true).
- Frontend: `frontend/src/lib/url-state.ts`'s `SUPPORTED_SEASONS` gains
  `"2015-16"` — this is also the prerequisite for decision 0012's scenario
  comparison view being able to compare across seasons, not just within one.

## Re-evaluation Triggers

- A third season is requested — re-evaluate whether `AppState`'s explicit
  dict-of-N-seasons approach still scales, or a lazier per-season load
  becomes justified.
- A season with team-code drift from 2014-15/2015-16 (e.g. a relocation or
  rename) is requested — `nba-teams.ts` would then need to become
  season-aware, which this decision deliberately avoided.
