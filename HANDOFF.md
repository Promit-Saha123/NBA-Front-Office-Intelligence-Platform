# Handoff

**Purpose of this file:** load this at the start of a new session (after clearing
conversation / starting fresh) to get back up to speed without re-reading the full
history. Update it at the end of each work session — see "Keeping this file
current" at the bottom.

**Last updated:** 2026-07-23

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
rationale. No database, no trained model exist.

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
5. `docs/architecture/README.md` — maps the `backend/` code to the specs
6. This file, for "what's next"

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
| [0009](docs/decisions/0009-editable-scenario-minutes.md) | Editable scenario minutes: full-rotation `manual_minutes` override, strictly validated, baseline read-only | **Accepted, current** |

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

**Step 6 (editable minutes and sensitivity analysis) is done** (2026-07-23,
decision 0009 — see that file for the full design rationale). Built via an
`EnterPlanMode` plan approved by the user before implementation:
`POST /scenarios` gained an optional `manual_minutes: dict[str, float]`
request field — a *complete* assignment over the post-swap scenario roster
(baseline stays permanently read-only), validated by a new pure
`apply_manual_minutes()` in `backend/minutes/allocator.py` (exact key-set
match, no negatives, no value over the 40-minute cap, sum must equal
exactly 240 within the existing float tolerance — no partial maps, no
silent rebalance, per scenario-engine.md §15). A new
`InvalidManualMinutesError`/`INVALID_MANUAL_MINUTES` (422) is deliberately
distinct from `InvalidRotationError` so the frontend can route it to inline
table validation instead of a generic error banner. `minutes_assumptions`
gained `"scenario_source": "heuristic" | "manual"`; `"editable"` flipped
permanently to `true` (a capability flag, not a per-response fact). New
frontend component `EditableScenarioMinutes.tsx` (composed into
`ScenarioSuccessPreview.tsx`) lets a user edit the scenario rotation table,
gates Recalculate on an exact-240 total (no auto-correct), Resets without a
new request, and shows the default and edited results side by side. Backend
121 tests (was 98), frontend 103 tests (was 97) — both quality gates clean.

One non-obvious fix needed during this slice, worth remembering: reseeding
the editable draft when a new default result arrives was originally written
as a `useEffect` that calls `setDraft`/`setEdited` synchronously in its
body — this project's `react-hooks/set-state-in-effect` eslint rule (see
the gotcha below) rejects that. The fix was React's own recommended
"adjusting state during render" pattern (compare a stored `scenarioKey`
against the current one and call `setState` directly in the render body,
no `useEffect` at all) — see `EditableScenarioMinutes.tsx`'s own comment.
If a future component needs to reset local state when a prop changes, use
this pattern before reaching for `useEffect`.

**UI-005 is done** (2026-07-22, see `HANDOFF-roster-lab-issues.md`'s UI-005
entry for the full account) — carried over from the prior session, still
current. One item from that pass remains deliberately **deferred, not
fixed**: `ScenarioForm.tsx`'s ~60 lines of inline validation/derivation
logic should eventually move to a pure module (`deriveScenarioFormState()`),
matching the `url-state.ts` pattern — behavior is correct and tested today,
not urgent on its own. `/impeccable init` is still pending — it's
interactive and only the user can run it; ask them to, then follow with
`critique`/`audit`/`polish`. `/review`/`/code-review` are still not usable
(no PR; `code-review` still not in the skill listing).

With steps 1-6 of CLAUDE.md's "Development Priority" list complete, **the
next item is step 7: team-profile interpretation** (descriptive
interpretation of a team's calculated scenario differences — see CLAUDE.md's
"Product Claims" for the label distinctions to preserve: model prediction /
heuristic assumption / deterministic calculation / descriptive
interpretation). Read `docs/project-specification.md` and whatever section
of `docs/scenario-engine.md` covers team-profile output before starting;
none of this is designed yet, so expect another `EnterPlanMode` pass before
writing code, same as step 6.

**The Council's open question is resolved — see "Portfolio Roadmap" above:
not deploying for now.** Don't re-raise it or start deployment/hosting work
on your own initiative; stay focused on local development (step 7 and
beyond) until the user brings deployment up again.

**Run `git status` before trusting any file list in this document** — it
reflects state as of 2026-07-23 but may have drifted.

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

All three should pass clean (**121 tests**, up from 98 — step 6's
`apply_manual_minutes`/`manual_minutes` tests added across
`tests/test_minutes_allocator.py`, `tests/test_scenario_service.py`, and
`tests/test_api_scenarios.py`). If they don't, something changed since this
file was last updated — trust the code over this document.

```bash
cd frontend
pnpm typecheck
pnpm lint
pnpm test        # hermetic, 103 tests, no uv/Python required
pnpm build
```

All four should pass clean. `pnpm test:codegen` (3 more tests, 106 total)
additionally requires `uv`/Python on PATH — see the pnpm-on-PATH gotcha
above if `pnpm` itself isn't found. `pnpm run check:api-fresh` should also
report the generated API contract as up to date (it's regenerated as part
of step 6's `manual_minutes` field — see decision 0009).

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
