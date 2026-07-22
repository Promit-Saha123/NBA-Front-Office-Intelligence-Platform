# 0008 — Roster Lab Frontend Architecture (First Vertical Slice)

**Status:** Accepted (2026-07-21)

## Context

`POST /scenarios` (decision-adjacent to 0007; see `docs/scenario-engine.md`
§6-7, §31 and `backend/api/`) is built, tested, and stable: one FastAPI route,
one supported season (2014-15), two contribution providers
(`historical_benchmark` / `synthetic`, no default fallback), no auth, no
database, no persistence, no caching. Per `CLAUDE.md`'s build order, the next
slice is the first Next.js "Roster Lab" UI that calls it — the smallest
credible version of the browser-to-domain loop, not a full application.

Before implementation, a bounded architecture and design review was run
(project `council` skill procedure — five independent advisors, anonymized
peer review, this synthesis) scoped to: component/module boundaries, server
vs. client components, typed API-client structure, runtime validation
strategy, state management, error/loading/empty-state behavior,
accessibility, responsive layout, coupling to the current backend response,
scalability to more seasons/providers/persisted scenarios, frontend testing
strategy, and premature abstractions.

## Options Considered

**Data-fetching strategy:**
1. Server components + Server Actions calling FastAPI server-side.
2. Client components with an isolated typed `fetch` API-client module.
3. Hybrid (server component for static shell, client component for the form).

Rejected: (1) and (3)'s server-side leg. This page has nothing to render
before the user submits the form — no initial data to prefetch, no SEO
value, and no server-side caching/auth to leverage (the backend has none of
those either). Server Components/Actions solve a problem (where does
data-fetching happen relative to hydration) that presupposes data exists to
fetch on load; here the entire interaction is a client-initiated mutation
after the page is already interactive. Importing that framing was a false
axis, not a real fork. **Decision: option 2** — a plain client component and
one isolated `lib/api/scenarios.ts` module. (Council: unanimous once raised;
no advisor defended the server-side leg.)

**Response typing / runtime validation:**
1. Hand-write TypeScript types + a hand-written zod schema, independent of
   the backend's Pydantic models.
2. Generate types (and ideally validation) from FastAPI's own
   auto-generated OpenAPI schema.
3. Trust compile-time types only, no runtime check.

Rejected: (1) as specified — a hand-maintained zod schema, a hand-written TS
type, and the backend's Pydantic model are three independently-edited
representations of one contract with nothing wiring them together. The
sharpest, most-agreed Council finding: this drifts silently on any backend
field rename or reshape, and the disclosure fields `CLAUDE.md` makes
non-negotiable (`provider_type`, `data_version`, `attribution`,
`model_version`) are exactly what would break quietly. Rejected (3) outright
— the API response is external input crossing a process/language boundary;
`CLAUDE.md` requires validating external input, and nothing here exempts a
same-team backend. **Decision: option 2, but still validated at runtime** —
generate types from `/openapi.json` (already free from FastAPI/Pydantic;
`backend/api/schemas.py` needs no changes) and validate the response against
that generated shape at the one fetch boundary in `lib/api/scenarios.ts`.
This keeps runtime validation (the drift a generated-but-unchecked type
wouldn't catch on its own) while removing the hand-sync failure mode.

**State management:**
1. A global state library (Zustand/Redux/etc.).
2. TanStack Query for the mutation.
3. Local component state (`useState`/`useReducer`).

Rejected (1) — nothing is shared across routes or components; there is
exactly one form, one in-flight request, one result-or-error union, and the
"no caching" backend rule forecloses the caching/dedup problem a query
library solves. Rejected (2) for v1, though it was a closer call — it is not
harmful, but it is a dependency for ergonomics (retry, cache invalidation)
this slice does not need yet; add it later only if hand-rolled
loading/error state becomes genuinely awkward across more than one mutation.
**Decision: option 3.**

**Form-state location:**
1. Local component state only.
2. URL search params (`useSearchParams`/`router.replace`), no new
   dependency — Next.js's own primitive.

All five request fields are primitive and enum-bounded, and the response is
a deterministic recompute with no server session — URL-backed state costs
the same amount of code as local state (a Council-wide agreed point, and the
single highest-rated insight across the anonymized peer review) and, for
free, yields shareable/bookmarkable scenario links — directly relevant to
this product's stated audience (recruiters evaluating a portfolio piece).
**Decision: option 2**, scoped narrowly: sync the five selector values to the
URL. Do not build a share button, scenario history, or a comparison view now
— those become possible later at no additional state-shape cost, which is
the entire point; building them now would be the scope creep this decision
is otherwise rejecting elsewhere.

**DTO-to-presentation coupling:**
1. Pass the generated response type directly into presentation components.
2. A thin, reshape-only view-model mapping function at the boundary.
3. A richer view-model that also formats/derives display values.

Rejected (3) explicitly — `CLAUDE.md` forbids the frontend inventing or
calculating metrics; a mapper that starts adding derived values (a
formatted percentage, a "win-equivalent" label) would violate that rule in
the one file reviewers are least likely to scrutinize because "it just maps
types." **Decision: option 2** — one function that only reshapes (e.g.
pairs `baseline_rotation`/`scenario_rotation` entries by `player_id` for the
comparison table), never computes. The `architecture-review` skill
(`.claude/skills/architecture-review/SKILL.md`) checks this boundary stays
reshape-only in every review.

