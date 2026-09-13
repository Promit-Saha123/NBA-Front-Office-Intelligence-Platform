# 0014 — Roster-Builder Scenario Contract

**Status:** Accepted (2026-09-12)

## Context

The user asked for a redesigned primary frontend experience — a full "roster
builder" (reference: CraftedNBA's "Roster Workshop": a player-browser
sidebar, PG/SG/SF/PF/C + bench position slots showing assigned minutes, a
"Run Projection" button) — **replacing** the existing one-player-swap Roster
Lab as the default landing experience. This supersedes prior approved
decisions (0008's Roster Lab as the primary UI), which the user has
explicitly chosen to do.

Architecture research confirmed `backend/minutes/allocator.py` (a pure
`{player_id: weight} -> 240min rotation` function) and the
`ContributionProvider` interface (`(player_id, season_label)` only) are
already fully team-agnostic — zero changes needed there.
`HistoricalSeasonData.player_seasons`/`.contribution_values` are already the
season-wide, team-independent player pool this feature needs — zero loader
changes needed either. What's hardwired to "one real team + one swap" and
needed new code: `RosterScenarioRequest`/`RosterScenarioResult` and
`RosterScenarioService.build_scenario` all presuppose a real `team_id` and an
in/out pair as load-bearing required fields, not optional extensions.

Two real gaps, not just design work, had to be resolved before building:

1. **No player position data exists anywhere in this project.** Not in the
   RAPTOR CSVs, not in any domain model, not in any API response — already
   flagged as a known future-phase gap in `docs/ml-specification.md` and
   `docs/scenario-engine.md` §13. The reference UI's position slots need it.
2. **Win conversion does not exist and is explicitly unapproved**
   (`docs/scenario-engine.md` §7/§20/§22). "Run Projection" cannot produce a
   projected record/win total without opening an entire separate,
   unvalidated methodology project.

## Options Considered

**Scenario contract shape:**
1. Extend `RosterScenarioRequest`/`RosterScenarioResult` with optional
   fields to support a from-scratch roster. **Rejected** — the existing
   types' `team_id`/`player_out_id`/`player_in_id` are load-bearing
   everywhere they're used (validation, rotation math, response shape);
   making them optional would mean every consumer re-checks which mode it's
   in, and the "no baseline" case has no natural value for
   `baseline_rotation`/`baseline_contribution`/`contribution_change` (there
   is no "before").
2. **New, parallel, additive types** — `CustomRosterRequest`/
   `CustomRosterResult`, a new `RosterScenarioService.build_custom_roster()`
   method, and a new `POST /custom-rosters` route — leaving the existing
   swap endpoint/types completely untouched. **Decision: option 2.**

**What "Run Projection" outputs:**
3. Fabricate a projected win/record total so the reference UI's marketing
   framing ("championship-caliber") has a number to show. **Rejected** —
   directly conflicts with CLAUDE.md's Product Claims section and
   scenario-engine.md §20/§22; no approved win-conversion methodology
   exists (0007 §10 still unresolved).
4. Produce an aggregate historical-benchmark contribution value plus the
   existing descriptive offense/defense team profile, labeled identically to
   how the swap scenario labels these (heuristic/descriptive, never causal
   or win-implying). **Decision: option 4.**

**Team-profile shape for a from-scratch roster:**
5. Reuse `TeamProfileCategory` as-is (`baseline_value`/`scenario_value`/
   `change`/`direction`), defaulting `baseline_value` to `0.0`. **Rejected**
   — a from-scratch roster has no "before" state; a fabricated zero baseline
   would misrepresent a trivial "nothing existed before" comparison as a
   meaningful one.
6. A new, single-aggregate `RosterProfileCategory` (`category`, `value`,
   `epistemic_type`) — the same minutes-weighted aggregation formula
   (`_minutes_weighted_contribution`), applied once instead of twice.
   **Decision: option 6.**

**Position data:**
7. Ship generic numbered slots ("Starter 1-5", "Bench 1-7") with no position
   filter, since nothing in the backend needs position at all. Cheapest,
   zero new judgment-call data.
8. Add `frontend/src/lib/player-positions.ts`, a hand-typed
   `player_id -> position` lookup, same "presentational fact, not derived
   from licensed data" reasoning as `nba-teams.ts`'s 30 team codes — flagged
   explicitly as a weaker precedent (more rows, position is a judgment call,
   not a fixed naming convention) for the user to approve or veto.
   **Decision: option 8, user confirmed.** Coverage is deliberately partial
   (~450 of ~573 players across both supported seasons) — see
   `docs/data-source-evaluation.md` §9 for the full account. An unlisted
   player never blocks assignment to any slot; position is a browsing aid,
   never a hard constraint.

**Default landing page:**
9. Keep the Roster Lab as `/` and add the builder as a secondary page.
   **Rejected** — the user explicitly asked for the builder to *replace* the
   current primary experience.
10. Move the Roster Lab to `/scenario-lab` (archived, not deleted — it stays
    reachable and linked from the builder page), add the builder at
    `/builder`, and make `/` `redirect()` to `/builder`. **Decision: option
    10.**

## Decision

**Backend** (`backend/domain/models.py`, `backend/scenario/service.py`,
`backend/api/{schemas,app,errors}.py`):

- `CustomRosterRequest(season_label, player_ids: tuple[str, ...],
  manual_minutes: Mapping[str, float] | None)` — `player_ids` must be
  exactly `CUSTOM_ROSTER_SIZE` (12) unique, existing player-season ids.
- `RosterProfileCategory(category, value, epistemic_type)` — the
  single-aggregate profile type described in option 6 above.
- `CustomRosterResult(season_label, player_ids, rotation, contribution,
  provider_type, provider_version, data_version,
  contribution_epistemic_type, minutes_method, minutes_assumptions,
  allocation_repairs, team_profile: tuple[RosterProfileCategory, ...],
  historical_only, attribution, model_version)` — no
  baseline/scenario/change triplet anywhere in this type; there is no
  "before."
- `InvalidCustomRosterError` (code `INVALID_CUSTOM_ROSTER`, HTTP 422) for a
  wrong player count or a duplicate `player_id`; an unknown `player_id`
  reuses the existing `PlayerNotFoundError` (404) — the same error an
  unknown incoming-swap player already raises.
- `RosterScenarioService.build_custom_roster(request, provider)`: validates
  season, size, and uniqueness; looks up each player's real
  `PlayerSeason.minutes` as the allocator's seed weight (same "real
  historical minutes as the seed" rule the swap's baseline side already
  follows); calls `allocate_minutes()`/`apply_manual_minutes()` directly
  (already reusable, unmodified); aggregates contribution and the two
  profile categories via the existing `_minutes_weighted_contribution()`
  helper (unmodified, called with the single rotation instead of twice).
  **On the heuristic (non-manual) path, the effective `minutes_config`'s
  `maximum_rotation_size` is raised to at least `CUSTOM_ROSTER_SIZE` before
  calling `allocate_minutes()`** (`dataclasses.replace`, not a mutation of
  `self._minutes_config` — the swap engine's own config is untouched):
  `maximum_rotation_size` exists to cap an *ambient* pool that can exceed a
  realistic playing rotation (a real team roster, possibly 15+ players), but
  a custom roster's input already *is* the target size, validated to be
  exactly 12 — there is no larger pool to cap further. Without this, the
  production service (constructed with `DEFAULT_MINUTES_CONFIG`,
  `maximum_rotation_size=10`) would silently drop 2 of every 12
  explicitly-selected players from every default-path projection, discovered
  during review and fixed before merge — see
  `test_custom_roster_never_drops_a_player_to_the_default_rotation_size_cap`
  in `tests/test_scenario_service.py`. A player can still legitimately be
  excluded by the allocator's other, unrelated repair rules (zero recorded
  minutes, or falling under `minimum_rotation_minutes` once scaled — a real
  possibility given how widely season-total minutes can vary across 12
  freely-chosen players) — those are correct, intentional allocator
  behavior, not something this fix suppresses.
