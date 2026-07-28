# Handoff

**Purpose:** a short pickup point for a new session — current state, what's
built, what's next, and load-bearing gotchas. This is **not** a running log
of what every past session did; when something is resolved, replace its
story with just the current fact. Long-form rationale belongs in decision
records, `docs/architecture/README.md`, or code comments — link to those
instead of duplicating them here. Keep this readable in two minutes.

**Only edit this file when the user explicitly asks, at the end of a
session** — not proactively mid-task.

**Last updated:** 2026-07-28

---

## Project state

A **historical-only, fully free** NBA roster-scenario prototype for the
**2014-15 season** (decisions 0005/0007). Steps 1–8 of CLAUDE.md's build
order are done. **Step 9 (visual polish) is in progress**, currently on
branch `feature/scenario-visual-integration`:

- **Backend**: unchanged since step 8 — `POST /scenarios` plus 5 read-only
  GET routes. 149 tests, ruff/mypy clean. Step 9 is frontend-only so far.
- **Frontend**: the Roster Lab form → results/disclosures flow, standalone
  `/players/[playerId]`/`/teams/[teamId]` pages, **plus new team-logo/
  player-headshot media on the selection form and a redesigned "Starting
  Lineup" court visualization in the results view** (see "Step 9" below).
  194 tests, typecheck/lint/build clean.
- Runs locally end-to-end — see `README.md`'s "Local Development" section.
- **Not deployed anywhere** — see "Portfolio Roadmap" below.

## Portfolio Roadmap (deployment status)

**Do not start deployment work, hosting selection, or a Vercel project on
your own initiative.** The user's answer (2026-07-21) is still current:

> The current target is a polished working local application. A public URL
> is the intended final portfolio outcome, likely using Vercel for the
> Next.js frontend, but deployment will begin only after the local
> experience is reviewed and approved.

Eventual portfolio-ready bar: public frontend URL, stable public backend,
README, screenshots/demo media, architecture explanation, methodology and
limitations, reproducible setup, clean repo history. None of that is built
yet. Revisit only when the user raises deployment again.

## Read first, in this order