## Decision

| Area | Choice | Label |
|---|---|---|
| Rendering | Client component, no Server Actions/RSC data-fetching for this page | Required now |
| API client | One isolated module, `lib/api/scenarios.ts` | Required now |
| Response types | Generated from FastAPI's `/openapi.json`, not hand-written | Required now |
| Runtime validation | Validate the generated response shape at the one fetch boundary | Required now |
| `model_version` encoding | Typed/validated as literally `null`, not optional, so a future non-null value is visible, not silently absorbed | Required now |
| Error mapping | One plain error-code → message lookup table, covering all documented `DomainError` codes, the FastAPI validation-error shape, and a distinct network-failure state (request never reached the server) | Required now |
| State management | Local component state (`useState`/`useReducer`) | Required now |
| Query/mutation library (TanStack Query) | Not for v1 | Defer |
| Global state library | None | Defer (revisit only if a real cross-route sharing need appears) |
| Form-state location | URL search params for the five selectors | Required now (cheap; do it from the start rather than retrofit) |
| Scenario sharing / history / comparison UI | Not built | Defer (the URL-state choice above keeps the door open) |
| DTO → presentation coupling | Thin, reshape-only view-model function | Required now |
| Season selector | Pre-selected/locked to 2014-15 (the only supported value), not an open dropdown | Required now |
| First-load empty state | Team/player/provider selectors start empty; submit disabled until all four are chosen; no result panel until a submission succeeds | Required now |
| Accessibility | Labeled controls, keyboard operability, `aria-live` on the async result region, error text associated to fields | Required now (explicitly requested by the user) |
| Responsive layout | Three-region page (setup / before-after rotation / decision summary) stacks vertically below a breakpoint | Required now (explicitly requested) |
| Testing | Vitest, `fetch` mocked directly (`vi.stubGlobal`) for the API-client and component tests, no live backend required | Required now |
| MSW (richer request mocking) | Not yet | Defer (add if fetch-stubbing becomes awkward across more than a couple of tests) |
| Playwright / e2e against a live backend | Not yet | Defer |
| Multi-season/provider registry, dynamic provider list | Not built | Defer (a literal two-item array covers the current two providers) |

## Rationale

Every "required now" item above resolves to the cheapest option that still
satisfies a binding project rule (`CLAUDE.md`'s "frontend never invents
metrics," "validate external input," accessibility/responsiveness as
explicitly requested) or costs the same as the alternative it replaces (URL
state vs. local state; generated types vs. hand-written types). Every
"defer" item is deferred because it solves a problem this one-page,
one-season, two-provider, no-persistence slice does not yet have, per
`CLAUDE.md`'s rule against unused abstractions and premature infrastructure
— not because it is a bad idea in general.

## Council Process Note

Five independent advisor analyses (Contrarian, First Principles Thinker,
Expansionist, Outsider, Executor) were produced in parallel, then reviewed
anonymously by three independent reviewers (a deliberate reduction from the
council skill's default five-reviewer Round 2, since three converged
strongly and a fourth/fifth pass over the same five texts had low expected
marginal signal), then synthesized here directly rather than via a separate
Chairman subagent (the orchestrating context already held full Round 1/2
output). All three peer reviews ranked the same two analyses (the
DTO/runtime-validation drift critique, and the URL-state-is-free insight)
as the highest-value findings, which is why both anchor the Decision table
above.

## UI-001 Implementation Clarifications (2026-07-21)

UI-001 (the application shell, codegen workflow, API client, and URL-state
utilities — no form or result UI yet) implemented this decision and required
six points to be made concrete. Each is now built, not just decided.

### 1. Deterministic OpenAPI generation

`FastAPI.openapi()` only inspects registered routes and Pydantic models — it
never runs `lifespan` (no season CSV load, no provider construction) and
makes no network/filesystem access beyond the write, so export never needs a
running server.

```text
backend/api/app.py (Pydantic models)
  -> backend/api/openapi.json              generated, committed
       uv run python scripts/export_openapi_schema.py
  -> frontend/src/generated/openapi.json   generated, committed (verbatim copy)
  -> frontend/src/generated/api-types.ts   generated, committed (openapi-typescript)
       pnpm run generate:api   (runs both of the above, from frontend/)
```

Both `frontend/src/generated/*` files are committed (not gitignored) and
carry a `GENERATED FILE — DO NOT EDIT` banner. Staleness detection:
`pnpm run check:api-fresh` (`node codegen/generate-api.mjs --check`)
regenerates in memory (same subprocess + same in-process
`openapi-typescript` call) and diffs byte-for-byte against the committed
files, exiting 1 with a message naming which file is stale — this is the
command a CI step would run; no CI pipeline file exists yet (none of this
repo does), so this is "CI-ready," not "wired into CI."

