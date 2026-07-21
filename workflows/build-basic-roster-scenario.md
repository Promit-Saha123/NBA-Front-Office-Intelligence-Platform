# Workflow: Build Basic Roster Scenario (Slice 2)

## Objective

Deliver the first end-to-end scenario loop: one player removed, one added, valid
default rotation, projected impact and win change, with assumptions and versions
exposed.

## Prerequisites

* A contribution provider exists behind the ContributionProvider interface —
  for the free MVP the RAPTOR benchmark and synthetic providers
  ([decision 0007](../docs/decisions/0007-fully-free-historical-prototype.md));
  versioned PCE projections only in the future PCE phase
* Historical-roster snapshots for the supported seasons ingested and validated
  (historical-only product — decision 0005; seed season 2014-15 derived from the
  RAPTOR by-team regular-season stints)
* [docs/scenario-engine.md](../docs/scenario-engine.md) reviewed
* Win-conversion methodology decided and recorded in
  [docs/decisions/](../docs/decisions/)

## Inputs

* Versioned baseline roster snapshot
* A contribution provider (provider version + data version + epistemic type)
* Minutes-allocation configuration (named configuration object)

## Steps

1. Implement roster validation with machine-readable error codes
   (team/player existence, on-roster checks, projection availability).
2. Implement the heuristic v1 minutes allocation: baseline minutes → remove outgoing
   → add incoming → redistribute → enforce constraints, with every repair reported.
3. Enforce hard rotation constraints: exactly 240 minutes, no negatives, maximum
   player minutes, removed player at zero, rostered players only, rotation size,
   basic positional viability.
4. Implement minutes-weighted team-impact aggregation, identical for baseline and
   scenario.
5. Implement the documented, versioned team-rating and win-conversion methods.
6. Calculate descriptive profile changes and grounded explanation factors.
7. Expose one backend scenario endpoint returning the response contract from
   docs/scenario-engine.md §7, including `contribution_provider`,
   `contribution_epistemic_type`, `data_version`, `minutes_method`,
   `minutes_assumptions`, and `win_conversion_version`.
8. Build the minimal Roster Lab interface completing: select historical season →
   select team → remove player → add same-season player → run scenario → display
   result with assumptions and the historical-only disclosures.
9. Add the end-to-end test for that workflow using stable seeded data.

## Validation Checks

* Identical requests produce identical results (determinism).
* All minutes-allocation and scenario tests in
  [docs/testing-strategy.md](../docs/testing-strategy.md) §22–§28 pass.
* Every explanation maps to a stored calculated factor; prohibited claims
  (leadership, chemistry, etc.) never appear.
* No arbitrary fit bonus or penalty affects projected wins.
* Heuristic labels are visible in API and interface.

## Expected Outputs

* Working scenario engine module and one backend endpoint
* Minimal functional Roster Lab page
* Passing end-to-end scenario test

## Stopping Conditions

* Stop if player projections or a validated roster snapshot are missing.
* Stop if the win-conversion method has no decision record — do not hardcode an
  unexplained conversion.
* Stop before adding editable minutes, caching, persistence, or multi-player trades;
  those belong to later phases.