1. `CLAUDE.md` — root rules
2. `docs/decisions/0007-fully-free-historical-prototype.md` — current
   product direction (supersedes 0004/0006's paid-data framing)
3. `docs/decisions/0008-roster-lab-frontend-architecture.md` — frontend
   architecture (client components, generated+validated API types,
   URL-backed state, reshape-only view-models) — implemented as written
4. `docs/decisions/0009-editable-scenario-minutes.md` — implemented
5. `docs/decisions/0010-team-profile-interpretation.md` — implemented
6. `docs/architecture/README.md` — maps `backend/` code to the specs
7. This file's "Step 9" section below, for the current in-flight work and
   its governing requirements
8. This file's "What's next" and "Starting prompt for tomorrow"

Skip 0001–0006 unless you need historical *why*. Step 9 has **no decision
record** — it's presentational/frontend-only, doesn't touch canonical
identifiers, data sources, or the scenario engine.

## Decision history

| # | Decision | Status |
|---|---|---|
| [0001](docs/decisions/0001-historical-data-source.md) | No source approved for next-season BPM | Superseded |
| [0002](docs/decisions/0002-environment-and-toolchain.md) | Python 3.12+uv, Node 22+pnpm, Postgres 16.14, Ruff/mypy/Pytest | Accepted, current |
| [0003](docs/decisions/0003-internal-player-impact-target.md) | Target = PCE, not BPM | Accepted (future work) |
| [0004](docs/decisions/0004-pce-data-source-options.md) | PCE data-source options | Deferred by 0007 |
| [0005](docs/decisions/0005-historical-only-product-scope.md) | Historical-only, no current data | Accepted, current |
| [0006](docs/decisions/0006-historical-pce-data-source.md) | Historical box-score source for PCE | Deferred by 0007 |
| [0007](docs/decisions/0007-fully-free-historical-prototype.md) | **Fully free**: CC BY 4.0 + synthetic only | **Accepted, current plan** |
| [0008](docs/decisions/0008-roster-lab-frontend-architecture.md) | Next.js Roster Lab frontend architecture | Accepted, current |
| [0009](docs/decisions/0009-editable-scenario-minutes.md) | Editable scenario minutes | Accepted, current |
| [0010](docs/decisions/0010-team-profile-interpretation.md) | Team-profile interpretation | Accepted, current |

**The short version:** PCE had no legally-usable free box-score source, so
0007 pivoted to a provider-abstraction design shipping on FiveThirtyEight's
CC BY 4.0 data alone, with PCE as a pluggable future provider.

## What's built

**Data**: `data/raw/fivethirtyeight-nba-raptor/` and `-elo/`, pinned, CC BY
4.0. Elo is loaded but not wired into any code yet.

**Backend** (`backend/`, no database, unchanged since step 8): `domain/`,
`fixtures/historical_loader.py`, `providers/` (`historical_benchmark` /
`synthetic`, no fallback), `minutes/allocator.py`, `scenario/service.py`,
`api/` (`POST /scenarios`; `GET /seasons/{season}/teams`,
`.../teams/{team_id}/roster`, `.../players`, `.../players/{player_id}`,
`.../teams/{team_id}`). Full detail in `docs/architecture/README.md`.

**Frontend** (`frontend/`, Next.js App Router + TypeScript, pnpm@11.15.1):
- `src/lib/api/` — one isolated module per endpoint family, ajv-validated
  from the generated OpenAPI schema. Only these files import generated
  `components["schemas"]` directly.
- `src/lib/view-model.ts` / `detail-view-model.ts` — reshape-only DTO→
  presentation mappers, never compute a new value.
- `src/lib/url-state.ts` + `use-scenario-selection.ts` — the 5 scenario
  inputs live in the URL, never the API result.
- `src/components/` — `ScenarioForm.tsx` (main form), `ScenarioSuccessPreview.tsx`
  (results container), `PlayerDetailView.tsx`/`TeamDetailView.tsx`
  (standalone pages), plus step 9's new components below.
- **Tests:** `pnpm test` (194, hermetic) + `pnpm test:codegen` (3 more) =
  `pnpm test:all` (197).
- Reviewed with `architecture-review` and `frontend-architect` at every
  slice through step 8; step 9 has been verified with real-browser checks
  instead (see below) rather than a formal review pass — do one before
  calling step 9 done.

## Step 9 — visual/UX polish (in progress)

### Governing requirements (as given by the user — still binding for the rest of this feature)

- Team logos next to team selections; player headshots next to player
  selections. **Done, but only on the selection form** — not yet in the
  results view (see "What's next").
- No real/scraped/hotlinked team logos or player photos, ever — this
  project is fully-free/CC BY 4.0 only (decision 0007) and real logos/
  photos aren't freely licensable. Generated placeholders only (team-color
  initial badges, player-initial avatars with a deterministic color).
  Component APIs accept an optional real `src` for later, but nothing
  passes one today.
- Court visualization must show the **starting lineup**: all 5 players,
  each named, in 5 fixed evenly-distributed court slots. **Never imply
  marker location is a real or verified position** — this project has no
  position/box-score data (decision 0007), so "starting lineup" itself is
  a display-only proxy (the 5 scenario-rotation players with the most
  minutes), not a claim about verified starters. Section is titled
  "Starting Lineup"; required disclaimer text (verbatim): *"Starting
  lineup shown below. Player placement on the court is for visualization
  only and does not represent verified on-court positions."* Clear empty
  state (not a partial/broken court) when a scenario doesn't have exactly
  5 rotation players with minutes.
- Keep the light/spacious/one-accent-color/modern-sports-product visual
  direction already established — no new visual world, no second hue for
  the court markers (shape distinction instead, see below).
- **Do not build the future clickable ML player-profile interaction yet**,
  and do not display placeholder model insights or imply that capability
  exists. `PlayerHeadshot.tsx` is deliberately plain/unclickable but
  structured so a future click affordance can wrap it without an API
  change — nothing more than that.
- Preserve existing architecture: generated OpenAPI types, ajv validation,
  transport isolation, URL-state behavior, backend contracts, test
  coverage, accessibility standards. No new dependency without explicit
  justification — none added.

### What's built so far

- `src/lib/avatar-color.ts` (deterministic initials/color, no dependency),
  `src/components/ImageWithFallback.tsx` (shared loading/missing/broken-
  image state machine — one mechanism covers all three: a generated
  fallback always renders; a real `<img>` only swaps in once it fires
  `onLoad`), `TeamLogo.tsx` / `PlayerHeadshot.tsx`, `MediaBadge.module.css`.
  Wired into `ScenarioForm.tsx`'s Team/Player-out/Player-in fields as a
  preview alongside the native `<select>` (can't embed images in
  `<option>`s).
