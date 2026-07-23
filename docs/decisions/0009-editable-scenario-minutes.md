# 0009 — Editable Scenario Minutes

**Status:** Accepted (2026-07-23)

## Context

`POST /scenarios` (decision 0007, `docs/scenario-engine.md` §6-7) and the
Roster Lab frontend (decision 0008, UI-001 through UI-005) are complete and
reviewed: a deterministic one-player swap, heuristically allocated to exactly
240 minutes per side, rendered end-to-end with full disclosures. This
completes CLAUDE.md's build-order steps 1-5. `docs/scenario-engine.md` §15
explicitly deferred manual minutes editing until "the automatic scenario
loop works" — that condition is now met, making this step 6 (editable
minutes and sensitivity analysis), the next item in the stated build order.

## Options Considered

**Scope of the editable surface:**
1. Full post-swap scenario rotation — every player on the new roster gets an
   editable minutes value, including 0 to bench them or a nonzero value to
   activate someone the automatic allocator excluded.
2. A narrow pair of controls — only the incoming player's minutes and how
   the outgoing player's minutes get redistributed.
3. Bespoke controls matching §25's full listed set (incoming minutes,
   outgoing replacement, maximum-player workload, active rotation size,
   replacement-level assumption) one at a time.

Rejected (2) — doesn't cover "active rotation size" from §25 at all, and a
user cannot rebalance anyone besides the two swap participants. Rejected (3)
as redundant — a full-rotation override subsumes incoming minutes, outgoing
replacement, and rotation size (benching via 0 is activation/deactivation in
one mechanism) without bespoke code per lever; "replacement-level
assumption" stays out of scope regardless, since no replacement-level
projection concept exists yet (§18 unresolved). **Decision: option 1**,
confirmed with the user before implementation.

**Partial vs. complete manual assignment:**
1. A partial map, with the server implicitly filling in zero (or rebalancing)
   for any player not named.
2. A complete map: the key set must exactly match the scenario roster (every
   player who would appear on the post-swap roster), or the request is
   rejected.

Rejected (1) — directly conflicts with §15's "must not silently rebalance
user-entered minutes." An omitted key is ambiguous (zero? unset? auto-fill?)
in a way a complete assignment is not. **Decision: option 2.**

**Baseline editability:**
1. Allow editing both baseline and scenario rotations.
2. Baseline stays permanently read-only; only the scenario rotation is
   editable.

Rejected (1) — the baseline reflects real historical minutes (re-normalized
to 240 via the same heuristic allocator as always); it is not a "scenario
assumption" in the product's own framing (CLAUDE.md's primary product
question is about *changes* from a historical baseline, not rewriting
history itself). **Decision: option 2.**

**Endpoint shape:**
1. A second endpoint dedicated to manual-minutes scenarios.
2. Extend `POST /scenarios` with one optional field.

Rejected (1) — it is the same resource (a scenario for a given team/season/
swap) and would duplicate all five existing swap-validation checks for no
behavioral benefit. **Decision: option 2**, additive and backward-compatible
(omitted field = today's unchanged automatic behavior).

## Decision

`RosterScenarioRequest`/`ScenarioRequest` gain an optional
`manual_minutes: dict[str, float] | None`. When present, it must be a
*complete* assignment over the post-swap scenario roster (the outgoing
player is structurally excluded and rejected as an "unexpected" key if
supplied): no negative values, no value over `max_player_minutes` (40.0,
the workload-limit non-negotiable still applies to manual entries), and the
sum must equal exactly `total_team_minutes` (240.0) within the existing
`1e-6` float tolerance. A new pure function,
`backend.minutes.allocator.apply_manual_minutes()`, validates and applies
it — never repairs or rebalances, unlike `allocate_minutes()`. Every
required player gets an entry, including at 0.0 minutes (benching must be a
visible, explicit row, not an omission).

A new domain error, `InvalidManualMinutesError` (`INVALID_MANUAL_MINUTES`,
HTTP 422), is distinct from `InvalidRotationError`: the latter means "the
automatic heuristic failed on real data" (a server/data condition); the
former means "the user's edited table is wrong" (a client input condition)
— the frontend needs the different code to route to inline table-validation
UI instead of a generic error banner.

`minutes_assumptions` (already a free-form dict, rendered generically by the
frontend's disclosures panel) gains one new key, `"scenario_source":
"heuristic" | "manual"`, recording which path produced *this* response's
scenario rotation. `"editable"` flips permanently to `true` — a capability
flag (this deployment now supports editing), decoupled from whether a given
response actually used it. `minutes_method` is unchanged
(`"heuristic-v1"`) — it now explicitly documents the baseline's method only,
which is unconditionally still true.

The frontend adds one new component, `EditableScenarioMinutes.tsx`, composed
into `ScenarioSuccessPreview.tsx` alongside the existing read-only
`RotationComparisonTable`. It owns a component-local draft of scenario
minutes (seeded from the default result, not URL state — this isn't
shareable/bookmarkable like the five original scenario inputs), a live
total gated against exact-240 (no auto-correct), Reset, and Recalculate
(re-POSTs with `manual_minutes` populated). Both the default and edited
results are shown side by side, per §25's "default result, edited result,
difference" requirement — recalculating never replaces the original.

## Rationale

A single general mechanism (full-rotation manual override) does more useful
work than several narrow ones, at no extra backend cost — the same
validation function and the same wire field cover every case. Requiring a
complete assignment removes an entire class of "what does an omitted key
mean" ambiguity that a partial-map design would have to resolve by fiat.
Keeping the baseline fixed preserves the product's core distinction between
"what actually happened" (baseline, historical fact) and "what if" (scenario,
an assumption space the user can explore) — editable baseline minutes would
blur that line for no product benefit. A distinct error code costs one small
class and one dict entry on each side, and buys the frontend a real
UX distinction (inline table validation vs. a generic banner) that a shared
code could not provide.

## Consequences

- Two previously-passing backend tests needed their `minutes_assumptions["editable"]`
  assertion updated from `False` to `True` (`tests/test_scenario_service.py`,
  `tests/test_api_scenarios.py`).
- The wire schema grew: `pnpm run generate:api` was re-run and the
  regenerated `frontend/src/generated/{api-types.ts,openapi.json}` are
  committed alongside this change.
- `minutes_assumptions`' value type widened from `dict[str, float | bool]`
  to `dict[str, float | bool | str]` on both the domain (`backend/domain/models.py`)
  and API (`backend/api/schemas.py`) sides; `ScenarioDisclosuresPanel.tsx`'s
  `formatAssumptionValue()` needed one added `string` branch — the one place
  the "fully generic, zero frontend change" claim about that dict doesn't
  fully hold.
- `docs/scenario-engine.md` §7/§14 (example response bodies), §15, and §25
  are updated in this same change to match what's actually implemented.
- Backend test count: 98 → 121. Frontend test count: 97 → 103.

## Re-evaluation Triggers

- If a future validated (non-heuristic) minutes method ships, `minutes_method`
  may need to become per-side (baseline vs. scenario) instead of describing
  only the baseline, since the two sides could then genuinely differ in a
  way that matters beyond "heuristic vs. manual."
- If product ever wants partial or auto-balanced manual maps, that directly
  reopens the "must not silently rebalance" question this record settles —
  needs its own decision, not a quiet reversal.
- If a hard cap on the *count* of manually-active (nonzero-minutes) players
  is ever wanted (mirroring `maximum_rotation_size`), that's a fifth
  validation rule to add to `apply_manual_minutes()` deliberately — it is
  not currently enforced, since benching via 0 was judged sufficient to
  express "active rotation size" as a user choice rather than a hard limit.
