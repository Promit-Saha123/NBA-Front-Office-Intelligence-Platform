# Roster Lab frontend — implementation issue draft

Drafted from the Council review and `docs/decisions/0008-roster-lab-frontend-architecture.md`.
`gh` CLI isn't installed in this environment; paste these into GitHub manually
(or ask to have `gh` installed and this re-run through `gh issue create`).
Delete this file once the issues exist in GitHub — it's a staging draft, not
a tracked project doc.

---

## UI-001: Establish Next.js application shell and typed API client — DONE (2026-07-21)

Built: Next.js app shell (`frontend/src/app/`), a deterministic OpenAPI
codegen workflow (`frontend/codegen/generate-api.mjs`,
`backend/api/openapi_export.py`), an ajv-runtime-validated API client
(`frontend/src/lib/api/`), a reshape-only view-model
(`frontend/src/lib/view-model.ts`), and URL-state utilities
(`frontend/src/lib/url-state.ts` + `use-scenario-selection.ts`). CORS added
to `backend/api/app.py` (browser calls FastAPI directly, no proxy). Reviewed
via the `architecture-review` skill and the `frontend-architect` subagent
(5 findings, all fixed). 44 hermetic tests (`pnpm test`) + 3 codegen-freshness
tests (`pnpm test:codegen`, needs `uv`). Full detail:
`docs/decisions/0008-roster-lab-frontend-architecture.md`'s "UI-001
Implementation Clarifications" and "Review findings applied" sections.

## UI-002: Build scenario input workflow — DONE (2026-07-21)

Built: `ScenarioForm.tsx` + `ScenarioField`/`ScenarioStatus`/
`ScenarioSuccessPreview` components, three new backend read-only lookup GET
routes (`backend/api/lookups.py`) the form needed for real team/player data,
`frontend/src/lib/api/http.ts` (shared fetch/error-normalization core,
extracted from `scenarios.ts` once `lookups.ts` needed the same behavior),
`frontend/src/lib/use-roster-lookups.ts` (3 data hooks), `AbortController`-
based stale-response handling, and selection-prevention filtering (player-in
excludes the current roster, which structurally also prevents the same-
player-swap case). Reviewed via `architecture-review` skill (1 finding,
fixed) and the `frontend-architect` subagent (7 findings, all fixed —
including a real stale-request race in the lookup hooks and a missing
success announcement for assistive tech). Component-testing infra
(`jsdom`, `@testing-library/react`/`user-event`/`jest-dom`) added and used —
87 hermetic tests total (`pnpm test`) + 3 codegen-freshness tests. Full
detail: `docs/decisions/0008-roster-lab-frontend-architecture.md`'s "UI-002
Implementation Notes" and "Review findings applied" sections.

No final results/disclosures experience yet — `ScenarioSuccessPreview` is
deliberately temporary/minimal (team/season/players/provider/contribution +
attribution only). That's UI-003 below.

## UI-003: Render scenario results and disclosures — DONE (2026-07-21)

Built: `RotationComparisonTable.tsx` (before/after per-player minutes,
outgoing tagged "Removed" + a light accent tint, incoming tagged "Added" —
text label carries the meaning, not color alone; a display-only sum of
already-fetched minutes drives a visible 240-minute total row per side),
`ExplanationFactorsList.tsx` (every factor traced straight to the
response's `metric`/`baseline_value`/`scenario_value`/`direction`, no
generated narrative), `ScenarioDisclosuresPanel.tsx` (the full decision
0007 §8 set: historical-prototype banner, RAPTOR/synthetic provider badge
keyed off `provider_type`, provider/data version, contribution epistemic
type, minutes method + assumptions, the required attribution footer
verbatim *plus* the response's own provider-specific citation, the
methodology/data-coverage/not-a-prediction disclaimers, and an explicit
"Not applicable — this MVP ships no trained model" state for `model_version`
— never hidden). `ScenarioSuccessPreview.tsx` now composes all three under
one `<h2>`/`<h3>` heading hierarchy; `frontend/src/lib/format.ts` holds one
shared `humanizeSnakeCase()` display helper (kept out of `view-model.ts`,
which stays reshape-only per decision 0008).

Reviewed via the `architecture-review` skill (self-checked, clean) and the
`frontend-architect` subagent (8 findings — 6 fixed: the attribution
footer was rendering only the provider's own citation instead of decision
0007 §8's required static footer text; heading hierarchy skipped `<h1>` →
`<h3>` with no `<h2>`; the disclosures panel had no heading/landmark unlike
its sibling sections; `ExplanationFactorsList` imported its type from
`@/lib/api/scenarios` instead of the view-model's own alias for
consistency; three purely-presentational components had an unnecessary
`"use client"`; the provider badge was styled as plain muted text instead
of the `badge` class already used for the historical banner. 2 left
as documented judgment calls: a `Map` rebuild on every render for player-
name lookup — a `useMemo` was tried and reverted, since it just moved the
unstable-dependency warning up a level per eslint's `exhaustive-deps` rule,
for no real cost at this season's roster scale; and the rotation total
isn't visually flagged if it were ever to *not* equal 240 — noted as an
observation, not required now). Impeccable's deterministic hook caught and
fixed one real AI-tell (a `border-left` accent-stripe "side-tab" pattern on
the incoming-player row — removed; the text label + tint alone now carry
the distinction).

