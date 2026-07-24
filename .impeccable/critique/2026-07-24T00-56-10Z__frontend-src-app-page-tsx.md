---
target: Roster Lab (frontend/src/app/page.tsx)
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-07-24T00-56-10Z
slug: frontend-src-app-page-tsx
---
Method: dual-agent (A: ace6269fa047c982f · B: aa78ba09d3ae90098)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading/busy/success states are thorough; the "Edited result" panel appends far below the fold with no scroll-into-view, and a stale prior result stays on screen unmarked if fields change post-submit without resubmitting. |
| 2 | Match System / Real World | 3 | Domain language is precise but assumes NBA-analytics literacy ("RAPTOR," "epistemic type") with no inline explainer next to the forced provider choice. |
| 3 | User Control and Freedom | 3 | Fields stay editable after a result, URL state supports back/forward, "Reset to default" exists — but no "clear/start over" affordance, no in-flight cancel. |
| 4 | Consistency and Standards | 4 | Single, well-documented component vocabulary used consistently everywhere. |
| 5 | Error Prevention | 4 | Client-side filtering, exact-240 gate, no default provider forces intent, server remains final authority. |
| 6 | Recognition Rather Than Recall | 3 | Team select shows abbreviations only ("GSW") with no full name; 478-entry player list has no grouping/filter. |
| 7 | Flexibility and Efficiency of Use | 1 | URL-as-state is a real accelerator, but no keyboard shortcuts, no saved scenarios, no multi-swap comparison. |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained, one-accent-color discipline; docked for the near-duplicate rotation table (read-only + editable back to back). |
| 9 | Error Recovery | 4 | Plain-language, field-adjacent errors; `role="alert"` with programmatic focus; never raw status codes. |
| 10 | Help and Documentation | 2 | No dedicated help surface, but inline field help + disclosures function as a lightweight always-available reference. |
| **Total** | | **30/40** | **Good** |

## Design Specificity Verdict

**LLM assessment (A):** The *copy* is unmistakably authored for this product — "Player to remove/add," "Historical RAPTOR benchmark" vs. "Synthetic estimate (demo values)," the exact provider/version/attribution language. The *visual language* is category-interchangeable (one accent, Inter, white cards, `border-radius: 10px`, plain tables) — largely the right call for Operate mode, but the product's actual differentiator (a before/after minutes reallocation) is rendered as a bare number table with no visual encoding of magnitude.

