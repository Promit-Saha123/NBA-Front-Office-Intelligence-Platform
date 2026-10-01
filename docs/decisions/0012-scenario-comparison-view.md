# 0012 — Scenario Comparison View

**Status:** Accepted (2026-09-10)

## Context

`docs/decisions/0008-roster-lab-frontend-architecture.md`'s "URL-state
behavior" section deliberately scoped the URL-backed selection to exactly
one scenario, and its "Re-evaluation Triggers" named "a second page ... or
scenario-comparison view" as the point to re-open that scope — "those
become possible later at no additional state-shape cost, which is the
entire point; building them now would be the scope creep this decision is
otherwise rejecting elsewhere." That trigger has now fired: the user
requested a comparison view directly.

## Options Considered

**Where it lives:**
1. A mode toggle on the existing `/` page. **Rejected** — would complicate
   `/`'s URL-state shape and its single-scenario callers (detail pages'
   bare `?season=` reads) for a feature only sometimes in use.
2. A new route, `/compare`. **Decision: option 2.** Keeps `/` completely
   untouched. Per 0008's shareable-URL rationale (this product's audience
   is recruiters evaluating a portfolio piece), a comparison gets its own
   shareable/bookmarkable URL for free, with no param-collision risk
   against `/` or the detail pages (different routes).

**URL scheme for two independent selections on one page:**
1. Restrict both sides to the same season, only letting team/players/
   provider vary. **Rejected** — an artificial restriction the
   architecture doesn't need; a real product question ("how did this
   team's roster compare across two seasons?") would be blocked for no
   implementation-cost reason.
2. Two fully independent 5-field selections (including season), coexisting
   via a prefix on every param name (`a_season`, `a_team_id`, ... `b_season`,
   `b_team_id`, ...). **Decision: option 2.**

**Refactoring `url-state.ts` / `use-scenario-selection.ts`:**
1. Duplicate the module for a second, prefixed variant. **Rejected** — the
   two would drift; every future fix (like the two found in this decision)
   would need applying twice.
2. Parameterize the existing functions by an optional `paramKeys` map
   (default: the existing unprefixed `PARAM_KEYS`), so single-scenario
   callers (`/`, detail pages, existing tests) keep working via the
   default argument with zero behavior change. **Decision: option 2.**
   `applySelectionUpdate` needed no change at all (it operates on the
   state object, not param names); `normalizeSeason` (used independently
   by detail pages) needed no change either.

## Two Real Bugs Found Reading The Actual Code (Not Theoretical)

Adding `paramKeys` alone is not sufficient — both of these were found by
reading `use-scenario-selection.ts`'s actual implementation, not assumed:

1. **`navigate()` rebuilt the query string from scratch** on every
   update/commit (`serializeScenarioSelection(state).toString()`), instead
   of merging into the current URL. Invisible on `/` (its 5 params are the
   *only* ones ever on that URL), but on `/compare`, side A's update would
   silently **drop every one of side B's params**. Fixed: `navigate()` now
   starts from the current `URLSearchParams` (`window.location.search`),
   deletes only this hook instance's own `paramKeys` values, then sets the
   new ones. Verified as a strict superset of the old behavior — the
   existing `use-scenario-selection.test.ts` single-instance cases still
   pass unchanged.
2. **The `#committed-N` history hash-fragment counter would collide across
   two hook instances.** Each `useScenarioSelection()` call gets its own
   `useRef` counter, but both write to the *same* `window.location.hash`.
   Two independent first-commits could both produce `#committed-1`,
   silently reintroducing the exact history-collapse bug ADR 0008 already
   fixed once, for whichever side commits second. Fixed: the hash is now
   namespaced by a `hashPrefix` argument (`#a-1`, `#b-1`, ...), defaulting
   to `"committed"` (unchanged behavior) when not provided.

A third issue, found while wiring up `ScenarioForm` for a second instance:
**every DOM id in `ScenarioForm`, `ScenarioSuccessPreview`,
`EditableScenarioMinutes`, and `ScenarioDisclosuresPanel` was a hardcoded
string** (`"team"`, `"results-heading"`, `"rotation-heading"`,
`"disclosures-heading"`, etc.), several used as `aria-labelledby` targets.
Two instances on one page would produce duplicate DOM ids and ambiguous
`aria-labelledby` references. Fixed: each component gained an optional
`idPrefix` prop (default `""`, unchanged behavior), threaded from
`ScenarioForm`'s own `hashPrefix` prop down through
`ScenarioSuccessPreview` → `EditableScenarioMinutes` /
`ScenarioDisclosuresPanel`.

## Consequences

- `frontend/src/lib/url-state.ts`: `parseScenarioSelection`/
  `serializeScenarioSelection` take an optional `paramKeys` parameter; new
  `makePrefixedParamKeys(prefix)` helper; `PARAM_KEYS` is now exported.
- `frontend/src/lib/use-scenario-selection.ts`: takes optional
  `(paramKeys, hashPrefix)` parameters; `navigate()` merges into the
  current URL instead of rebuilding it.
- `frontend/src/components/ScenarioForm.tsx`: new optional
  `paramKeys`/`hashPrefix`/`heading` props; every internal DOM id is
  prefix-derived from `hashPrefix`.
- New route `frontend/src/app/compare/page.tsx`: renders two `ScenarioForm`
  instances (`makePrefixedParamKeys("a")`/`"b"`) in a responsive two-column
  grid. No new result-rendering component — `ScenarioSuccessPreview` and
  everything it composes render as-is per side.
- `ScenarioDisclosuresPanel`'s "Supported seasons" text (stale at "2014-15"
  only) fixed to read from `SUPPORTED_SEASONS` while in the area — an
  accuracy bug decision 0011 introduced and this decision happened to
  surface.
- Tests: `url-state.test.ts` (prefixed round-trip, no collision between two
  prefixed selections in one `URLSearchParams`), `use-scenario-selection.test.ts`
  (two independent instances don't clobber each other's params; distinct
  commit hashes even when both fire in sequence), and a new
  `compare/page.test.tsx` (unique ids per side; independent team selection;
  a full select-team → remove-player → add-player → run-scenario →
  display-result flow run independently on both sides in one render).

## Re-evaluation Triggers

- A third comparison side, or comparing more than two scenarios at once,
  is requested — the `"a" | "b"` prefix convention would need generalizing
  to an arbitrary list of sides.
- Comparison results need to be persisted or shared as anything richer
  than a URL (e.g. a saved comparison, an exported report) — this decision
  assumed the URL alone is sufficient, matching 0008's original
  shareable-link rationale.