- `POST /custom-rosters` (`RosterBuilderRequest`/`RosterBuilderResponse` in
  `backend/api/schemas.py`, named distinctly from the domain types to avoid
  a name collision, same convention as `ScenarioRequest`/
  `RosterScenarioRequest`) — thin route: parse, look up provider, call
  service, map result. `POST /scenarios` and its types are completely
  untouched.

**Position data:** `frontend/src/lib/player-positions.ts` — see option 8 and
`docs/data-source-evaluation.md` §9.

**Frontend:** new route `frontend/src/app/builder/page.tsx`
(`RosterBuilderView.tsx`, local `useState` only — a 12-slot
`(string | null)[]` roster-assignment array, no URL-backed state, matching
the plan's "local-state-only" convention since there are 12+ inputs, not the
5-field shape `url-state.ts` was designed around). Structurally new
components: `PlayerBrowser.tsx` (native `<input type="search">` + position
`<select>`, no combobox library), `RosterSlotGrid.tsx` (12 slot cards,
click-to-assign via `PlayerBrowser`'s "Add to roster" button assigning to
the next empty slot — no drag-and-drop, none exists anywhere in this
codebase). Result rendering (`RosterBuilderResult.tsx`,
`RosterRotationTable.tsx`, `RosterProfilePanel.tsx`) reuses
`ScenarioDisclosuresPanel` **unmodified** — `roster-builder-view-model.ts`'s
`disclosures` field is built to the same `ScenarioDisclosures` shape
`view-model.ts` already defines, since every disclosure field
(provider/version/data-version/epistemic-type/minutes-method/assumptions/
attribution/model-version/historical-only) is identical between the two
response types.