A live backend+frontend integration boot (no browser-automation tooling —
`chromium-cli`/Playwright — is installed in this environment, and standing
one up now would contradict decision 0008's explicit Playwright deferral)
surfaced a real, not hypothetical, edge case: when the incoming player's
inherited minutes weight is too low for the rotation-size cap, the backend
omits them from `scenario_rotation` entirely — no zero-minute placeholder,
unlike the outgoing player who always gets one. The existing
`allocation_repairs` text (already rendered under the table) already
explains this correctly with no code change needed; added a regression
test (`ScenarioForm.test.tsx`) locking in that behavior using the real
response shape captured from that live call.

97 hermetic tests total (`pnpm test`, up from 87) + 3 codegen-freshness
tests. `pnpm typecheck`/`lint`/`build` all clean; backend untouched (90
tests, ruff, mypy all still clean — this slice needed no backend change).

## UI-004: Add frontend component tests

**Done as part of UI-002 and UI-003.** `jsdom` +
`@testing-library/react`/`user-event`/`jest-dom` are installed and used;
`ScenarioForm.test.tsx` covers initial URL state, dependent-field cleanup,
selection-prevention, submission, every error category, accessibility, and
(as of UI-003) the rotation comparison table, explanation factors, the
full disclosures panel (including both provider-badge variants and the
model_version not-applicable state), and the rotation-size-cap edge case
above. No further test-infra work identified — treat this as closed unless
a future slice finds a real gap.

**Acceptance:** `pnpm test` covers every item in this repo's testing
skill/CLAUDE.md testing expectations relevant to the frontend; no test
requires a running FastAPI process.

## Local Run and Deployment-Config Hardening — DONE (2026-07-21)

Not a numbered UI-00X slice (no new feature) — a pass making the existing
app easy to run and inspect locally, and confirming the local-to-public
deployment transition really is an env-var change, not a code change.

Verified already correct (not rebuilt): `NEXT_PUBLIC_API_URL`
(`frontend/src/lib/api/http.ts`) and `FRONTEND_ORIGINS`
(`backend/api/app.py`) were already the single, centralized configuration
points decision 0008 called for, with `CLIENT_CONFIGURATION_ERROR`
handling, test injection via `vitest.config.ts`, and a safe dev-default
CORS origin list already in place from UI-001. Added the one real gap:
`tests/test_api_cors.py` (8 tests — origin parsing, whitespace/empty-entry
handling, a real preflight against an allowed vs. disallowed origin,
credentials-disabled confirmation).

Ran the full app locally and drove it with a real browser (Playwright
against the already-installed Microsoft Edge, ad-hoc, not a project
dependency — see `HANDOFF.md`'s gotcha) across all 15 items of the local
smoke-test checklist. 14 confirmed working with real 2014-15 data, both
providers, real CORS, and real backend error responses. 1 (browser back/
forward between submitted scenarios) confirmed broken as designed —
documented in ADR 0008's new "Local Run and Deployment-Config Readiness"
section, not fixed (needs a deliberate design decision, out of scope for
this pass).

Found and fixed 4 real issues via before/after screenshots: raw Python
list syntax leaking into the allocation-repairs disclosure text; a
duplicate "team not found" error shown with inconsistent wording on two
fields; no visual affordance for the rotation table's mandatory mobile
horizontal scroll; and a missing favicon causing a console error on every
page load. Full detail in `HANDOFF.md`'s "Local run verification" section
and ADR 0008.

Updated `README.md` with a full "Local Development" section (runtime
versions, install steps, start commands, localhost URLs, required env
vars, connectivity verification, common setup failures, quality-check
commands) and a "CORS and future deployment" section documenting the
local→public env-var transition. Trimmed `frontend/README.md`'s default
`create-next-app` boilerplate to a short pointer at the root README.

**Explicitly not done, per this task's scope:** no deployment, no Vercel
project, no backend hosting selection, no push to `origin/main`, no
`vercel.json`, no Docker (none was needed — nothing here required a
container). See `HANDOFF.md`'s "Portfolio Roadmap" for the recorded
decision on sequencing actual deployment.

## UI-005: Run accessibility, design, architecture, and security reviews — DONE (2026-07-22)

Ran three of the four planned reviews (the fourth, `/impeccable`, needs an
interactive `/impeccable init` only the user can run — still not done, see
below):

- **`architecture-review` skill** — self-checked the backend/API boundary
  and the session's uncommitted diff. Clean: domain layer has zero FastAPI/
  Pydantic imports, startup resources (`HistoricalSeasonData`, both
  providers) still constructed once in `lifespan()`, routes stay thin with
  error-mapping centralized in `backend/api/errors.py`, every provenance
  field (`provider_type`/`provider_version`/`data_version`/
  `contribution_epistemic_type`/`minutes_method`/`minutes_assumptions`/
  `attribution`/`model_version`) still passed through unconditionally
  (`model_version=None` included, never hidden). No findings.
- **`frontend-architect` subagent** — full composition-level pass across
  the whole `frontend/src/` tree (not just the newest slice), since UI-001
  through UI-003 were each reviewed individually but never together. 4
  findings + 1 judgment call, all minor (no fresh structural violations —
  consistent with three prior clean review passes):
  1. `ScenarioSuccessPreview.tsx` still had `"use client"` even though the
     UI-003 review removed it from its three sibling components for the
     same reason (no hooks/state/refs/browser APIs) — **fixed**, line
     deleted.
  2. `RotationComparisonTable.tsx` referenced a `styles.rowIncoming` CSS
     class that doesn't exist (CSS Modules silently resolves it to
     `undefined` — no build error, and harmless today since the incoming
     row's "Added" text label already carries the distinction per decision
     0008's UI-003 AI-tell fix) — **fixed**: replaced with `undefined` plus
     a comment explaining the asymmetry is deliberate, so a future
     contributor doesn't "fix" it by re-adding a tinted row.
  3. `ScenarioStatus.tsx`'s success state was visually identical to its
     loading state (same CSS classes) — a sighted user couldn't tell
     "still calculating" from "just finished" without reading the text —
     **fixed**: added a `.statusSuccess` class using only existing neutral
     tokens (surface background + full-contrast text, no new color
     introduced — the design's one accent color was already claimed by the
     error state).
  4. `ScenarioForm.tsx`'s validation/derivation logic (~60 lines:
     `teamNotFoundInvalid`, `samePlayerInvalid`,
     `playerInAlreadyOnRosterInvalid`, `playerOutNotOnRosterInvalid`,
     `submitDisabled`, etc.) has grown inline in the component across three
     sessions, unlike `url-state.ts`'s established pure-module pattern —
     **deferred, not fixed**: behavior is correct and already covered by
     `ScenarioForm.test.tsx`, so this is a structural cleanup, not a bug;
     extracting a `deriveScenarioFormState()` pure function is the
     suggested shape if/when this file grows further. Scope this properly
     next time it's touched rather than folding an unrequested refactor
     into a review pass.
  - Judgment call, not a defect: `ScenarioForm.tsx`'s `PROVIDER_LABELS` and
    `ScenarioDisclosuresPanel.tsx`'s `PROVIDER_BADGE_TEXT` are two
    independently-typed label maps keyed to two genuinely different
    backend enums (`ContributionProviderChoice` vs. `ProviderType`) — not
    a bug, just non-obvious. Added a one-line comment on `PROVIDER_LABELS`
    naming this so a future maintainer doesn't try to unify them.
- **`/security-review` skill** — scanned everything not yet on
  `origin/main` (5 local commits) plus the working-tree diff. **No findings
  at confidence ≥ 7.** CORS is a correct allowlist (env-configured origins,
  no wildcard, credentials never enabled, explicit GET/POST + Content-Type
  only); no injection sinks (`eval`, `subprocess`, `dangerouslySetInnerHTML`)
  anywhere in the new surface; no path traversal (lookups are in-memory
  dict/set operations, no filesystem paths built from request input); no
  hardcoded secrets; no stack-trace/debug leakage (`DomainError` mapping
  returns only a stable code/message, no `debug=True`); the frontend
  validates every response against the generated OpenAPI schema before use.
- **`/impeccable`** — still not run. `init` is interactive and needs the
  user to run it directly; only the deterministic detector (auto-runs on
  every edit via the PostToolUse hook) has checked this session's edits, no
  design-quality issues flagged. `critique`/`audit`/`polish` remain pending
  the user's own session.
- **`/review`** and **`/code-review`** — still not usable: no GitHub PR
  exists for `/review` (which is PR-scoped by design), and `code-review`
  still isn't in this session's available-skills listing, same as every
  prior session.

All three fixes verified: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
(97 tests) and `uv run ruff check . && uv run mypy && uv run pytest -q`
(98 tests) all clean after the changes.

**Acceptance:** three of four reviews run (the fourth needs the user's
interactive `/impeccable init`); findings fixed or explicitly recorded as
deferrals — none silently dropped.