`backend/api/openapi_export.py` does the actual export (`build_openapi_schema`,
`render_openapi_schema` — `json.dumps(..., indent=2, sort_keys=True)` for
byte-stable diffing); `scripts/export_openapi_schema.py` is the thin CLI
(supports its own `--check`, used by the Node script rather than duplicated).
`frontend/codegen/generate-api.mjs` calls `openapi-typescript`'s JS API
(`openapiTS()` on the parsed object) rather than its CLI — the CLI shells out
to `@redocly/openapi-core`'s file-based `$ref` resolver, which mishandles
paths containing spaces (this repo's own directory name); passing the parsed
object in-process sidesteps that entirely, and there's nothing to sidestep
around anyway since the schema has no external `$ref`s.

### 2. Runtime validation

Chose neither a hand-written zod schema nor a bare `as ScenarioResponse`
cast. `frontend/src/lib/api/validate.ts` compiles an **ajv** (`Ajv2020`,
JSON Schema 2020-12 — the draft FastAPI's OpenAPI 3.1 output actually uses,
confirmed empirically: `model_version` renders as
`anyOf: [{type: string}, {type: null}]`) validator directly from
`src/generated/openapi.json`'s `components.schemas`, registering each named
schema under the key `#/components/schemas/<Name>` so internal `$ref`s
between them resolve (verified working against the real generated document,
including a rejection test for a payload missing the required-but-nullable
`model_version`). This is deliberately not `openapi-zod-client` (evaluated
and rejected: last published over a year ago, pinned to zod's major-version-
old `^3.19.1` while the ecosystem is on zod 4 — a stale, narrowing dependency
for something ajv does more directly) and not a hand-written zod schema
(exactly the drift risk this ADR's "Response typing" section already
rejected). Because the validated JSON Schema **is** the same generated
document `api-types.ts` was generated from, there are exactly two generated
artifacts and zero hand-maintained duplicates of the contract — never three.

### 3. URL-state behavior

`frontend/src/lib/url-state.ts` (pure, framework-agnostic — takes/returns
plain objects, no DOM or router dependency, so it's unit-tested directly)
plus a thin `frontend/src/lib/use-scenario-selection.ts` React hook binding
it to `next/navigation` (untested directly; the logic worth testing lives in
the pure module, per `docs/architecture-review` boundary-testability rule).

* **Missing/invalid/unsupported values:** every param normalizes to `null`
  on parse — never throws, never passes through an invalid value. Season is
  validated against `SUPPORTED_SEASONS = ["2014-15"] as const` (a literal
  array, the same "defer the registry, ship the literal list" pattern this
  ADR already applies to providers) — an unsupported season in the URL
  becomes `null`, not a passthrough.
* **Team change invalidating `player_out_id`:** `applySelectionUpdate()`
  clears `playerOutId` whenever `teamId` changes, since the backend requires
  the outgoing player to be on the *selected team's* roster
  (`backend/scenario/service.py`). `playerInId` is deliberately left alone —
  the backend's swap rule allows the incoming player from any team in the
  season, so there is no structural reason to clear it client-side; the
  backend remains final authority if a specific combination is invalid.
* **Season × player validity:** not enforced client-side in UI-001 — there is
  no roster data on the client yet (that's UI-002, which will fetch/hold
  roster data to drive the selectors), so this cannot be validated here
  without a request; documented as an explicit gap, not silently skipped.
* **push vs. replace:** `updateSelection()` (every in-progress edit) uses
  `router.replace`; `commitSelection()` (call only on actual submission, not
  built yet — that's UI-002) uses `router.push`. Not yet wired to a submit
  button since no form exists in UI-001.
* **Back/forward and hydration:** `useSearchParams()` is Next's own
  server/client-consistent primitive, so there is no manual
  `window.location` parsing and no hydration mismatch. Verified indirectly:
  `parseScenarioSelection(serializeScenarioSelection(state))` round-trips
  and is idempotent under repeated cycles (tested) — the property back/
  forward navigation actually depends on (the same logical state always
  serializes to the same URL).
* **The API result is never placed in the URL** — `url-state.ts` only ever
  touches the 5 input fields; nothing about `ScenarioResponse` appears here.

### 4. Transport-type isolation

```text
src/generated/api-types.ts     (generated; components["schemas"][...])
  -> src/lib/api/scenarios.ts  (the only file importing `components["schemas"]`)
  -> src/lib/view-model.ts     (reshape-only; imports ScenarioResponse type, not `components`)
  -> UI components (none built yet — UI-002+)
```

Only `src/lib/api/scenarios.ts` imports the generated `components` namespace
directly; it re-exports narrow aliases (`ScenarioRequest`, `ScenarioResponse`,
`ContributionProviderChoice`) that the rest of the app imports instead. The
view-model consumes those aliases, never `components["schemas"][...]`
directly, so a future presentation component never needs to know the
generated names exist.

### 5. Error contract

`frontend/src/lib/api/errors.ts` implements exactly the shape requested:

```ts
export class ScenarioApiError extends Error implements ScenarioApiErrorShape {
  readonly status: number;
  readonly code: string;
  readonly devDetail?: unknown; // developer-console diagnostics only, never rendered
}
```

`postScenario()` (`src/lib/api/scenarios.ts`) distinguishes and normalizes
four cases: a domain-error body (`{code, message}`, matching
`backend/api/errors.py`'s table) → known message from a lookup table, or a
generic fallback for any code not yet in that table (future-proof against a
new backend error code shipping before the frontend map is updated); a
FastAPI request-validation body (`{detail: [...]}`) → `FASTAPI_VALIDATION_ERROR`;
a network failure (fetch rejects, no response reached the browser) →
`NETWORK_ERROR`, `status: 0`; and a 2xx body that fails ajv validation →
`INVALID_RESPONSE_SHAPE`. Raw HTTP status text is never surfaced (tested).
No retry logic exists anywhere in the client — a failed request simply
rejects; there is no code path that could retry with a different provider.

### 6. Browser-to-backend boundary

**Decision: the browser calls FastAPI directly — no Next.js proxy route.**
A proxy would solve a CORS, auth, or deployment problem; this MVP has no
auth, no cookies, and the only real problem is CORS itself, which a proxy
doesn't eliminate so much as move (the *browser* still needs same-origin
access to *something*, and that something now has to forward every field
and error shape faithfully — an extra hand-maintained layer duplicating
exactly the normalization `scenarios.ts` already does). Evaluated and
rejected until a concrete need appears: auth (none yet — would likely
justify a proxy later, so it can hold cookies/tokens the browser shouldn't),
deployment coupling (frontend/backend can still deploy to different hosts
with CORS; a proxy would couple them into one deployable unit for no current
benefit), and configuration complexity (a proxy adds a second base-URL to
configure, not fewer).

Required backend change: `backend/api/app.py` now configures
`CORSMiddleware` (`allow_methods=["POST"]`, `allow_headers=["Content-Type"]`),
origins from `FRONTEND_ORIGINS` (comma-separated env var, defaulting to
`http://localhost:3000,http://127.0.0.1:3000` — the Next.js dev origins) —
documented in the root `.env.example`. This is the one backend change this
frontend slice required; everything else in `backend/` is unchanged.
`frontend/.env.example` / `frontend/.env.local` set `NEXT_PUBLIC_API_URL`
(defaults to `http://127.0.0.1:8000`, FastAPI's local dev address) — the
browser reads this directly, so it must be reachable from the browser, not
just from the Next.js server process (there is no Next.js server process in
this request path at all).

### Review findings applied

The `architecture-review` skill and the `frontend-architect` subagent both
reviewed the UI-001 code above; five findings from the latter were fixed
before landing (not left for a follow-up):

1. `codegen/generate-api.test.ts`'s staleness test wrote directly to the
   committed `src/generated/openapi.json` and restored it in a `finally` —
   a real corruption risk if the process were killed mid-test.
   `checkFresh()` now accepts optional `{schemaPath, typesPath}` overrides
   (defaulting to the real committed paths); the test exercises staleness
   detection against a temp-directory file, never the committed one.
2. A missing `NEXT_PUBLIC_API_URL` threw a plain `Error` from
   `apiBaseUrl()`, breaking `postScenario()`'s own documented contract
   ("throws `ScenarioApiError` for every ... failure"). Added
   `CLIENT_CONFIGURATION_ERROR` and moved `apiBaseUrl()`'s call outside the
   `fetch` try/catch so it isn't re-wrapped as `NETWORK_ERROR`.
3. The default `pnpm test` transitively required the backend's `uv`/Python
   toolchain (via the codegen freshness test), contradicting this ADR's own
   "no live backend required" testing line. Split into `pnpm test` (hermetic,
   `src/` only) and `pnpm test:codegen` / `pnpm test:all` (opt-in, needs `uv`).
4. The hand-synced error-code-to-message map in `errors.ts` is a deliberate,
   documented, accepted risk (flagged by the reviewer as worth naming, not a
   defect) — the same "hand-maintained representation" pattern this ADR
   rejected elsewhere, tolerated here only because the list is short and
   stable. Revisit if it grows past a handful of entries.
5. `applySelectionUpdate()` cleared `playerOutId` on a team change but not
   on a season change, even though both are equally roster-scoped. Fixed at
   near-zero cost (season change now clears team + both players) even
   though `SUPPORTED_SEASONS` has one value today and the path is
   unreachable via the UI yet.

## UI-002 Implementation Notes (2026-07-21)

UI-002 (the actual scenario form: season/team/player/provider selectors,
submission, loading/success/error states) required one new decision this
ADR hadn't anticipated, plus several implementation choices worth recording.

### New backend surface: read-only lookups (not a scenario-domain change)

The form needs real team/player data to populate selectors — `POST
/scenarios` alone can't provide that. Evaluated against this ADR's
"Prefer 1. existing typed backend data source" preference (stated
separately at task time, consistent with this document's general bias
toward reusing existing boundaries over inventing new ones): added three
narrow, typed, tested GET routes —
`/seasons/{season}/teams`, `/seasons/{season}/teams/{team_id}/roster`,
`/seasons/{season}/players` — as thin projections over the same
`HistoricalSeasonData` already loaded once at startup
(`backend/api/lookups.py`, pure functions with no FastAPI/Pydantic
dependency; `backend/api/app.py` routes stay thin). This does **not**
touch `backend/domain/`, `backend/scenario/`, `backend/minutes/`, or
`backend/providers/` — `RosterScenarioService` remains the only place
scenario domain logic lives. CORS now allows `GET` in addition to `POST`.

### Transport-isolation rule refined: "only src/lib/api/" not "only scenarios.ts"

UI-001's rule ("only `scenarios.ts` imports generated `components["schemas"]`
directly") assumed a single endpoint family. With `lookups.ts` added as a
second real API-client module needing typed responses, the rule is refined
to: **only files under `src/lib/api/` import generated transport types
directly; presentation components never do.** A new `src/lib/api/http.ts`
was extracted (shared `fetch` + error-normalization core, used by both
`scenarios.ts` and `lookups.ts`) — it imports zero generated types itself
(callers supply their own compiled ajv validator and type parameter), so it
has no transport-type coupling of its own. This was a refactor of
already-shipped UI-001 code, not new-endpoint-only code — its existing
tests (`scenarios.test.ts`) continued passing unmodified through the
extraction, which is the evidence it was a faithful refactor, not a
behavior change.

### Stale-response handling: field-disabling is primary, AbortController is a backstop

All five form fields (not just the submit button) disable while a request
is in flight, which prevents the "user changes selections mid-request" race
by construction — selections literally cannot change while disabled. An
`AbortController` still cancels the in-flight `fetch` on unmount or a new
submission, as a defensive backstop for the component-unmount case; an
aborted request's rejection (`DOMException` named `"AbortError"`) is
rethrown as-is through `http.ts` rather than wrapped as `NETWORK_ERROR`,
and the caller discards it silently. Chose this over `AbortController`
alone (which would have needed request-identity comparison to safely
ignore a superseded response) because disabling fields is simpler, and it
was already required for the loading-state UX regardless.

### Derived `loading`, not a toggled flag, in the roster-lookup hooks

`src/lib/use-roster-lookups.ts`'s three hooks compute `loading` by
comparing a completed-request key against the currently-requested
key, rather than calling `setState` to explicitly flip a loading flag at
the top of an effect. This was forced by eslint's
`react-hooks/set-state-in-effect` rule (disallows an unconditional
synchronous `setState` call in an effect body — only inside a
resolved/rejected-promise callback is allowed); the derived-key approach
satisfies it cleanly and has no separate "reset to loading" call to forget.

### Selection-prevention: filtering, not just error messages

Player-in options are filtered to exclude the selected team's current
roster — which structurally also excludes the current player-out selection
(they're on the roster too), so the same-player-swap and
already-on-roster cases share one filter rule instead of two. This is a
UI convenience only; `RosterScenarioService` remains the final authority
(scenario-rules skill: "the backend remains the final authority"). A
`withSelectedOptionVisible()` helper handles the resulting edge case: a
direct URL edit can select a value the normal filter would exclude, and a
controlled `<select>` cannot visually reflect a `value` with no matching
`<option>` — so the currently-selected id is always kept visible as an
option (using a known display name when available, the raw id otherwise)
even when it would otherwise be filtered, so the field's error text stays
legible against what the control actually shows.

### Testing: a hand-built reactive `next/navigation` mock

No official Next.js App Router test utility exists for `useRouter`/
`usePathname`/`useSearchParams` as of this writing. `ScenarioForm.test.tsx`
mocks `next/navigation` with a small `useSyncExternalStore`-backed fake
router (`router.push`/`replace` update a module-level "current URL" and
notify subscribers) so `useSearchParams()` re-renders consumers the same
way real client-side navigation would — verified necessary in practice: an
earlier, non-reactive version of the mock caused controlled `<select>`
elements to silently revert after simulated interaction, since nothing
re-rendered the component with the updated selection. `@/lib/api/lookups`
and `@/lib/api/scenarios` are mocked directly (not `fetch`) for these
component tests — network/error normalization is already covered
exhaustively by `lookups.test.ts`/`scenarios.test.ts`; component tests only
need to prove the form calls them correctly and renders their results.

### Review findings applied (UI-002)

The `architecture-review` skill and the `frontend-architect` subagent both
reviewed the UI-002 code; the subagent found seven issues, all fixed before
landing:

1. **Stale-request race in the roster-lookup hooks.** The original
   `loading` derivation compared only a completed-result's key against the
   currently-requested key — correct for moving to a genuinely new key, but
   wrong for *revisiting* one: select team A (resolves), select team B
   (never resolves), select team A again before B settles — the stored
   result was still A's *first, now-stale* completion, so the key-equality
   check reported `loading: false` with old data while a brand-new request
   for A was actually in flight. Two other eslint `react-hooks` rules
   constrained the fix (see `src/lib/use-roster-lookups.ts`'s module
   comment for the full account, verified empirically against this
   project's exact lint config rather than assumed): `set-state-in-effect`
   forbids a synchronous `setState` at the top of an effect body, and
   `refs` forbids reading `ref.current` during render at all (even via an
   intermediate local variable) — ruling out both an obvious "reset to
   loading" call and a monotonic-counter-in-a-ref approach. The fix instead
   clears the stored result from the effect's **cleanup** function
   (`setState` inside cleanup is permitted) whenever its own request never
   settled before being torn down — conservative (an abandoned request
   always clears, even if a *different* still-fresh result would have
   remained technically valid) but correct, and consistent with this ADR's
   own "no caching" rule since nothing here was trying to preserve a cache
   anyway. Added `src/lib/use-roster-lookups.test.ts`, including a direct
   regression test for the exact A→B→A sequence.
2. **Team field had none of the URL-desync protection given to the player
   fields**, and the "team not found" error was surfacing on the
   player-out field (via the roster-fetch failure) instead of the team
   field itself. Fixed: `withSelectedOptionVisible` now applies to the team
   options too, and an explicit `teamNotFoundInvalid` check (comparing
   `selection.teamId` against the loaded teams list) attaches its own error
   text to the team field and joins `submitDisabled`.
3. **Success was never announced to assistive technology** — the live
   status region handled `loading` and `error` but rendered empty on
   `success`, leaving the actual confirmation text to a separate,
   non-live `ScenarioSuccessPreview` panel a screen-reader user would have
   to discover manually. Fixed: `ScenarioStatus` now renders a brief
   "Scenario completed successfully." line on success inside the same live
   region; the longer preview panel's own duplicate heading was removed
   (one source of that sentence, not two).
4. **No client-side check that `player_out_id` is actually on the selected
   roster** — asymmetric with the same-player and already-on-roster checks
   that already existed. Added `playerOutNotOnRosterInvalid`, mirroring the
   existing pattern.
5. **Player-in options weren't roster-filtered while the roster was still
   loading** — briefly offered the entire season, including players
   actually on the just-selected team, which `playerInAlreadyOnRosterInvalid`
   caught retroactively (nothing could be submitted invalidly) but was
   confusing UX. Fixed: player-in now also disables while
   `teamRoster.loading` is true for a selected team.
6. **`ScenarioSuccessPreview` omitted `attribution`.** The other four
   deferred disclosure fields (`data_version`, `minutes_method`,
   `minutes_assumptions`, `model_version`) remain deliberately out of this
   temporary preview per UI-002's explicit scope (full disclosures are
   UI-003), but `attribution` specifically is a CC BY 4.0 license
   obligation, not cosmetic polish — added now, ahead of the rest.
7. **CSS grids could overflow on a viewport narrower than their `minmax()`
   floor** (an edge case, but not impossible with browser zoom). Fixed:
   `minmax(220px, 1fr)` → `minmax(min(220px, 100%), 1fr)` (and the same for
   the success grid's 200px).

Two observations from the review were not changed: the hand-built
`next/navigation` mock returns a fresh `useRouter()` object on every call
(unlike Next's more stable reference), which defeats `useCallback`
memoization inside tests but nothing in the app depends on that
referential stability for correctness; and because the mock never actually
suspends, the `<Suspense>` boundary in `page.tsx` is exercised by no test —
acceptable given Playwright/e2e is already explicitly deferred, but a real
gap if a future regression there needs catching.

## UI-003 Implementation Notes (2026-07-21)

UI-003 (the full results and disclosures experience, replacing
`ScenarioSuccessPreview`'s temporary minimal grid) added three new
presentation components — `RotationComparisonTable.tsx`,
`ExplanationFactorsList.tsx`, `ScenarioDisclosuresPanel.tsx` — composed by
the rewritten `ScenarioSuccessPreview.tsx`. No new backend surface, no new
fetching: `postScenario()`'s existing response and `toScenarioViewModel()`
already carried everything needed.

### Display-only arithmetic stays out of the view-model, same as UI-002's `.toFixed()` precedent

`RotationComparisonTable.tsx` sums already-fetched per-player minutes into
a visible totals row (scenario-rules: "minutes total exactly 240" must be
visible). This is arithmetic on data already present in the validated
response — a footer sum, not a new domain claim — so it stays in the
component, not `view-model.ts`, consistent with the "DTO-to-presentation
coupling" decision above (option 3, a view-model that also formats/derives
display values, was rejected) and with `.toFixed(3)` display rounding
already living in `ScenarioSuccessPreview.tsx` since UI-002. The same
reasoning applies to `frontend/src/lib/format.ts`'s one shared
`humanizeSnakeCase()` helper (relabels an already-present value for
display, e.g. `"team_contribution"` → `"Team contribution"`; never
fabricates one) — a new file rather than inline duplication only because
two of the three new components needed the identical one-liner.

### Decision 0007 §8's attribution footer is static required copy, not a substitute for the response's own citation

`ScenarioDisclosuresPanel.tsx` renders §8's exact attribution-footer
sentence as a hardcoded constant (`ATTRIBUTION_FOOTER`) *and*, on a
separate line, the response's own `attribution` field (the provider's
specific citation, e.g. RAPTOR's manifest-sourced string). An earlier
version substituted the response field for the required footer text
entirely — the `frontend-architect` review caught this as dropping the
NBA-Elo team-game attribution and the non-affiliation legal disclaimer
from the deployed UI. The footer is treated as an app-wide provenance/
legal statement (naming every pinned, licensed source this product is
built from) rather than a per-response functional claim, so it renders
unconditionally regardless of which provider a given scenario used.

### Outgoing player always gets a zero-minute row; the incoming player sometimes gets none at all

`backend/scenario/service.py` explicitly appends the outgoing player to
`scenario_rotation` at 0 minutes — but has no equivalent explicit append
for the incoming player. A live integration boot (uvicorn + a real
`POST /scenarios` call — the deepest verification available, since no
browser-automation tooling is installed in this environment and standing
one up now would contradict this ADR's own Playwright deferral) surfaced a
real case: when the incoming player's inherited minutes weight is too low
for the minutes allocator's rotation-size cap, they are excluded from
`scenario_rotation` entirely, with no zero-minute placeholder. Verified
this does not silently confuse the UI: `allocation_repairs` already names
the excluded player_id, and that text is already rendered directly under
the rotation table — no code change was needed, only a regression test
(`ScenarioForm.test.tsx`) locking in the exact response shape observed.

### Review findings applied (UI-003)

The `architecture-review` skill (self-checked against its own checklist,
clean) and the `frontend-architect` subagent both reviewed the UI-003
code; the subagent found 8 issues, 6 fixed before landing:

1. **Attribution footer substitution** — see above.
2. **Heading hierarchy skipped `<h1>` (page title) straight to `<h3>`**
   (`ScenarioSuccessPreview.tsx`'s two `<section>`s), with no `<h2>`
   anywhere. Fixed: the whole results panel is now its own
   `<section aria-labelledby="results-heading"><h2>Scenario result</h2>`,
   with the rotation/factors/disclosures sub-sections as `<h3>` children.
3. **The disclosures panel had no heading or labeled landmark**, unlike
   its two sibling sections, despite carrying decision-0007-mandated,
   non-optional content — a screen-reader user navigating by heading or
   landmark had no way to jump to it. Fixed: wrapped in the same
   `<section aria-labelledby="disclosures-heading"><h3>` pattern.
4. **`ExplanationFactorsList.tsx` imported its factors type from
   `@/lib/api/scenarios` instead of `@/lib/view-model`** — both alias the
   same underlying type today (the view-model doesn't reshape this field),
   so this wasn't a transport-isolation violation, but it was inconsistent
   with its two sibling components, which both import from the view-model.
   Fixed for consistency: one import source for anything hanging off
   `ScenarioViewModel`.
5. **Unnecessary `"use client"` on three purely presentational
   components** (`RotationComparisonTable.tsx`, `ExplanationFactorsList.tsx`,
   `ScenarioDisclosuresPanel.tsx`) — none use state, effects, refs, or
   browser APIs, and none cross a Server-Component `children` boundary
   where the directive would matter. Removed as misleading
   documentation-by-code.
6. **The required RAPTOR/synthetic provider badge was styled as plain
   muted help text**, visually indistinguishable from the disclaimers
   around it, unlike the historical-only banner in the same panel. Fixed:
   reuses the same `badge` class as the banner.

Two findings were left as documented judgment calls, not fixed:
- A `useMemo` was tried for the player-name-lookup `Map` built in
  `ScenarioForm.tsx`, then reverted — eslint's `react-hooks/exhaustive-deps`
  flagged the memo's own dependencies (`?? []` fallbacks) as unstable,
  which would have required memoizing those inputs too for the memo to
  actually hold; at this season's roster scale (hundreds of entries, not
  thousands, on renders already re-deriving the same lists into `<select>`
  options), the plain rebuild is simpler and costs nothing measurable.
- `RotationComparisonTable.tsx`'s totals row displays whatever the sum
  comes out to with no visual flag if it ever failed to equal 240 (e.g. a
  future minutes-allocator regression). Noted as a real gap worth closing
  if scenario-rules' 240-minute invariant is ever violated in practice, not
  required now since the displayed value has never mismatched in testing.

Impeccable's deterministic detector caught one real finding this session,
distinct from the subagent's: an early draft of `RotationComparisonTable.tsx`
marked the incoming-player row with a `border-left: 3px solid
var(--color-accent)` stripe, flagged as a `side-tab` pattern — "the most
recognizable tell of AI-generated UIs." Removed; the row is now
distinguished only by its "Added"/"Removed" text label (bold, accent-
colored) plus a light background tint on the outgoing row, keeping this
project's stated one-accent-hue restraint intact.

## Local Run and Deployment-Config Readiness (2026-07-21)

A session focused on making the app easy to run and inspect locally, and on
confirming the local-to-public-deployment transition really is an
environment-variable change rather than a code change, per this ADR's §6
decision. No new architecture: `NEXT_PUBLIC_API_URL` (frontend) and
`FRONTEND_ORIGINS` (backend) were already the single, centralized
configuration points this ADR called for — verified, not rebuilt. Full
local-run documentation lives in the root `README.md`'s "Local Development"
section, not duplicated here.

### A real backend integration boot and a real browser both used for verification

`uv run uvicorn` + a real `POST /scenarios` call (used in the UI-003
session) and, this session, a full Playwright-driven Microsoft Edge session
(via `channel: "msedge"` against the browser already installed on this
machine — not installed as a project dependency, not committed to
`package.json`) against both `pnpm dev` and `uv run uvicorn` running
together were the deepest verification available, since no
`chromium-cli`/Playwright project dependency exists per this ADR's own
"Playwright / e2e: Defer" line. This surfaced two real, previously-
undetected findings that the jsdom/mocked-router unit tests could not have
caught, since they assert *that a call happened*, not *what a real browser's
navigation history did as a result*:

1. **A duplicate, inconsistently-worded error.** Navigating to a URL with an
   unrecognized `team_id` showed "That team wasn't found for this season."
   on the team field (the dedicated `teamNotFoundInvalid` check added in
   UI-002's own review) *and* "That team wasn't found for the selected
   season." on the player-out field (the roster-fetch's own
   `teamRoster.error?.message`, which the UI-002 fix never suppressed once
   the team-field check already covered the same underlying failure).
   Fixed: `ScenarioForm.tsx`'s player-out `errorText` now suppresses the
   roster-fetch error when `teamNotFoundInvalid` is already true.
2. **`commitSelection()`'s `router.push()` never actually creates a new,
   back-navigable browser history entry.** Confirmed via `history.length`
   staying flat across two real, distinct submissions (different providers)
   in a live browser — not a script artifact; reproduced identically with
   plain `window.history.back()` bypassing Playwright's own navigation
   helpers. Root cause: `navigate()` computes `href` from the *current*
   `selection`, which every preceding `updateSelection()` `replace()` call
   already synced into the URL bar — by the time `commitSelection()` fires,
   its `push()` target is structurally identical to what `replace()` just
   set, and Next.js's router (like the underlying History API in practice)
   does not create a distinguishable entry for a push to an unchanged URL.
   **This ADR's "push vs. replace" design (§3, "URL-state behavior") does
   not achieve its stated goal** ("so back/forward moves between submitted
   scenarios") as actually built — every other property of the URL-state
   design still holds (shareable links, refresh-safe, no response data in
   the URL, no invented params), only the specific back/forward-between-
   submissions promise is unmet. Not fixed this session: a real fix needs a
   deliberate design decision (e.g., a distinguishing marker between
   "editing" and "committed" state, which the current 5-clean-params
   design has no room for without inventing a param) that is out of scope
   for a local-run/config-hardening pass — tracked as a follow-up, not
   silently corrected or left undocumented.

### Two more real, fixable issues the same review found

3. **`allocation_repairs` rendered raw Python list syntax** (e.g.
   `excluded (rotation size limit): ['holidju01', 'ezelife01', ...]`)
   directly in the disclosures panel — a real screenshot a portfolio
   reviewer might see. Fixed in `backend/minutes/allocator.py`: the four
   repair-message call sites now join excluded-player-id lists with `, `
   instead of interpolating the raw Python list/repr. No repair *logic*
   changed, no existing test asserted the exact bracket/quote formatting.
4. **The rotation-comparison table's mandatory horizontal scroll on mobile
   (`.tableWrap`'s `overflow-x: auto`, already correct — no page-level
   overflow) had no visual affordance**, confirmed via a real 390px-wide
   screenshot showing columns cut off with no hint more existed. Fixed:
   `RotationComparisonTable.tsx` now renders a "Scroll sideways to see every
   column →" hint, CSS-only (`.scrollHint`, `display: none` above 480px),
   so it never appears on desktop. Table headers were also shortened
   ("Baseline minutes" → "Baseline") to reduce unnecessary overflow
   pressure.

### `/favicon.ico` 404 on every page load

Every real page load 404'd on `/favicon.ico` (no favicon existed anywhere in
`frontend/`), logging a browser-generated console error on every load —
caught by this session's "no blocking console errors" smoke-test check.
Fixed with a minimal hand-generated 16×16 ICO (stdlib `struct` only, no new
dependency) at `frontend/src/app/favicon.ico`, filled with the app's one
existing accent color — a placeholder, not a real design asset.

## Consequences

* `backend/api/schemas.py` becomes a de facto public contract the moment a
  type-generation script depends on `/openapi.json` — per the
  `architecture-review` skill, changing a field name/type/required-ness
  there is now an API-contract change requiring a check against the
  frontend generator output, not just `tests/test_api_scenarios.py` (now
  also `tests/test_api_lookups.py`).
* `backend/api/app.py` now has a CORS dependency on knowing the frontend's
  origin (`FRONTEND_ORIGINS`) — a production deployment must set this env
  var to the real frontend origin, or the browser will fail every request
  with a CORS error (not a 4xx from FastAPI — the browser blocks the
  request before the response body is ever read). Verified directly this
  session: a real `uvicorn` + `next dev` pair, CORS preflight, and a full
  `POST /scenarios` call from the documented frontend origin all worked
  end to end.
* The frontend needs `uv` (backend toolchain) available to run
  `pnpm run generate:api`/`check:api-fresh` — a cross-stack tooling
  coupling accepted deliberately (this is a single-repo project, not a
  separately-deployed frontend team) rather than duplicating the schema
  export in Node.
* Small implementation issues (UI-001..UI-005, drafted separately, see
  `HANDOFF.md`) follow this decision; GitHub issue creation was deferred
  because `gh` CLI is not installed in this environment (user chose to draft
  issues as markdown instead of installing it now).

## Re-evaluation Triggers

* A second page, second season, or scenario-comparison view is actually
  requested — re-evaluate whether TanStack Query, a global store, or a
  richer view-model become justified.
* The hand-off between backend and frontend type generation becomes
  unreliable or the OpenAPI schema stops accurately representing the
  response (e.g. a field typed loosely in Pydantic) — re-evaluate the
  runtime-validation mechanism.
* Authentication, persistence, or a database are added — this decision
  assumed none of the three exist.
