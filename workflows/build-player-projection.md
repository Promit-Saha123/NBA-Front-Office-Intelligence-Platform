# Workflow: Build Player Projection (future PCE phase)

> **Deferred by [decision 0007](../docs/decisions/0007-fully-free-historical-prototype.md):**
> the free MVP ships no trained model — contribution values come from the
> provider abstraction. Run this workflow only when the PCE phase begins (after a
> historical box-score source is approved per decision 0006).

## Objective

Produce versioned next-season PCE (Player Contribution Estimate) projections from
audited historical data: canonical schema, constructed and validated PCE target
(decision 0003), baseline models, XGBoost, and a rolling-backtest report.

## Prerequisites

* Historical data source selected via
  [audit-data-source.md](audit-data-source.md) and a decision record
* Project scaffolding exists ([initialize-project.md](initialize-project.md))
* [docs/ml-specification.md](../docs/ml-specification.md) reviewed

## Inputs

* Versioned raw historical snapshot with manifest
* Feature and target definitions from docs/ml-specification.md

## Steps

1. Ingest the raw snapshot into a canonical player-season table with internal
   identifiers, source crosswalk, and one row per player-season.
2. Add data-validation checks (nulls, duplicates, impossible values, traded-player
   aggregation) that fail loudly.
3. Construct the PCE target: learn contribution coefficients per
   [decision 0003](../docs/decisions/0003-internal-player-impact-target.md), run the
   metric-validation program (stability, ablations, benchmarking), and freeze the
   versioned coefficients (`pce-v1`) before any prediction modeling.
4. Build the shared feature pipeline producing a versioned
   `player_season_features` schema, importable by both training and inference.
5. Add temporal-leakage checks (`feature_season < target_season`, no target-season
   columns).
6. Implement and evaluate baselines: persistence, multi-season average, linear
   regression.
7. Train the XGBoost regressor with conservative documented hyperparameters.
8. Run rolling backtests (train through season N → predict N+1) and record metrics
   for baselines and XGBoost.
9. Save the model artifact with complete metadata (versions, periods,
   hyperparameters, metrics, checksum); never overwrite an existing artifact.
10. Generate and store versioned player projections for the target season.

## Validation Checks

* Leakage tests pass; no target-season information appears in features.
* Baselines ran and are included in the evaluation report.
* Repeated runs with fixed inputs and seeds produce identical outputs.
* Artifact metadata is complete and the model version is unique.
* The critical test set for data and ML in
  [docs/testing-strategy.md](../docs/testing-strategy.md) passes.

## Expected Outputs

* Canonical player-season table with data version
* Versioned feature schema and shared feature pipeline
* Baseline and XGBoost evaluation report (rolling backtest)
* Versioned model artifact with metadata
* Stored versioned player projections

## Stopping Conditions

* Stop if the data source or its license status is unresolved.
* Stop if leakage checks fail — fix before any model comparison.
* Stop and report if XGBoost does not outperform baselines; do not tune against the
  final test season to force a win.
