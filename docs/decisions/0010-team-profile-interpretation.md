# 0010 — Team-Profile Interpretation

**Status:** Accepted (2026-07-23)

## Context

`POST /scenarios` and the Roster Lab frontend are complete through step 6
(editable minutes, decision 0009, commit `63af452`). Per CLAUDE.md's build
order, step 7 is team-profile interpretation. `docs/scenario-engine.md` §21
("Fit and Team Profiles") lists "possible profile categories": shooting,
three-point volume, spacing proxy, scoring, playmaking, turnover control,
offensive/defensive rebounding, steal activity, block activity,
availability, positional balance.

**None of these are computable with this project's actual licensed data.**
The pinned RAPTOR CSVs (`data/raw/fivethirtyeight-nba-raptor/2026-07-19/`)
were checked directly: their columns are only `player_id, season, poss, mp,
raptor_offense, raptor_defense, raptor_total, war_total, war_reg_season,
war_playoffs, predator_offense, predator_defense, predator_total,
pace_impact` (plus `season_type, team` in the by-team file) — no box-score
fields (FGA, 3PA, AST, TOV, ORB, DRB, STL, BLK) exist anywhere in this
project's data. Box-score acquisition is explicitly deferred to a future
phase (decision 0006), out of scope for decision 0007's free MVP. The
fixture loader didn't even ingest `raptor_offense`/`raptor_defense` before
this change — only `raptor_total` fed `contribution_values`.

`EpistemicType.DESCRIPTIVE_INTERPRETATION` already existed as an unused enum
value — this feature is exactly what it was added for.

## Options Considered

**Category scope:**
1. Approximate the full §21 list using RAPTOR fields as proxies (e.g.
   treating `pace_impact` as a "spacing proxy"). **Rejected** — fabricating
   a proxy for a metric the data doesn't measure would misrepresent what's
   calculated, directly conflicting with CLAUDE.md's rule against inventing
   basketball claims not traceable to calculated values.
2. Defer the whole feature until box-score data is acquired. **Rejected**
   — this is a named, expected build-order step; RAPTOR's own offense/
   defense split is real, licensed, already-loaded-adjacent data that
   supports an honest, narrower version now.
3. Ship a two-category profile (offensive impact, defensive impact) from
   RAPTOR's own `raptor_offense`/`raptor_defense` split, explicitly and
   visibly narrower than §21's full list. **Decision: option 3**, confirmed
   with the user before implementation.

**Sub-decisions within option 3:**
4. Include `predator_offense`/`predator_defense` (538's own *predictive*
   RAPTOR variant) alongside the descriptive split. **Rejected** — mixing a
   source FiveThirtyEight itself labels predictive into a feature whose
   `EpistemicType` is `DESCRIPTIVE_INTERPRETATION` would blur decision
   0007's descriptive/predictive product-claims distinction, even though
   the data itself would be equally real.
5. Include `pace_impact`. **Rejected for v1** — out of scope, not
   requested; flagged here (not silently added) as a future candidate if a
   genuine "pace/tempo profile" category is ever wanted.
6. Normalization method — §21 lists "minutes-weighted player rates,"
   "standardized league-relative scores," "percentile ranks," "normalized
   team indices" as options. **Decision: raw values, minutes-weighted, no
   normalization** — nothing in the codebase computes a league-relative
   baseline to reuse, and inventing one now would be an unrequested new
   abstraction with no demonstrated need.
7. `ContributionProvider` extension shape — one `get_player_profile()`
   method returning a `PlayerImpactProfile(offensive_impact, defensive_impact)`
   struct, vs. two separate scalar methods. **Decision: one method** —
   offense and defense share the same source row and the same missing-data
   condition in both providers; two calls would double provider round-trips
   for no independent-failure benefit.
8. Reuse `ScenarioExplanationFactor` for profile categories vs. a distinct
   `TeamProfileCategory` type. **Decision: distinct type** — profile
   categories must always carry `EpistemicType.DESCRIPTIVE_INTERPRETATION`
   regardless of provider, a real distinction `ScenarioExplanationFactor`
   has no field for; keeping it a separate type/field makes "this must
   never feed contribution/win logic" (§22) enforceable by shape, not just
   convention.

## Decision

`ContributionProvider` (`backend/providers/base.py`) gains
`get_player_profile(player_id, season_label) -> PlayerImpactProfile`,
raising `MissingContributionError` on absence (same error type as
`get_player_contribution`, since both read the same player-season record).
`HistoricalRaptorBenchmarkProvider` sources it from two new
`HistoricalSeasonData` fields (`offense_values`, `defense_values`), loaded
by extending `_BY_PLAYER_REQUIRED_COLUMNS` in
`backend/fixtures/historical_loader.py` to include `raptor_offense`/
`raptor_defense` — the same already-pinned, already-licensed CSV, not a new
data source. `SyntheticContributionProvider` derives offense/defense from
two independently-salted deterministic keys (not a split of the existing
contribution value).

`backend/domain/models.py` gains `PlayerImpactProfile` and
`TeamProfileCategory` (`category`, `baseline_value`, `scenario_value`,
`change`, `direction`, `epistemic_type`); `RosterScenarioResult` gains
`team_profile: tuple[TeamProfileCategory, ...]`. `RosterScenarioService
.build_scenario()` computes it from a fully separate `offense_values`/
`defense_values` lookup (never `contribution_values`), reusing the existing
`_minutes_weighted_contribution()` helper verbatim — no new aggregation
function. `backend/api/schemas.py`/`app.py` mirror this as
`TeamProfileCategoryResponse` / `ScenarioResponse.team_profile` — purely
additive, no existing field changed.

The frontend adds `TeamProfilePanel.tsx`, following
`ExplanationFactorsList.tsx`'s exact pattern (reads fields straight from the
view-model, no invented narrative, includes the required "Heuristic
scenario profile, not a validated causal fit model." label), composed into
`ScenarioSuccessPreview.tsx` between "What changed" and the editable-minutes
section.

## Rationale

Reuses the existing provider-abstraction discipline
(scenario-engine.md §16: no provider-specific field names outside the
provider layer) and the existing minutes-weighted aggregation helper
verbatim, rather than inventing new machinery. Keeps the feature honestly
scoped to what the data supports rather than performing the full spec's
aspirational list with fabricated proxies — an explicit, traceable judgment
call rather than a silent narrowing.

## Consequences

- `ContributionProvider` gained a new abstract method; both existing
  implementations (RAPTOR, synthetic) implement it — no third
  implementation exists yet to worry about.
- `HistoricalSeasonData` gained two new mapping fields;
  `_BY_PLAYER_REQUIRED_COLUMNS` grew by two entries — a required-column
  tightening on already-pinned data, not a new source or audit.
- `ScenarioResponse` grew one additive field (`team_profile`); `pnpm run
  generate:api` was re-run and the regenerated
  `frontend/src/generated/{api-types.ts,openapi.json}` are committed
  alongside this change.
- Backend test count: 121 → 139. Frontend test count: 103 → 105.
- `docs/scenario-engine.md` §7, §16, §21 updated in this same change to
  match what's actually implemented.

## Re-evaluation Triggers

- If box-score data is ever acquired (a future decision superseding
  decision 0006's deferral), §21's full category list becomes reachable and
  this decision's two-category scope should be explicitly revisited, not
  silently expanded.
- If a genuine need for league-relative normalization emerges, that's a new
  decision, not a quiet addition to the aggregation helper.
- If `pace_impact` or `predator_offense`/`predator_defense` ever get a
  concrete, justified use case, they need their own decision record.
