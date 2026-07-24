# Handoff

**Purpose of this file:** load this at the start of a new session (after clearing
conversation / starting fresh) to get back up to speed without re-reading the full
history. Update it at the end of each work session — see "Keeping this file
current" at the bottom.

**Last updated:** 2026-07-24

---

## One-line project state

A **historical-only, fully free** NBA roster-scenario prototype. The backend domain
core (schemas, contribution providers, minutes allocator, scenario service) for the
**2014-15 season** is built and tested, with `POST /scenarios` plus 3 read-only
lookup GET routes (teams/roster/players) over it. The Next.js frontend now has a
complete Roster Lab vertical slice — form (UI-001 infra + UI-002) through full
results and disclosures (UI-003) — built, tested, and reviewed. **The complete
app now runs locally end to end, verified with a real browser in a prior
session** (see "Local run verification" below); centralized config
(`NEXT_PUBLIC_API_URL` / `FRONTEND_ORIGINS`) and CORS were confirmed already
correct from prior sessions, not rebuilt. **UI-004 (frontend component tests)
is done alongside UI-002/UI-003; UI-005 (accessibility/design/security review
pass) is now done** (2026-07-22) — three of four reviews run
(architecture-review, frontend-architect, security-review — all clean or
fixed; `/impeccable` still needs the user's own interactive `init`) — see
`HANDOFF-roster-lab-issues.md`'s UI-005 entry for the full findings/fixes
list and "Portfolio Roadmap" below for how this relates to eventual public
deployment. **Step 6 (editable minutes and sensitivity analysis, decision
0009) is now also done** (2026-07-23): `POST /scenarios` accepts an optional
`manual_minutes` field (a complete, strictly-validated override of the
post-swap scenario rotation — baseline stays read-only), and the frontend's
new `EditableScenarioMinutes.tsx` lets a user edit the rotation table,
recalculate, reset, and see the default and edited results side by side.
Backend: 121 tests (up from 98), ruff/mypy clean. Frontend: 103 tests (up
from 97), typecheck/lint/build clean. See decision 0009 for the full design
rationale. **Step 7 (team-profile interpretation, decision 0010) is now also
done** (2026-07-24): `ContributionProvider` gained `get_player_profile()`
returning offense/defense impact (RAPTOR's own `raptor_offense`/
`raptor_defense` split — the full spec category list needs box-score data
this project doesn't have; see decision 0010), minutes-weighted the same way
contribution is, always labeled `descriptive_interpretation`, never feeding
win/contribution math (locked in by a regression test). New frontend
`TeamProfilePanel.tsx`. Backend: 139 tests (up from 121). **A full
`/impeccable critique` design review also ran this session** (dual-agent:
LLM design review + detector/browser evidence against the live app) —
scored 30/40 (Good); the user asked for every finding to be fixed, starting
with the highest-priority one. All of it is done: a real P1 bug (rapid
field selections could silently drop an earlier one from the URL — root
cause was `use-scenario-selection.ts` reading a stale React-derived
`selection` instead of the live `window.location`, fixed and covered by a
regression test that reproduces the original bug), the duplicate rotation
table folded into one (editing now toggles the same table's Scenario column
into inputs instead of rendering a second table), a precision mismatch
between the read-only and editable views, narrow/clipping minutes inputs,
un-flagged stale results after a post-submit field change, team/player
recognition aids (full team names, player list grouped by first letter via
native `<optgroup>`), a non-interactive Season display, and a "Start over"
action. Frontend: 110 tests (up from 105). Full critique report at
`.impeccable/critique/2026-07-24T00-56-10Z__frontend-src-app-page-tsx.md`.
No database, no trained model exist.

## Portfolio Roadmap

**Answered directly by the user (2026-07-21), resolving the Council's open
question below: this is nowhere close to being deployed via a public URL
for now.** Do not start deployment work, hosting selection, or a Vercel
project on your own initiative — treat "not deploying yet" as the current
answer, not just an unasked question, until the user says otherwise.

> The current target is a polished working local application. A public URL
> is the intended final portfolio outcome, likely using Vercel for the
> Next.js frontend, but deployment will begin only after the local
> experience is reviewed and approved.

A clean private repository is acceptable during active development, but it
is not the final portfolio deliverable. The eventual portfolio-ready
definition includes: a public frontend URL, a stable public backend, a
clear README, screenshots or demo media, an architecture explanation,
methodology and limitations, reproducible setup, and clean repository
history. None of that beyond the README/setup work has been implemented
yet — this session deliberately scoped to "make it easy to run and inspect
locally" plus deployment-readiness *configuration* (env vars, CORS), not
deployment itself. **Nothing has been deployed, no Vercel project exists,
and no backend hosting has been selected or provisioned.** Local-only
development continues; revisit this roadmap only when the user raises
deployment again.

## Local run verification (2026-07-21)

Ran the complete app locally (`uv run uvicorn backend.api.app:app --port
8000` + `pnpm dev` in `frontend/`) and drove it with a real browser —
Playwright's Node API against Microsoft Edge, already installed on this
machine (`channel: "msedge"`), used only as an ad-hoc verification tool this
session (not installed as a project dependency, not added to
`frontend/package.json`/`pnpm-lock.yaml` — decision 0008's own "Playwright /
e2e: Defer" line still holds for the *project*). No `chromium-cli` or
Playwright was available as an existing tool in this environment; this was
the deepest verification achievable without standing up e2e infrastructure
the project has explicitly deferred.

**All 15 items from the smoke-test checklist were exercised for real**
(real 2014-15 data, both providers, real CORS, real error responses) —
14 confirmed working correctly; 1 (browser back/forward between submitted
scenarios) confirmed **not** working as ADR 0008 describes, root-caused,
documented, and deliberately left as a follow-up rather than papered over
— see ADR 0008's new "Local Run and Deployment-Config Readiness" section
for the full account of why (`commitSelection()`'s `push()` always targets
a URL already-identical to what the preceding `replace()` calls set, so it
never creates a distinguishable history entry).

**Four real, concrete issues found and fixed** (all confirmed via
before/after screenshots, not just code inspection):
1. `allocation_repairs` disclosure text leaked raw Python list syntax
   (`['holidju01', 'ezelife01', ...]`) — fixed in
   `backend/minutes/allocator.py` (comma-joined, no brackets/quotes; no
   repair logic changed).
2. The "team not found" error appeared twice, worded differently, on two
   different fields — fixed in `ScenarioForm.tsx` (player-out's roster-fetch
   error is now suppressed when the team field's own check already covers
   it).
3. The rotation-comparison table's mobile horizontal scroll had no visual
   affordance (columns cut off with no hint) — fixed with a CSS-only
   "Scroll sideways to see every column →" hint, shown only below 480px.
4. Every page load 404'd on `/favicon.ico` (none existed), logging a
   browser console error on every load — fixed with a minimal hand-built
   16×16 ICO (stdlib `struct`, no new dependency) at
   `frontend/src/app/favicon.ico`.

**New test coverage added:** `tests/test_api_cors.py` (8 tests — origin
parsing, whitespace/empty-entry handling, a real CORS preflight against an
allowed vs. disallowed origin, credentials-disabled confirmation). Backend
is now 98 tests, frontend still 97 (+ 3 codegen = 100) since the frontend
fixes didn't need new tests beyond the existing coverage.

Full command output, exact localhost URLs, and the local-development
workflow itself are documented in the root `README.md`'s new "Local
Development" section — not duplicated here.

**This session's 11 changed/new files are uncommitted** (same standing rule
as always — don't commit without asking first): `README.md`,
`frontend/README.md`, `.env.example`, `frontend/.env.example`,
`backend/minutes/allocator.py`, `docs/decisions/0008-...md`,
`frontend/src/components/{ScenarioForm.tsx, ScenarioForm.module.css,
RotationComparisonTable.tsx}`, `frontend/src/app/favicon.ico` (new),
`tests/test_api_cors.py` (new). Run `git status` at the start of the next
session before assuming anything — don't trust this list over the actual
working tree if time has passed.

**Correction (2026-07-21): this file previously claimed nothing had ever been
committed to git. That was wrong** — there is a real commit history (a remote
at `origin/main` already exists) going back to the project's initial
specification commit, and the backend domain core was already committed
(`8e75e98`) before this claim was first written. The false claim went
unnoticed across multiple sessions because nobody ran `git log`, only
`git status` (which only shows the working tree, not history) — always check
both before describing repo state. As of this session, everything through
UI-003 is now committed in five session-boundary commits (FastAPI layer,
UI-001, UI-002, UI-003, plus this docs/tooling commit) — see `git log
--oneline`. **Nothing has been pushed to `origin/main` yet** — the local
branch is ahead of the remote; don't push without asking the user first,
same as any other visible/shared action.

## Read first, in this order

1. `CLAUDE.md` — root rules (already reflects everything below)
2. `docs/decisions/0007-fully-free-historical-prototype.md` — the current product
   direction (supersedes the paid-data framing of 0004/0006)
3. `docs/decisions/0008-roster-lab-frontend-architecture.md` — the frontend
   architecture decision — **UI-001 through UI-003 are implemented per this
   ADR**; read its "UI-001 Implementation Clarifications," "UI-002
   Implementation Notes," and "UI-003 Implementation Notes" sections (and
   their "Review findings applied" subsections) for exact file-level detail
4. `docs/decisions/0009-editable-scenario-minutes.md` — the editable-minutes
   design (step 6): `manual_minutes` request field, complete-assignment
   validation, `INVALID_MANUAL_MINUTES`, `scenario_source` — **implemented**
5. `docs/decisions/0010-team-profile-interpretation.md` — the team-profile
   design (step 7): why the full spec category list isn't computable with
   this project's data, the offense/defense-only v1 scope — **implemented**
6. `docs/architecture/README.md` — maps the `backend/` code to the specs
7. This file, for "what's next"

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
| [0008](docs/decisions/0008-roster-lab-frontend-architecture.md) | Next.js Roster Lab frontend architecture (client component, generated+validated API types, URL-backed state) | Accepted, current |
| [0009](docs/decisions/0009-editable-scenario-minutes.md) | Editable scenario minutes: full-rotation `manual_minutes` override, strictly validated, baseline read-only | Accepted, current |
| [0010](docs/decisions/0010-team-profile-interpretation.md) | Team-profile interpretation: offensive/defensive impact only (RAPTOR offense/defense split), full spec category list deferred pending box-score data | **Accepted, current** |

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
  repair logic (see "gotcha" below), plus (step 6, decision 0009)
  `apply_manual_minutes()` — a separate, strict (no repair, no rebalance)
  validator for a user-supplied complete scenario-rotation minutes map
- `backend/scenario/service.py` — one-player, same-season swap; no win conversion,
  no PCE — `model_version` is always `None`, no `projected_wins` field exists.
  Accepts an optional `manual_minutes` request field (step 6): when present,
  the scenario side is built from `apply_manual_minutes()` instead of the
  heuristic allocator; baseline is always heuristic, never overridable.
- `backend/api/` — `POST /scenarios` (`app.py`), Pydantic request/response
  schemas distinct from the domain dataclasses (`schemas.py`), a
  `DomainError` -> HTTP status/code mapping table (`errors.py`), plus 3
  read-only lookup GET routes added for UI-002's selectors —
  `/seasons/{season}/teams`, `/seasons/{season}/teams/{team_id}/roster`,
  `/seasons/{season}/players` — implemented as pure projections in
  `backend/api/lookups.py` (no FastAPI/Pydantic dependency, no scenario
  domain logic; reuses `TeamNotFoundError`/`UnsupportedSeasonError`). The
  2014-15 season data (now also on `AppState.season_data`) and both
  providers are loaded once at startup via a `lifespan` context manager,
  not per-request. Provider selection (`historical_benchmark` /
  `synthetic`) is a required request field — no default, matching the
  domain layer's no-fallback rule. Full scenario contract:
  `docs/scenario-engine.md` §6-7, §31; lookup routes documented in
  `docs/architecture/README.md`.

**Step 8 (backend half — player/team detail pages) is now also done**,
adding 2 more read-only GET routes (full detail in
`docs/architecture/README.md`'s "API layer" section):
  - `GET /seasons/{season}/players/{player_id}?contribution_provider=historical_benchmark|synthetic`
    — `contribution_provider` is a **required** query param, no default (an
    omitted/invalid value 422s via FastAPI's own validation, plain
    `{"detail": [...]}"`, not the domain `{"code","message"}"` shape).
    Response (`PlayerDetailResponse`): `season, player_id, name, minutes,
    possessions` (season-blended totals) + `team_stints: [{team_id, minutes,
    possessions}]` (**a list** — 76 of the 2014-15 season's players were
    traded mid-season, so a player can have 2+ stints; stint minutes are
    regular-season-only and are not guaranteed to sum to the blended
    `minutes` total) + `contribution_value, provider_type, provider_version,
    data_version, contribution_epistemic_type, offensive_impact,
    defensive_impact, attribution` (full provenance quartet, same labeling
    completeness as `ScenarioResponse`). 404 `PLAYER_NOT_FOUND` for an
    unknown player, 422 `UNSUPPORTED_SEASON` for a bad season.
  - `GET /seasons/{season}/teams/{team_id}` — a new, richer sibling of the
    existing `.../roster` route (that route is unchanged). Response
    (`TeamDetailResponse`): `season, team_id, players: [RosterPlayerResponse]`
    (same shape as `.../roster`'s own `players` field) + `roster_size,
    total_roster_minutes` (a plain sum of the listed players' minutes — no
    query param, no provider call, no possessions aggregate — a summed
    per-player possession count would overcount actual team possessions
    ~5x, so it's deliberately not exposed). 404 `TEAM_NOT_FOUND`, 422
    `UNSUPPORTED_SEASON`.

Backend: 149 tests (up from 139), all in `tests/test_api_lookups.py`
alongside the original 3 lookup routes' tests. No new decision record —
checked against CLAUDE.md's trigger list, nothing applies; these are
additive projections in the same category as the original 3 lookup routes,
which also never got a standalone ADR.

**New dependencies:** `fastapi`, `uvicorn[standard]` (main); `httpx2` (dev, for
FastAPI's `TestClient` — `starlette.testclient` deprecated plain `httpx` in
favor of `httpx2` in the version pinned here).

**New backend addition (for the frontend, UI-001):** `backend/api/app.py` now
configures `CORSMiddleware` (origins from `FRONTEND_ORIGINS` env var, default
`http://localhost:3000,http://127.0.0.1:3000`; methods now `GET` and `POST`
since UI-002 added GET routes) — the browser calls FastAPI directly, no
proxy (decision 0008 §6). `backend/api/openapi_export.py` +
`scripts/export_openapi_schema.py` deterministically export the OpenAPI
schema without starting a server (decision 0008 §1). Verified this session
with a real `uvicorn` + `next dev` pair: CORS preflight and a full
`POST /scenarios` call from the documented frontend origin both work.

**Tests:** 90 passing, offline only (`uv run pytest`), including
`tests/test_api_scenarios.py` and `tests/test_api_lookups.py` (API contract:
every status code, every domain-error-code path, both providers, response
schema, a full success path) via FastAPI's `TestClient` — no live server.
Ruff and mypy both clean.

**Frontend** (`frontend/`, Next.js 16 App Router + TypeScript, pnpm@11.15.1)
— **UI-001 (infra) + UI-002 (form) + UI-003 (results/disclosures) all built**:
- `src/app/` — shell (`layout.tsx`, `page.tsx`, `globals.css`): light,
  spacious, one restrained terracotta accent, a `.badge` component for the
  historical-only disclosure. `page.tsx` now renders `<ScenarioForm/>`
  inside a `<Suspense>` boundary (required — the form transitively uses
  `useSearchParams()`).
- `codegen/generate-api.mjs` — regenerates `src/generated/openapi.json`
  (copied from `backend/api/openapi.json`) and `src/generated/api-types.ts`
  (via `openapi-typescript`'s JS API, not its CLI — the CLI's file-based
  `$ref` resolver breaks on this repo's own directory name containing a
  space). Both `src/generated/*` files are committed, never hand-edited.
  `pnpm run generate:api` writes; `pnpm run check:api-fresh` diffs without
  writing (CI-suitable staleness check). Now also generates the 3 lookup
  routes' schemas (`TeamsResponse`, `TeamRosterResponse`,
  `SeasonPlayersResponse`).
- `src/lib/api/http.ts` — **new in UI-002**: shared `fetch` +
  error-normalization core, extracted once a second endpoint family
  (lookups) needed it; imports zero generated types itself. `scenarios.ts`
  and `lookups.ts` both use it and are the only two files that import
  generated `components["schemas"]` directly (the isolation rule loosened
  from "only scenarios.ts" to "only files under src/lib/api/" — see ADR
  0008's UI-002 notes for the reasoning).
- `src/lib/api/validate.ts` — compiles an **ajv** (`Ajv2020`) validator
  directly from `src/generated/openapi.json`'s `components.schemas` (not a
  hand-written zod schema — evaluated `openapi-zod-client` and rejected it
  as stale/zod-v3-locked). Genuine runtime validation, not a
  compile-time-only cast.
- `src/lib/api/scenarios.ts` (`postScenario()`, now accepts an optional
  `{signal}` for `AbortController`-based cancellation) and
  `src/lib/api/lookups.ts` (**new**: `listTeams`, `getTeamRoster`,
  `listSeasonPlayers`) — the only two `fetch`-calling modules.
  `src/lib/api/errors.ts` — `ScenarioApiError{status, code, message,
  devDetail}` + a hand-synced error-code-to-message map covering every
  `backend/api/errors.py` code plus `NETWORK_ERROR`,
  `FASTAPI_VALIDATION_ERROR`, `INVALID_RESPONSE_SHAPE`,
  `CLIENT_CONFIGURATION_ERROR`, `UNKNOWN_ERROR`.
- `src/lib/view-model.ts` — `toScenarioViewModel()`, thin and reshape-only
  (pairs baseline/scenario rotation by `player_id`; groups disclosure
  fields); test explicitly guards against an invented field ever appearing.
  Now actually consumed (`ScenarioForm` computes it once per success,
  threads it into `ScenarioSuccessPreview` — no component recomputes it).
- `src/lib/url-state.ts` (pure, framework-agnostic, unit-tested) +
  `src/lib/use-scenario-selection.ts` — the 5 scenario inputs (`season`,
  `team_id`, `player_out_id`, `player_in_id`, `contribution_provider`) live
  in the URL, never the API result. `router.replace` for edits,
  `router.push` on actual submission (now wired up).
- `src/lib/use-roster-lookups.ts` — **new**: `useTeams`, `useSeasonPlayers`,
  `useTeamRoster` hooks. Non-obvious design forced by two eslint
  `react-hooks` rules (`set-state-in-effect`, `refs` — see gotcha below and
  the file's own module comment for the full account) and a real stale-
  request race the `frontend-architect` review caught (see gotcha below).
- `src/components/` — `ScenarioForm.tsx` (the main piece — URL-
  backed selection, roster-lookup hooks, submission state machine,
  selection-prevention filtering, `AbortController` stale-response
  handling), `ScenarioField.tsx`, `ScenarioStatus.tsx` (loading/success/
  error live region), `ScenarioSuccessPreview.tsx` (now the **full** UI-003
  results container: summary grid + composes the three components below,
  under one `<h2>`/`<h3>` heading hierarchy), `RotationComparisonTable.tsx`
  (**new, UI-003**: before/after per-player minutes, outgoing tagged
  "Removed" + accent tint, incoming tagged "Added" — text label carries the
  distinction, not color alone; a display-only sum of already-fetched
  minutes drives a visible 240-minute total row per side, satisfying
  scenario-rules' "minutes total exactly 240 must be visible"),
  `ExplanationFactorsList.tsx` (**new, UI-003**: every factor traced
  straight to `metric`/`baseline_value`/`scenario_value`/`direction`, no
  generated narrative), `ScenarioDisclosuresPanel.tsx` (**new, UI-003**:
  the full decision 0007 §8 set — historical-prototype banner, RAPTOR/
  synthetic provider badge keyed off `provider_type`, provider/data
  version, contribution epistemic type, minutes method + assumptions, the
  §8 attribution footer **verbatim** plus the response's own
  provider-specific citation, methodology/data-coverage/not-a-prediction
  disclaimers, and an explicit "Not applicable — this MVP ships no trained
  model" state for `model_version` — never hidden), `scenario-submission-
  state.ts`, `ScenarioForm.module.css`. `src/lib/format.ts` (**new,
  UI-003**: one shared `humanizeSnakeCase()` display helper, deliberately
  kept out of `view-model.ts`, which stays reshape-only per decision 0008).
- **Tests:** `pnpm test` (97 tests, hermetic, no `uv`/Python needed, ~1s,
  up from 87 after UI-003) + `pnpm test:codegen` (3 more, needs
  `uv`/Python) = `pnpm test:all` (100 total). `pnpm typecheck`, `pnpm lint`,
  `pnpm build` all clean. `ScenarioForm.test.tsx` uses a hand-built
  reactive `next/navigation` mock (`useSyncExternalStore`-backed — no
  official Next.js router test utility exists) and mocks
  `@/lib/api/lookups`/`@/lib/api/scenarios` directly, not `fetch`.
- **Reviewed three times this project:** UI-001 pass — `architecture-review`
  skill (clean) + `frontend-architect` subagent (5 findings, fixed) +
  Impeccable detector (clean) + manual contrast check (caught and fixed a
  real 4.27:1 badge-text failure). UI-002 pass — `architecture-review`
  skill (1 finding, fixed: form was reading raw response fields instead of
  the view-model) + `frontend-architect` subagent (7 findings, all fixed —
  see ADR 0008's UI-002 "Review findings applied," most notably a real
  stale-request race and a missing success announcement for assistive
  tech) + Impeccable detector (clean) + manual contrast check (clean this
  time). UI-003 pass — `architecture-review` skill (self-checked, clean) +
  `frontend-architect` subagent (8 findings, 6 fixed — the attribution
  footer had silently substituted the response's provider citation for
  decision 0007 §8's required static footer text; a skipped `<h1>`→`<h3>`
  heading level; the disclosures panel had no heading/landmark unlike its
  siblings; a type-import inconsistency; unnecessary `"use client"` on 3
  presentational components; the provider badge wasn't styled as a badge —
  2 left as documented judgment calls, see `HANDOFF-roster-lab-issues.md`
  UI-003) + Impeccable detector (caught and fixed a real AI-tell: a
  `border-left` accent-stripe "side-tab" pattern on the incoming-player
  row, removed in favor of the text label alone). `/impeccable
  init`/`critique`/`audit` proper (the LLM-driven dual-assessment flow)
  still **not** run — needs `/impeccable init` first, which is interactive.
  `/review` still skipped — scoped to GitHub PRs (none exists);
  `/code-review` (the working-diff equivalent) still wasn't in any
  session's available-skills listing.
- **UI-003 also surfaced a real backend-response edge case via a live
  integration boot** (uvicorn + a real `POST /scenarios` call — no
  browser-automation tooling is installed in this environment, and
  standing one up now would contradict decision 0008's explicit Playwright
  deferral, so this was the deepest available verification): when the
  incoming player's inherited minutes weight is too low for the rotation-
  size cap, `scenario_rotation` omits them entirely — no zero-minute
  placeholder, unlike the outgoing player who always gets one
  (`backend/scenario/service.py`'s explicit append only covers
  `player_out_id`). The existing `allocation_repairs` text already
  explains this correctly with no code change needed; a regression test
  now locks in that exact shape.

## Known gotchas / non-obvious facts worth remembering

- **"Parallel sessions working in worktrees" is not actually true by
  default — verify with `git worktree list` before trusting that framing.**
  During step 8, this repo's single shared working directory got its branch
  switched out from under an in-progress session (`main` →
  `step8-frontend-pages` → `frontend-tech-debt`, then a `git reset` that
  discarded that session's uncommitted edits back to committed state) by
  another concurrent session/process — `git worktree list` showed only one
  real worktree the whole time, despite multiple sessions apparently being
  told they had isolated worktrees. Nothing was permanently lost (whatever
  ran did `git stash` before switching, so the discarded edits survived in
  `stash@{0}`), but it could have been. **If you're told another session is
  working "in a parallel worktree," confirm with `git worktree list` before
  assuming your uncommitted changes are safe from a branch switch — if it
  shows only one entry, treat the working directory as shared and either
  commit frequently or set up a real worktree yourself**
  (`git worktree add -b <branch> <path> main`) before starting substantial
  uncommitted work. The step 8 backend work recovered this way lives on
  branch `step8-backend-detail-endpoints` in a sibling directory
  (`../nba-step8-backend`), not in this checkout.

- **Real browser automation is available in this environment without adding
  a project dependency**: Microsoft Edge is already installed
  (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`), and
  Playwright's Node API can drive it directly via
  `chromium.launch({ channel: "msedge" })` — no Chromium download needed.
  `npx playwright --version` works out of the box; to actually `import` it
  in a script, `npm install playwright-core` in a scratch directory outside
  the repo (never in `frontend/`) and run the script from there. This is
  how this session's real browser smoke test worked with no `chromium-cli`
  and no project-level Playwright dependency. Useful any time a future
  session needs to verify something a jsdom-mocked test can't (real
  browser history/navigation, real layout/overflow, real console errors) —
  see this file's "Local run verification" section for what it caught that
  the existing test suite couldn't.
- **`frontend/src/app/favicon.ico` did not exist until this session** —
  every page load 404'd on it, logging a console error. Generated with a
  ~30-line stdlib-only Python script (raw `struct` packing, no Pillow, no
  new dependency) rather than skipped; a minimal 16×16 solid-color icon
  matching the app's one accent color, not a real design asset. If a real
  favicon/logo is ever designed, replace this file directly — no code
  references it (Next.js App Router serves `app/favicon.ico` by convention).
- **The `council` project skill (`.claude/skills/council/SKILL.md`) cannot be
  invoked via the Skill tool**, even on an explicit in-prose request ("use
  the council now") — it sets `disable-model-invocation: true`, which blocks
  programmatic invocation entirely; it only runs from the literal `/council`
  slash command typed by the user. To honor an explicit request anyway, its
  full procedure (5 parallel advisor personas -> anonymized peer review ->
  Chairman synthesis) was read directly from the file and re-executed
  manually via the Agent tool. `docs/decisions/0008-...md`'s "Council
  Process Note" records what was run and why round 2 was reduced to 3
  reviewers instead of 5.
- **`gh` CLI is not installed** in this environment; GitHub issue creation
  for `UI-001..UI-005` was drafted as `HANDOFF-roster-lab-issues.md` instead,
  per the user's explicit choice when asked. Delete that file once the
  issues exist for real in GitHub.

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
- **`scenario_rotation` doesn't always include the incoming player, even
  though it always includes the outgoing one.** `backend/scenario/service.py`
  explicitly appends the outgoing player at 0 minutes
  (`final_scenario_rotation = scenario_allocation.entries + (RotationEntry(
  player_id=request.player_out_id, minutes=0.0),)`) but has no equivalent
  append for the incoming player — if their inherited minutes weight loses
  the allocator's rotation-size cap, they're simply absent from the list,
  with no zero-minute placeholder. Confirmed via a live `POST /scenarios`
  call this session (Adreian Payne out, A.J. Price in, on the 2014-15
  Hawks — Price's inherited weight was too low to make the cut). The
  frontend's rotation table doesn't need to special-case this: the
  `allocation_repairs` field already names the excluded player_id, and
  that text is already rendered directly under the table — see
  `docs/decisions/0008-...md`'s "UI-003 Implementation Notes." If you ever
  touch `backend/minutes/allocator.py` or the rotation-comparison
  frontend code, know that a rotation-comparison row simply won't exist
  for a cut player rather than showing a zero.
- **PCE is not implemented and not blocking anything.** Don't accidentally start
  building it without re-reading 0007 — it's an explicitly deferred future
  provider (`PceProvider`), not part of the current plan.
- **FastAPI's `TestClient` now requires `httpx2`, not `httpx`.** The pinned
  `starlette`/`fastapi` versions deprecated plain `httpx` for
  `starlette.testclient` in favor of a new `httpx2` package — using `httpx`
  still works but prints a `StarletteDeprecationWarning` on every test run.
  `pyproject.toml` pins `httpx2` in the dev group; don't add `httpx` back.
- **Player IDs are RAPTOR's own string IDs** (e.g. `"curryst01"`), not numeric
  NBA.com IDs — `docs/scenario-engine.md`'s original request/response examples
  used illustrative numeric IDs that predated the identifier scheme actually
  implemented; both have been corrected to match `backend/api/schemas.py`.
- **`pnpm` isn't on PATH by default in this environment.** `corepack enable`
  fails with `EPERM` writing into `C:\Program Files\nodejs\`. Fix used this
  session: `corepack enable --install-directory "$HOME/.local-bin"`, then
  `export PATH="$HOME/.local-bin:$PATH"` before any `pnpm` command in Bash
  (shell state doesn't persist between tool calls, so this must be repeated
  per command, or set once in a persistent shell profile).
- **pnpm's build-script sandbox blocks `sharp`/`unrs-resolver` by default**
  (`ERR_PNPM_IGNORED_BUILDS`). Fixed via `frontend/pnpm-workspace.yaml`'s
  `onlyBuiltDependencies`/`allowBuilds` (the old `package.json` `"pnpm"`
  field is no longer read by this pnpm version — don't resurrect it there).
- **`openapi-typescript`'s CLI breaks on this repo's path** (`ENOENT`
  resolving a path containing the space in "NBA Intelligence platform").
  `codegen/generate-api.mjs` uses its JS API (`openapiTS()` on the parsed
  object) instead — see the file's own comment. Don't switch it back to
  shelling out to the CLI.
- **`frontend/codegen/generate-api.test.ts` needs `uv`/Python on PATH** (it
  shells out to the real backend export). It's deliberately excluded from
  the default `pnpm test` — see `pnpm test:codegen` / `pnpm test:all`, and
  CLAUDE.md's Commands section.
- **This project's eslint config has two strict `react-hooks` rules that
  aren't widely known yet and will bite naive data-fetching-in-`useEffect`
  code:** `set-state-in-effect` forbids calling `setState` synchronously in
  an effect's *setup* body (only inside a resolved/rejected-promise
  callback, or inside the returned *cleanup* function, is allowed — verified
  empirically, both are fine); `refs` forbids reading `ref.current` during
  a hook/component's *render* body at all, even via an intermediate local
  variable, once that value flows into the render output (a monotonic
  counter stored in a `useRef` and read at render time — a natural way to
  solve the race below — is exactly what this rule blocks). See
  `frontend/src/lib/use-roster-lookups.ts`'s module comment for the full
  worked example and the actual fix (a closure-local `settled` flag +
  clearing state from the effect's cleanup function). If you add another
  data-fetching hook, read that comment first rather than rediscovering
  this the hard way. A second, simpler `set-state-in-effect` case showed up
  in `EditableScenarioMinutes.tsx` (step 6, decision 0009): resetting
  component-local state when a *prop* (not a fetch) changes. No async
  callback exists there to move the `setState` into, so the fix was
  different — React's own "adjusting state during render" pattern (compare
  a stored identity key against the current one and call `setState`
  directly in the render body, no `useEffect` at all). Prefer that pattern
  over `useEffect` for this shape of problem (reset-on-prop-change with no
  async step involved).
- **A hand-rolled "loading" flag keyed only by request *key* equality is
  wrong for a revisited key** — the frontend-architect review caught this
  as a real, non-hypothetical bug in `use-roster-lookups.ts` (select team
  A, select team B without waiting, select team A again before B resolves:
  key-equality alone reports "not loading" with team A's *stale* first
  result while a brand-new request for A is actually in flight). Fixed and
  regression-tested (`use-roster-lookups.test.ts`) — see the gotcha above
  for why the obvious ref-counter fix doesn't pass lint here.

## This session's detour: a Council deliberation on "what's next," and a git-history correction

The user asked the Council (five advisors, anonymized peer review, Chairman
synthesis — manually run via the Agent tool, since the `council` skill can't
be invoked programmatically) what the next development priority should be.
All five advisors independently converged on the same answer: the
uncommitted git history was the real blocker, ahead of any feature choice
(UI-005, editable minutes, deployment). Acting on that surfaced the false
"nothing has ever been committed" claim above (this file's own prior
wording) — real history and a real `origin/main` remote already existed.
Everything through UI-003 is now committed in five commits matching the
actual session boundaries as closely as reconstructable (`git log
--oneline` to see them) — four files that were edited across multiple UI
sessions (`ScenarioForm.tsx`, `ScenarioSuccessPreview.tsx`,
`ScenarioForm.module.css`, `ScenarioForm.test.tsx`) plus decision 0008 were
genuinely round-tripped through their real UI-002-end-state content (not
guessed — recovered from this session's own earlier tool-call history) before
being restored to final, so the two-stage history for those files is
accurate, not fabricated. The Council recommended confirming with the user what "portfolio piece"
concretely requires (a public deployed URL vs. a clean private repo)
before deciding between UI-005/step 6/step 8. **That question was asked
and answered later the same day: not deploying for now** — see "Portfolio
Roadmap" above, which is the current, binding answer.

## Exact next task

**Step 7 (team-profile interpretation) is done** (2026-07-24, decision
0010 — see that file for the full design rationale, including the
data-availability finding that reshaped its scope). `ContributionProvider`
gained `get_player_profile()` returning `PlayerImpactProfile(offensive_impact,
defensive_impact)`; `RosterScenarioResult`/`ScenarioResponse` gained
`team_profile: tuple[TeamProfileCategory, ...]`, minutes-weighted the same
way contribution is, always `EpistemicType.DESCRIPTIVE_INTERPRETATION`,
never touching `contribution_change` (locked in by a regression test). New
`TeamProfilePanel.tsx`. Backend 139 tests (was 121).

**A full `/impeccable critique` design review then ran** (dual-agent: an
isolated LLM design-review sub-agent plus an isolated detector/browser-
evidence sub-agent, both against the live app) — scored 30/40 (Good). Full
report: `.impeccable/critique/2026-07-24T00-56-10Z__frontend-src-app-page-tsx.md`.
The user asked for every finding fixed, priority-first. All done:
- **A real P1 bug** (design-review evidence, not theoretical): rapid
  successive field selections (e.g. team then immediately provider) could
  silently drop the earlier one from the URL. Root cause:
  `use-scenario-selection.ts`'s `updateSelection`/`commitSelection` computed
  the next URL from the React-derived `selection` value, which lags behind
  reality — `router.replace()`/`push()` update `window.location`
  synchronously, but React's re-render (and thus a fresh `selection`) lands
  asynchronously, so two calls fired before that re-render both read the
  same stale closure. Fixed by reading `window.location.search` directly
  instead. **Verified as a real regression, not a guess**: reverted the fix
  and confirmed the new test (`frontend/src/lib/use-scenario-selection.test.ts`)
  fails against the original code, then restored it and confirmed it
  passes. A same-shaped test added directly to `ScenarioForm.test.tsx`
  (using `fireEvent` between two selects) did *not* reproduce the bug —
  Testing Library's `fireEvent` is individually `act()`-wrapped and
  synchronously flushes between calls, unlike a real browser; the
  discriminating test had to batch two hook calls inside one manual `act()`
  block instead. If you need to test a similar React/router race again,
  start with that pattern, not a component-level `fireEvent` sequence.
- **P1**: the rotation table rendered twice (read-only + a separate
  editable one) — folded into one; `EditableScenarioMinutes.tsx` now owns
  the only `RotationComparisonTable` and toggles its Scenario column into
  inputs via a new "Edit scenario minutes" button rather than rendering a
  second table.
- **P1**: the editable draft was seeded at full float precision while the
  read-only view showed rounded values — draft now seeds at the same
  `.toFixed(1)` precision.
- **P2s**: minutes inputs widened (were clipping digits); a shown result is
  now visually + textually marked stale the moment the form selection
  diverges from what produced it (`ScenarioForm.tsx`'s `resultStale`); team
  select now shows full franchise names (`frontend/src/lib/nba-teams.ts`,
  a small static 2014-15-season lookup — presentational only, no
  data-rules/licensing implication); the 478-player "Player to add" list is
  now grouped by first letter via native `<optgroup>` (`ScenarioField.tsx`
  gained optional `group` support) — chunking, not a new combobox/search
  component, per decision 0008's native-controls-only rule.
- **Minor**: the disabled-looking Season `<select>` (which could never have
  a second option) replaced with static text; a "Start over" action added
  (clears all fields + any shown result, leaves season alone); the
  "Heuristic scenario profile..." label deduplicated from 3 occurrences to
  2 (removed from `ScenarioDisclosuresPanel.tsx`, kept on
  `ExplanationFactorsList`/`TeamProfilePanel` where it's most load-bearing).
- **Explicitly not fixed** (flagged as false positives during synthesis,
  not silently dropped): the detector's `overused-font`/`single-font`
  findings — Operate mode's own guidance says one type family is correct
  here, not a defect; don't "fix" this by adding a second typeface.

Frontend: 110 tests (was 103, then 105 after step 7 — net +5 across both
pieces of work today). All four quality gates (backend ruff/mypy/pytest,
frontend typecheck/lint/test/build) clean as of this write-up.

Also note: `npx impeccable update` ran this session (user-approved),
upgrading the installed skill from v3.9.1 to v4.0.2 — it applied
**immediately**, not "next session" as its own prompt claimed, which
briefly desynced the in-context skill instructions (v3.9.1, already loaded)
from the on-disk files (v4.0.2) mid-task. Re-read the actual on-disk
`SKILL.md` if this happens again rather than trusting a stale in-context
copy. `.claude/skills/impeccable/` shows as modified/added/deleted in `git
status` because of this update — decide whether to commit it alongside or
separately from the feature work; it's tooling, not product code.

**UI-005 remains done** (2026-07-22, see `HANDOFF-roster-lab-issues.md`'s
UI-005 entry). One item from that pass is still deliberately **deferred,
not fixed** — and is now more relevant, not less, since this session added
*more* inline logic to the same file: `ScenarioForm.tsx`'s validation/
derivation logic (now also including `hasAnythingToClear`, `handleStartOver`,
`resultStale`) should move to a pure module
(`deriveScenarioFormState()`), matching the `url-state.ts` pattern.
Behavior is correct and tested throughout, so still not urgent on its own,
but the file keeps growing — worth doing deliberately next time it's
touched rather than deferring again. `/review`/`/code-review` are still
not usable (no PR; `code-review` still not in the skill listing).

With steps 1-7 of CLAUDE.md's "Development Priority" list complete, **the
next item is step 8: supporting player and team pages; public historical
deployment** (per CLAUDE.md's list) — though the "Portfolio Roadmap" below
still governs deployment specifically: **not deploying for now**, so treat
step 8 as "supporting player/team pages" only until the user raises
deployment again.

**Step 8's backend half is now done** (2 new read-only detail routes — see
"What's actually built" above for the exact contracts). Frontend
consumption is the remaining piece of step 8 (a parallel session/branch
appears to already be building `PlayerDetailView.tsx`/`TeamDetailView.tsx`
against this — reconcile against the exact response shapes documented
above, not assumed ones, before treating that work as done).

**Dev servers may still be running** from this session's design-review
evidence-gathering (`uv run uvicorn backend.api.app:app --port 8000` +
`pnpm dev` in `frontend/`, both started in the background) — check before
assuming a clean slate, and stop them if you don't need them.

**Run `git status` before trusting any file list in this document** — it
reflects state as of 2026-07-24 but may have drifted.

**Known follow-up, not yet scheduled:** fix `commitSelection()`'s
`router.push()` never actually creating a back-navigable history entry
(confirmed via real browser testing this session — see ADR 0008's "Local
Run and Deployment-Config Readiness" section for the full root cause).
Needs a deliberate design decision (how to distinguish "committed" from
"editing" state in the URL without inventing a new query param), not a
quick patch — scope it properly rather than hacking around it under time
pressure next time it's picked up.

Read `docs/decisions/0008-roster-lab-frontend-architecture.md`'s "UI-001
Implementation Clarifications," "UI-002 Implementation Notes," and "UI-003
Implementation Notes" sections first for exact constraints already in
force (eslint's `react-hooks` rules, the transport-isolation rule, the
reshape-only view-model boundary, and UI-003's own display-arithmetic and
attribution-footer reasoning).

**Tooling still pending the user's own interactive session (not run by this
agent, no tool available for either):** `/impeccable init` (needed before
`/impeccable critique`/`audit`/`polish` are useful — the detector-only pass
already run this session is a partial substitute, not equivalent), and the
`skill-creator`/`github` Claude Code marketplace plugin installs. `gh` CLI
is still not installed — `HANDOFF-roster-lab-issues.md` remains a manual
staging draft, not real GitHub issues.

## Commands to re-verify state after resuming

```bash
uv run ruff check .
uv run mypy
uv run pytest -q
```

All three should pass clean (**149 tests**, up from 98 — step 6's
`apply_manual_minutes`/`manual_minutes` tests, step 7's
`get_player_profile`/`team_profile` tests, and step 8's backend detail-route
tests, across `tests/test_minutes_allocator.py`,
`tests/test_contribution_providers.py`, `tests/test_historical_loader.py`,
`tests/test_scenario_service.py`, `tests/test_api_scenarios.py`, and
`tests/test_api_lookups.py`). If they don't, something changed since this
file was last updated — trust the code over this document.

```bash
cd frontend
pnpm typecheck
pnpm lint
pnpm test        # hermetic, 110 tests, no uv/Python required
pnpm build
```

All four should pass clean. `pnpm test:codegen` (3 more tests, 113 total)
additionally requires `uv`/Python on PATH — see the pnpm-on-PATH gotcha
above if `pnpm` itself isn't found. `pnpm run check:api-fresh` should also
report the generated API contract as up to date (it's regenerated as part
of step 7's `team_profile` field — see decision 0010).

**Real browser smoke test done this session** (superseding UI-003's
curl-only verification): `uv run uvicorn backend.api.app:app --port 8000`
+ `pnpm dev` in `frontend/`, driven by Playwright's Node API against
Microsoft Edge (already installed on this machine, `channel: "msedge"`,
used ad-hoc via a temporary `npm install playwright-core` in the scratchpad
directory — **not** added to `frontend/package.json`/`pnpm-lock.yaml`, no
project dependency changed). No `chromium-cli` was available. See "Local
run verification" above for the full findings; the root README's "Local
Development" section has the exact commands to repeat this by hand in a
real browser without any automation tooling.

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