- `CourtVisualization.tsx` — rebuilt twice: first as an outgoing/incoming
  swap diagram (since superseded), then redesigned per the "Starting
  Lineup" requirements above. Ranks `viewModel.rotationComparison` by
  `scenarioMinutes` (the post-swap team, not baseline — shows the
  resulting roster, not re-explains the swap, which the summary grid and
  rotation table already do), takes the top 5, renders each at a fixed
  slot with its name, plus an accessible legend list. Integrated into
  `ScenarioSuccessPreview.tsx` directly under the summary grid, above the
  rotation table (the primary view; rotation table stays as supporting
  detail).
- **Two real bugs found via live-browser verification** (not caught by the
  test suite): (1) the two court markers rendered in the identical accent
  color — fixed with a hollow-outline-vs-solid-fill shape distinction
  instead of a second hue; (2) long names (e.g. "Klay Thompson",
  "Draymond Green") clipped off the edge of the SVG at the two side slots
  — fixed with center-anchored text, slots pulled inward, and an
  `overflow: visible` safety net for even longer names.
- 194 frontend tests (up from 162 at step 8), typecheck/lint/build clean.

### Multi-Claude parallel workflow — attempted, currently paused

The user's original plan split step 9 into 4 branches
(`feature/team-player-media`, `feature/court-visualization`,
`feature/scenario-visual-integration`, `feature/scenario-visual-polish`),
each meant for a separate Claude Code chat with strict scope confinement
(own branch/files only, no merging other branches, no scope creep, a
defined end-of-branch report format).

**What actually happened:** the first two branches ran as parallel chats
sharing this **same primary checkout**, not separate git worktrees. One
chat's `git checkout -b feature/court-visualization` silently wiped the
other chat's entire uncommitted branch-1 work (new files deleted from
disk — nothing had been committed yet). Recovered by rebuilding branch 1
inside a genuinely isolated `git worktree` (`git worktree add
../nba-team-player-media feature/team-player-media`), which then worked
and was committed safely there.

**Lesson for next time:** "multiple Claude chats, one branch each" only
works if each chat *also* gets its own `git worktree add <path>
<branch>` — a branch name alone in a shared folder is not isolation.
Always check `git worktree list`, not just `git branch -a`/`--show-current`,
before assuming a session has its own space.

The user then said to work off one chat until they refresh how to run the
multi-branch workflow — the two completed branches were merged into
`feature/scenario-visual-integration` and work continued single-threaded
there. **Multi-chat parallel work is paused, not abandoned** — don't
restart it without the user asking, and set up real worktrees per branch
next time.

**Cleanup pending:** `feature/team-player-media` and
`feature/court-visualization` branches (and the `nba-team-player-media`
worktree) are now superseded/stale — safe to delete once confirmed merged.
`nba-step8-backend` worktree is also stale (step 8 landed long ago).

## Known gotchas / non-obvious facts