The old Roster Lab (`ScenarioForm` and everything it composes) moved to
`/scenario-lab`, unmodified — see option 10. `/` is now a server-side
`redirect("/builder")`.

## Rationale

Every new backend type/method mirrors an existing, already-reviewed pattern
(the swap scenario's request/result/service shape, its error-to-status
mapping table, its thin-route convention) rather than inventing a new one.
The one genuinely new type (`RosterProfileCategory`) exists specifically
because reusing `TeamProfileCategory` would have required fabricating a
`baseline_value` that misrepresents what was actually calculated — the same
epistemic-honesty discipline decision 0010 already established. Position
data's honesty framing (partial coverage, never a hard constraint, explicit
judgment-call flag) follows `nba-teams.ts`'s own precedent while explicitly
naming where the precedent is weaker, rather than presenting a
hand-transcribed judgment call as equivalent-quality data.

## Consequences

- `backend/domain/errors.py` gained one new error type (`INVALID_CUSTOM_ROSTER`,
  422) — `backend/api/errors.py`'s status-mapping table grew by one entry.
- `ScenarioResponse`/`POST /scenarios` are completely unchanged — this is a
  purely additive API surface (`POST /custom-rosters`).
- `pnpm run generate:api` was re-run; `frontend/src/generated/
  {api-types.ts,openapi.json}` are committed alongside this change.
- Backend: 156 → 175 tests (19 new: `build_custom_roster` unit tests,
  including the rotation-size-cap regression test above, +
  `POST /custom-rosters` API contract tests). Frontend: 172 → 176 tests.
- The old Roster Lab is not deleted — `/scenario-lab` keeps it fully
  reachable and functional, linked from the new builder page.
- `docs/data-source-evaluation.md` gained §9 documenting the position-lookup
  judgment call.

## Re-evaluation Triggers

- If a real, approved win-conversion methodology is ever built (0007 §10),
  whether "Run Projection" should also surface a projected record needs its
  own decision — not a quiet addition to `CustomRosterResult`.
- If player-position coverage needs to grow past this session's ~450
  entries, or a third season is added (decision 0011 precedent), re-verify
  every new player_id against the real pinned CSV before adding — never
  guess an id.
- If the roster builder ever needs saved/named rosters (persistence across
  page loads), that's a new decision — this slice is deliberately
  ephemeral, local-`useState`-only, matching every other page in this app.