**Deterministic scan (B):** `detect.mjs --json frontend/src` (34 scannable files, full Roster Lab surface) returned **exit 0, zero findings** — a genuine clean pass on static source. The **live, populated-result page** told a different story: the browser-injected detector logged 10–11 anti-pattern instances (a self-count/instance-count mismatch in the tool's own output, noted for accuracy) — 9 `line-length` findings (~92–165 chars/line against an "aim for <80" guideline) on the rotation-adjustments note, the edit-minutes help text, both disclosure badges, three assumptions-panel paragraphs, and the attribution line (which appears twice on the page), plus one `overused-font` and one `single-font` finding (Inter, 100% of text).

**Where the two assessments and the detector agree, disagree, and complement each other:**
- The static scan finding nothing is not a contradiction — it's a real methodological gap the browser step closed: line length depends on actual rendered text against a real viewport, which only exists once real data is in the DOM. This is exactly why critique.md requires the browser step, not just the CLI scan, for a viewable target.
- The 9 line-length findings are a legitimate, actionable echo of this project's own stated rule (CLAUDE.md/operate.md: cap prose at 65–75ch) — worth a pass, not a false positive.
- The two font findings (`overused-font`, `single-font`) are **false positives for this surface**: `operate.md`'s own guidance states "One family is often right. Product UIs don't need display/body pairing" — a single, well-tuned sans carrying headings/labels/body is the *correct* choice for Operate mode, not a defect. The generic detector ruleset doesn't know the mode; a human reviewer should discount these two.
- Neither assessment found anything resembling the absolute-ban list (no gradient text, no side-stripe borders, no glassmorphism, no eyebrow scaffolding) — confirmed clean on that front by both.

## Overall Impression

The product is honest and well-instrumented where it counts — error handling, disclosures, and traceable explanations are unusually careful for an MVP — but the single highest-value screen (the scenario result) is heavier than it needs to be: a near-duplicate rotation table, a provider choice explained only after the user has already committed to it, and (new since the last review pass) a genuine state-sync concern in the selection flow. The biggest opportunity is trimming and clarifying that one screen, not adding anything new to it.

## What's Working

1. **Error prevention and honesty discipline** — forced explicit provider choice, plain-language field-adjacent errors, live-diff validation on the exact-240 minutes gate, a screen-reader status region that moves focus to errors on failure.
2. **Traceable explanations** — every "What changed" factor (and now every "Team profile" category) is a real baseline/scenario/direction/delta pulled straight from the response, with no fabricated narrative.
3. **Restrained, consistent component vocabulary** — one accent color reserved for primary actions/status/badges, one typeface (correctly, per Operate mode), native form controls throughout.

## Priority Issues

**[P1] A rapid sequence of field selections can desync the URL from what's actually selected.**
Why it matters: Assessment B's scripted interaction (team → player-out → player-in → provider, fired back-to-back with no artificial delay) showed the URL/state can drop an earlier field's selection when a later field's change fires before the prior `router.replace()` settles — in one isolated run, `player_out_id`/`player_in_id` never made it into the URL even 1.5s later while `contribution_provider` (selected last) landed correctly; in the main run, the inverse happened. This is a stale-closure-shaped race between rapid successive native-`<select>` changes and the async URL-replace sync in `use-scenario-selection.ts`/`url-state.ts`. **Confidence note:** this was observed via an ad-hoc diagnostic script, not a formalized, human-driven repro — real, but worth a deliberate reproduction pass before fixing, not a blind patch. It's also the same general family as the already-known `commitSelection()` push/replace history bug in `HANDOFF.md` — both point at the URL-state sync layer as the place to look next.
Fix: reproduce deliberately (fast keyboard-driven field changes, not just scripted), then likely needs the same kind of fix as the existing stale-request handling already used for API calls (sequencing/aborting superseded `router.replace()` calls).
Suggested command: `/impeccable harden`

**[P1] The rotation table is rendered twice, almost identically, back to back.**
Why it matters: the read-only "Rotation comparison" table and the "Edit scenario minutes" table show the same rows and columns in immediate succession, roughly doubling the scroll length of the single highest-value screen for no new information.
Fix: fold editing into the one table (toggle the Scenario column into inputs) instead of a second full table beneath it.
Suggested command: `/impeccable distill`

**[P1] The editable draft is pre-seeded with unrounded precision that visibly contradicts the rounded value shown one section above.**
Why it matters: the read-only table shows "34.7," the input directly below shows "34.668" for the same player/column — reads as a bug and undermines the "deterministic, inspectable" story the disclosures panel is built to support.
Fix: seed the draft at the same display precision (`toFixed(1)`) as the read-only table, or label the field as full-precision if that precision must be preserved.
Suggested command: `/impeccable harden`

**[P2] Changing a form field after a result is shown doesn't mark the displayed result as stale.**
Why it matters: `submission` state is only ever set by `handleSubmit`; nothing clears or flags it when `selection` changes afterward, so a tweaked field above and an unrelated old result below can silently disagree.
Fix: visually mark the result panel as stale the moment `selection` diverges from the values it was computed from.
Suggested command: `/impeccable harden`

**[P2] Minutes input boxes are too narrow for their own values and visibly clip digits.**
Why it matters: `.minutesInput` is fixed at `5rem` (80px); values like "19.4771" render with a sliced trailing character on both desktop and mobile.
Fix: widen the input (resolving alongside the precision fix above would also shorten the values enough to fit).
Suggested command: `/impeccable polish`

**[P2] Team and player selection offer no recognition aid at the scale this product actually needs.**
Why it matters: the team field shows only 3-letter codes with no full name; "Player to add" is a single flat alphabetical list of 478 names with no grouping or filtering — the second real decision in the core loop, not an edge case.
Fix: show the full team name alongside the code; consider grouping or type-ahead filtering for the player list.
Suggested command: `/impeccable clarify`

**[P3] Two informational detector findings are false positives for this mode.**
Why it matters: `overused-font`/`single-font` flag Inter-only typography — correct for Operate mode per this project's own design guidance, not a defect.
Fix: none needed; noted so it isn't "fixed" into a worse state (adding a second typeface for its own sake).
Suggested command: none

## Persona Red Flags

**Jordan (First-Timer):** The "Contribution provider" dropdown is the first consequential decision, and it's a forced choice with no default — but the only explanation of "Historical RAPTOR benchmark" vs. "Synthetic estimate" lives in the disclosures panel that appears *after* submission. Jordan chooses blind. Compounded by team codes with no full name and raw numeric deltas with no "what is this" affordance. Likely abandonment point: the provider dropdown, or misreading a contribution delta as a literal stat.

**Sam (Accessibility-Dependent):** Baseline work is genuinely good — labeled selects, `role="alert"` with programmatic focus, retained `:focus-visible`, removed/added carried by text labels not color alone. Gap: the minutes-editor's running total and validity only exist as text when invalid and silently disappear once valid — nothing proactively announces "total now 240.0, valid" to a screen reader. At 200% zoom, the clipped 80px inputs (P2 above) become even less readable.

**Alex (Power User):** URL-as-canonical-state is a real, creditable efficiency win — bookmarkable/shareable scenarios. Beyond that: no keyboard shortcuts, no recent/saved scenarios, no way to compare two *different* swaps side by side (only default-vs-edited-minutes for the *same* swap; a new submission fully replaces the prior result). Team-switch cleanup is handled correctly (`applySelectionUpdate` clears a stale `playerOutId`), so that specific edge case is not a red flag.

## Minor Observations

- "Heuristic scenario profile, not a validated causal fit model." now appears in **three** places on the results page (`ExplanationFactorsList`, `TeamProfilePanel`, and `ScenarioDisclosuresPanel`) — mildly repetitive, worth a glance next polish pass.
- The horizontal-scroll hint is CSS-gated below 480px, but the 4-column `nowrap` table can overflow well above that width too.
- No "clear/start over" action anywhere — reloading the bare URL is the only way back to a blank form.
- `globals.css` defines only light-mode tokens under `:root` with no `prefers-color-scheme: dark` block.
- The disabled `Season` field renders as an interactive-looking `<select>` rather than static text, inviting a pointless click.
- `.rowOutgoing` reuses the same accent-tint token used for error/status-error styling, so a neutral "this player left" row can read as an alarm before the "Removed" text label is read.

## Questions to Consider

- The rotation table appears twice, nearly identically — what would this page look like if editing were just a mode switch on the one table?
- The provider choice is the single most consequential input, explained only after commitment — what if that one sentence moved next to the dropdown?
- If someone tweaks a field after seeing a result, the result below doesn't visibly change — does the page currently let someone act on a scenario that no longer matches what's selected?
- 478 players sit in one flat alphabetical list — what would change if this were a real entry point for browsing, not just a field requiring a name you already know?
- The rapid-selection state-sync issue found during evidence-gathering — is it worth a deliberate, human-driven repro before the next feature builds more on top of `use-scenario-selection.ts`?