- **This is a shared checkout — check `git worktree list`, not just `git
  branch -a`, before assuming isolation.** See "Multi-Claude parallel
  workflow" above for the concrete failure mode. Never run a blanket `git
  stash`/`git reset --hard`/`git clean` without checking `git worktree
  list` and `git status` for files outside your own task scope. Commit
  with an explicit file list (`git add <specific paths>`), never `git add
  -A`/`git add .`, whenever other sessions might be active.
- **Possible flaky rapid-selection bug, unconfirmed**: driving the
  scenario form with automated clicks with no delay between them
  occasionally dropped an earlier field selection (`player-out` went blank
  after selecting player-in + provider back-to-back). Same code path as an
  already-fixed P1 URL race in `use-scenario-selection.ts`; only
  reproduced under faster-than-human automation timing, disappeared once
  small waits were added. Not confirmed as a real user-facing regression —
  worth a dedicated look if it ever surfaces from an actual user report.
- **Two eslint `react-hooks` rules will bite naive data-fetching-in-
  `useEffect` code**: `set-state-in-effect` forbids an unconditional
  synchronous `setState` in an effect's setup body; `refs` forbids reading
  `ref.current` during render. See `use-async-request.ts` /
  `use-roster-lookups.ts`'s module comment before writing another
  data-fetching hook.
- **Team code mismatch**: RAPTOR uses `"CHA"` for the 2014-15 Charlotte
  Hornets; nba-elo uses `"CHO"` (see `historical_loader.py`'s docstring).
- **`scenario_rotation` doesn't always include the incoming player** — no
  zero-minute placeholder if their minutes weight loses the rotation-size
  cap. `allocation_repairs` already names the excluded player.
- **PCE is not implemented and not blocking anything** — don't build it
  without re-reading decision 0007.
- **Player IDs are RAPTOR's own string IDs** (e.g. `"curryst01"`).
- **FastAPI's `TestClient` requires `httpx2`, not `httpx`.**
- **`pnpm` isn't on PATH by default.** Fix: `corepack enable
  --install-directory "$HOME/.local-bin"` then `export
  PATH="$HOME/.local-bin:$PATH"` before any `pnpm` command (repeat per
  Bash call).
- **`openapi-typescript`'s CLI breaks on this repo's path** (the space in
  "NBA Intelligence platform") — `codegen/generate-api.mjs` uses its JS
  API instead.
- **`gh` CLI is not installed** — open PRs by pushing and giving the user
  the compare URL.
- **Real browser verification pattern**: Microsoft Edge is already
  installed; `npm install playwright-core` ad-hoc in the scratchpad
  directory (never in `frontend/`), then `chromium.launch({channel:
  "msedge"})`. Used twice this session to catch real bugs jsdom-mocked
  tests couldn't (the marker-color and label-clipping issues above).

## What's next

- **Step 9, remaining:**
  1. Decide whether to wire `TeamLogo`/`PlayerHeadshot` into the results
     view too (`ScenarioSuccessPreview.tsx` currently shows plain text for
     Team/Player-removed/Player-added), not just the selection form. The
     original branch-3 scope implied this ("connect... media
     components"), but the later Starting Lineup redesign request only
     asked for player *names* on the court, not headshots — confirm with
     the user before adding rather than assuming.
  2. Final visual/UX polish pass (spacing, typography, hierarchy,
     responsive behavior, consistency across the now-integrated
     court+media+table view) — original `feature/scenario-visual-polish`
     scope, not started.
  3. Run a proper `architecture-review`/`frontend-architect` pass over all
     of step 9 before calling it done — skipped so far in favor of live
     browser verification.
- **Public deployment**: still explicitly deferred — see "Portfolio
  Roadmap" above.
- **Multi-chat workflow**: resume only if the user asks, with real `git
  worktree`s per branch this time.

## Starting prompt for tomorrow

```
Continue the NBA Front Office Intelligence Platform's step 9 work. Read
HANDOFF.md first, especially "Step 9 — visual/UX polish" (the governing
requirements — team logos/headshots, the Starting Lineup court, no real
imagery, no ML-click interaction yet) and "What's next".

Current branch: feature/scenario-visual-integration (single-chat, not the
paused multi-branch workflow — see HANDOFF.md's "Multi-Claude parallel
workflow" section if you're asked to resume that). Verify with
`git status`/`git log --oneline -5` that this still matches HANDOFF.md
before assuming anything.

Pick up at "What's next" item 1: decide with the user whether team logos/
player headshots should also appear in the scenario results view (not
just the selection form), then do the final visual/UX polish pass. Run
pnpm typecheck/lint/test/build clean before considering anything done, and
verify visually in a real browser (Edge via playwright-core, ad-hoc in the
scratchpad dir) before claiming a UI change works — this session found two
real bugs that way that the test suite alone missed.
```

## Commands to re-verify state after resuming

```bash
uv run ruff check .
uv run mypy
uv run pytest -q        # 149 tests
```

```bash
cd frontend
pnpm typecheck
pnpm lint
pnpm test                    # 194 tests, hermetic
pnpm build
pnpm run check:api-fresh     # should already be current — no backend changes in step 9
```

If any of these don't pass clean, something changed since this file was
last updated — trust the code over this document, and run `git status` /
`git worktree list` before assuming anything about the working tree.

Dev servers (`uv run uvicorn backend.api.app:app --port 8000` + `pnpm dev`
in `frontend/`) may still be running in the background from this
session's browser verification — check before assuming a clean slate.

---

## Keeping this file current

Edit the relevant section — don't append a new dated block. When something
gets resolved, replace its story with the current fact and delete the
narrative. Only do this when the user explicitly asks, at session end.
