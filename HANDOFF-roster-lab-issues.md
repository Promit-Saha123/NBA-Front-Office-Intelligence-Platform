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

## UI-005: Run accessibility, design, architecture, and security reviews

Run `/review` on the completed slice (note: `/review` is scoped to GitHub
PRs per its own description; if there's still no open PR, use whatever the
working-diff equivalent is at that time — it wasn't in the available-skills
listing as of UI-001 or UI-002). Run the `frontend-architect` subagent
review (used successfully for both UI-001 and UI-002 — found real bugs
both times, including a stale-request race in UI-002; keep using it). Run
`/impeccable init` first (interactive — the user must run this; both UI-001
and UI-002 only had the deterministic detector + manual contrast checks
available, not the full LLM critique/audit flow), then
`/impeccable critique`, `/impeccable audit`, and `/impeccable polish`
against the visual direction in decision 0008 and the project's stated
design references (CraftedNBA, Dunks & Threes). Run `/security-review` (no
auth/persistence/uploads exist yet, but this is the first network boundary
exposed to a browser — now with 4 live endpoints, not 1). Fix findings or
explicitly label deferrals. Update `HANDOFF.md`.

**Acceptance:** all four reviews run; findings are either fixed or recorded
as explicit, labeled deferrals — none silently dropped.
