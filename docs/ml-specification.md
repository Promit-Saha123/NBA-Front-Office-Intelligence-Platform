# Machine Learning Specification

## 1. Purpose

This document defines the machine learning requirements for the NBA Front Office Intelligence Platform.

The initial modeling objective is to predict a player’s next-season impact using historical player-season data.

The machine learning system must prioritize:

* temporal correctness
* reproducibility
* baseline comparison
* transparent limitations
* shared training and inference logic
* versioned artifacts
* defensible evaluation

The model is one component of the roster scenario platform. It does not independently predict full team outcomes or coaching decisions.

---

## 2. Modeling Objective and Target Metric

The approved target ([decision 0003](decisions/0003-internal-player-impact-target.md);
initially next-season BPM, changed by that record) is:

> Next-season **Player Contribution Estimate (PCE)**.

One modeling row represents:

> One player during one completed NBA season.

The input features are calculated using information available at the end of season N.

The target is the player’s PCE in season N+1.

Example:

```text
2023-24 player features
→ predict 2024-25 PCE
```

Any further target change requires a new approved decision record.

### 2.1 PCE Definition (conceptual level)

PCE is an internally computed, versioned player-contribution metric. Approved
conceptual method:

```text
canonical player-season box-score rates
+ minutes shares
+ team-season net rating
→ within-season standardization
→ pooled regularized regression
→ versioned player-contribution coefficients
→ Player Contribution Estimate
```

Constraints on any implementation:

* Coefficients are **learned** from historical team outcomes — never manually
  selected.
* The estimate is **associational, not causal**.
* The first implementation should use a **compact feature set** (the limited
  team-season sample constrains feature count).
* **Ridge regression is the initial candidate**, not an irrevocable final choice.
* **Traded players require team-stint records** (per-team minutes shares within a
  season).
* The **team-season sample is limited** (~30 observations per season), which
  restricts model flexibility.
* **Defense is incompletely represented** in public box-score data; PCE inherits
  that limitation.
* **Coefficient stability must be evaluated before `pce-v1` is frozen.**

No numeric formula or feature weights are defined in documentation; they belong to
versioned, validated artifacts.

### 2.2 Epistemic Classification of PCE (approved)

* A PCE value is a **statistically estimated metric**.
* Applying frozen, versioned PCE coefficients to canonical player statistics is a
  **deterministic calculation**.
* A next-season PCE forecast is a **model prediction**.

Standard descriptive phrase:

> Statistically estimated metric calculated deterministically from fixed,
> versioned coefficients.

Never describe PCE as causal, official, definitive, or equivalent to BPM, RAPTOR,
EPM, or another established metric.

### 2.3 Three Separate Evaluation Problems

These must never be conflated; each has its own validation criteria:

1. **Validating PCE as a constructed historical metric** — leave-season-out
   reconstruction of team outcomes, season-to-season stability, coefficient
   stability across rolling windows, ablations, sensitivity to minutes,
   traded-player agreement, position/role bias checks, outlier review, bootstrap
   uncertainty, and benchmarking against permitted references (historical RAPTOR
   under CC BY 4.0 only). This program is a prerequisite for freezing `pce-v1`
   (detailed in [decision 0003 §6](decisions/0003-internal-player-impact-target.md)).
2. **Predicting next-season PCE** — governed by this specification: baselines
   (§10), time-based evaluation and rolling backtests (§9), metrics (§12).
3. **Aggregating projected PCE values into roster scenarios** — governed by
   [scenario-engine.md](scenario-engine.md) (aggregation, team-rating conversion,
   win conversion), validated separately.

### 2.4 Release Sequencing (decision 0007)

**The first deployed release ships no trained model and no PCE.** Contribution
values come from a provider abstraction (`HistoricalRaptorBenchmarkProvider`,
`SyntheticContributionProvider` — see
[scenario-engine.md §16](scenario-engine.md) and
[decision 0007 §7](decisions/0007-fully-free-historical-prototype.md)), always
labeled per decision 0007 §8 and never as `pce-v1`, validated PCE, causal impact,
or current-season prediction. This specification governs the **future PCE phase**,
which begins only when a historical box-score source is approved
([decision 0006](decisions/0006-historical-pce-data-source.md), deferred).

### 2.5 Historical-Only Behavior (decision 0005)

* PCE is constructed **only from historical data**.
* Next-season PCE prediction is evaluated **historically**: rolling backtests
  only, and the model predicts season N+1 only where historical ground truth
  exists.

```text
Train through 2018-19
→ predict 2019-20
→ compare with historical 2019-20 PCE
```

* **No current-season prediction claim is made anywhere.**
* `pce-v1` is not frozen until the historical source is approved and the §2.3
  stage-1 validation program passes.

---

## 3. Modeling Claim

The model estimates a player’s next-season statistical impact based on historical information.

It does not directly predict:

* exact future minutes
* exact future role
* coaching decisions
* injuries
* team chemistry
* playoff performance
* leadership
* tactical fit
* guaranteed future value

Model outputs must be presented as estimates with documented limitations.

---

## 4. Unit of Observation

The canonical modeling key is:

```text
internal_player_id
feature_season
target_season
```

Each player-season row must represent a single canonical player-season observation.

The pipeline must define how it handles:

* players who changed teams midseason
* total-season rows versus team-specific rows
* players with multiple team records
* players with limited minutes
* rookies without prior NBA history
* players who did not play in the target season
* players who retired or left the league
* players who missed most of a season

Duplicate player-season observations are not allowed in the final modeling table.

---

## 5. Data Requirements

The historical dataset should contain or support derivation of:

### Identity and season fields

* internal player identifier
* source player identifier
* player name
* season
* team
* age
* position

### Playing-time fields

* games played
* games started
* total minutes
* minutes per game

### Scoring and efficiency fields

* points
* field-goal attempts
* three-point attempts
* free-throw attempts
* true shooting percentage
* effective field-goal percentage
* usage rate

### Playmaking fields

* assists
* turnovers
* assist percentage
* turnover percentage
* assist-to-turnover ratio

### Rebounding fields

* offensive rebound percentage
* defensive rebound percentage
* total rebound percentage

### Defensive activity fields

* steals
* blocks
* steal percentage
* block percentage

### Historical impact fields

* Player Contribution Estimate (computed internally from the fields above plus
  team outcomes; see §2.1 — not sourced externally)
* offensive/defensive decomposition, where the PCE methodology supports it
* prior-season impact
* multi-season impact history

Not every field must exist in the first model, but every selected feature must have documented provenance and temporal availability.

---

## 6. Canonical Feature Table

The feature table should remain separate from raw statistics.

Suggested entity:

```text
player_season_features
```

Suggested fields:

```text
internal_player_id
feature_season
target_season
feature_schema_version
data_version
feature values
created_at
```

The target should either be stored in a separate modeling table or clearly separated from input features.

The application must not treat engineered features as historical raw observations.

---

## 7. Feature Engineering Principles

Feature engineering should favor understandable, reproducible variables.

Potential feature groups include:

### Current-season performance

* PCE
* offensive/defensive PCE decomposition, where available
* minutes per game
* usage rate
* true shooting percentage
* assist percentage
* turnover percentage
* rebound percentages
* steal percentage
* block percentage

### Multi-season history

* previous-season PCE
* two-season weighted PCE
* three-season average PCE
* year-over-year PCE change
* year-over-year minutes change
* year-over-year efficiency change

### Age and development

* age
* age squared
* experience
* age-band indicators
* interaction between age and prior performance

### Role and workload

* games started percentage
* minutes tier
* usage tier
* starter or reserve indicator
* prior workload stability

### Availability

* games played percentage
* missed-game rate
* multi-season availability trend

### Team context

* team pace
* team offensive rating
* team defensive rating
* team net rating

Team-context features must only use information available before the target season.

---

## 8. Temporal Leakage Prevention

Leakage prevention is mandatory.

Features for season N+1 prediction may only use information available by the end of season N.

Prohibited examples include:

* target-season games played
* target-season minutes
* target-season team record
* target-season awards
* target-season player statistics
* target-season injuries known only after the prediction date
* future roster membership
* future contract outcomes
* future playoff results

Any feature with uncertain timing must be excluded until its availability is verified.

The pipeline should include automated checks that confirm:

```text
feature_season < target_season
```

Random row-level splitting must not be the primary evaluation method.

---

## 9. Train, Validation, and Test Strategy

Use time-based evaluation.

A basic split may use:

```text
Train: seasons through N-2
Validation: season N-1
Test: season N
```

The preferred method is rolling backtesting:

```text
Train through season N
→ predict season N+1
→ record metrics
→ advance one season
→ repeat
```

Example:

```text
Train through 2018-19 → predict 2019-20
Train through 2019-20 → predict 2020-21
Train through 2020-21 → predict 2021-22
```

The final test period must remain untouched during feature selection and hyperparameter tuning.

---

## 10. Baseline Models

XGBoost must not be evaluated in isolation.

Required baselines include:

### Persistence baseline

```text
predicted next-season PCE = current-season PCE
```

### Multi-season average baseline

```text
predicted next-season PCE = weighted or unweighted average of recent PCE
```

### Linear regression baseline

A regularized or standard linear regression model using the approved feature set.

Optional additional baselines:

* ridge regression
* elastic net
* random forest
* simple age-curve adjustment

A more complex model is only justified if it improves out-of-sample performance or produces meaningful secondary benefits.

---

## 11. Primary Model

The first primary model will be:

```text
XGBoost regressor
```

Initial hyperparameters should be conservative and documented.

Potential parameters include:

* number of estimators
* learning rate
* maximum depth
* minimum child weight
* subsample
* column subsample
* regularization terms
* early stopping

Hyperparameter tuning must use only training and validation periods.

Do not tune against the final test season.

---

## 12. Evaluation Metrics

Track at least:

* mean absolute error
* root mean squared error
* R²
* Pearson correlation
* Spearman rank correlation
* directional accuracy for improvement or decline

Also evaluate error by:

* age group
* position
* minutes tier
* impact tier
* games-played tier
* high-impact players
* low-minute players
* players changing teams, where identifiable

The model report should compare all approved baselines and the primary model.

Do not present only the best metric.

---

## 13. Calibration and Uncertainty

The model should avoid false precision.

Where practical, evaluate:

* prediction residual distributions
* confidence or prediction intervals
* performance by predicted-impact range
* uncertainty for low-minute players
* uncertainty for players with missing recent history

The interface may initially display point estimates, but documentation must state that they are uncertain estimates.

A later version may expose:

```text
predicted PCE
lower estimate
upper estimate
```

Any uncertainty method must be documented and evaluated.

---

## 14. Missing Data

Missing values must be handled deliberately.

For each feature, document:

* why values are missing
* whether missingness is meaningful
* imputation method
* missingness indicator usage
* treatment during inference

Do not silently replace missing values with zero unless zero is semantically correct.

Training and inference must use identical missing-data handling.

---

## 15. Low-Minute and New Players

Low-minute players create unstable targets and features.

The modeling pipeline must document:

* minimum minutes threshold
* minimum games threshold
* treatment of players below thresholds
* treatment of rookies
* treatment of players returning after long absences

Possible strategies include:

* excluding very low-minute rows from initial training
* retaining them with lower sample weights
* assigning wider uncertainty
* using a separate rookie or low-information baseline

These choices require evaluation and documentation.

---

## 16. Shared Training and Inference Pipeline

Feature generation must be implemented once and reused.

Use this conceptual flow:

```text
canonical player-season data
→ shared feature builder
→ validated feature schema
→ training or inference
```

Do not:

* create training features only in notebooks
* rewrite feature logic inside the API
* maintain separate preprocessing implementations
* manually reorder features at inference time
* rely on undocumented notebook state

The feature pipeline should be importable from both training and inference code.

---

## 17. Feature Schema Versioning

Every model must reference a feature schema version.

Example:

```text
player-impact-features-v1
```

The schema should record:

* ordered feature names
* data types
* nullability
* transformation rules
* categorical encoding
* scaling, where used
* feature provenance

A breaking feature change requires a new schema version.

The inference service must reject incompatible feature and model versions.

---

## 18. Model Artifact Requirements

Each trained model must produce:

* serialized model artifact
* model version
* data version
* feature schema version
* target definition
* training period
* validation period
* test period
* hyperparameters
* evaluation metrics
* baseline comparison
* training timestamp
* code commit identifier, where available
* library versions
* artifact checksum

Suggested metadata structure:

```json
{
  "model_version": "pce-xgb-v1",
  "data_version": "historical-player-seasons-v1",
  "feature_schema_version": "player-impact-features-v1",
  "target": "next_season_pce",
  "trained_at": "YYYY-MM-DDTHH:MM:SSZ",
  "training_seasons": [],
  "validation_seasons": [],
  "test_seasons": [],
  "metrics": {},
  "hyperparameters": {},
  "code_commit": "",
  "artifact_checksum": ""
}
```

Never overwrite an existing versioned artifact.

---

## 19. Model Registry

The initial registry may be file-based or database-backed.

It must support:

* listing available models
* identifying the active model
* loading metadata
* validating compatibility
* tracing predictions to a model version
* marking a model as deprecated

The active model must be selected explicitly.

Do not silently fall back to another model if the configured artifact fails to load.

---

## 20. Inference Contract

Player projection responses should include:

```text
internal_player_id
feature_season
target_season
predicted_pce
model_version
data_version
feature_schema_version
prediction_timestamp
```

Where available, include:

```text
uncertainty estimate
baseline prediction
key model factors
```

Inference must be deterministic for a fixed:

* model artifact
* data version
* feature values
* software environment

---

## 21. Explainability

Use explainability methods carefully.

Potential methods include:

* SHAP values
* permutation importance
* feature importance
* comparison with historical averages
* comparison with positional peers

Explainability must not imply causality.

Good wording:

> Recent PCE, age, minutes stability, and shooting efficiency were among the strongest contributors to this projection.

Bad wording:

> Improving shooting efficiency will cause the player’s PCE to increase by exactly 1.2.

Any user-facing explanation must be grounded in stored feature or model outputs.

---

## 22. Reproducibility

A model-training run must be reproducible from:

* pinned raw snapshot
* data manifest
* feature schema
* training configuration
* random seed
* package versions
* code commit
* training command

Set random seeds where supported.

Record sources of nondeterminism.

Model-training scripts should not depend on manual notebook steps.

---

## 23. Logging and Observability

Training and evaluation jobs should log:

* run identifier
* model version
* data version
* feature schema version
* training period
* validation period
* test period
* row counts
* excluded-row counts
* missingness summary
* hyperparameters
* baseline metrics
* model metrics
* artifact location
* elapsed time
* warnings
* failure category

Inference logs should include:

* request identifier
* player identifier
* model version
* data version
* feature schema version
* inference duration
* error category

Logs must not include secrets or unnecessary raw personal data.

---

## 24. Testing Requirements

Add tests for:

### Feature generation

* expected feature columns
* correct feature ordering
* correct data types
* temporal alignment
* missing-data handling
* traded-player handling
* deterministic output

### Leakage

* feature season precedes target season
* no target-season columns present
* no future rows used in rolling windows
* time-based splits remain ordered

### Model artifacts

* artifact can be loaded
* metadata is complete
* checksum is valid
* feature schema is compatible
* model version is unique

### Inference

* deterministic predictions
* expected response contract
* missing-feature failures
* incompatible-version failures
* unknown-player failures

### Evaluation

* baselines run successfully
* metrics are computed correctly
* rolling backtest windows do not overlap incorrectly
* final test season is not used during tuning

---

## 25. Dependency Rules

Add ML dependencies only when necessary.

Before adding a library, document:

* purpose
* why existing tools are insufficient
* licensing
* maintenance activity
* compatibility with the environment
* reproducibility implications

Pin critical ML library versions.

Changes to XGBoost, scikit-learn, serialization, or feature-processing versions may require retraining and a new model version.

---

## 26. Definition of Done for ML Changes

An ML change is complete only when:

* the target remains clearly defined
* temporal leakage checks pass
* approved baselines are evaluated
* rolling backtests run
* metrics are recorded
* feature schema is versioned
* artifact metadata is complete
* model artifact is not overwritten
* training and inference share feature logic
* relevant tests pass
* documentation is updated
* limitations are stated honestly
* the final diff and model report are reviewed

---

## 27. Initial Deliverable

The first credible ML deliverable is:

```text
Audited historical data
→ canonical player-season table
→ persistence baseline
→ multi-season baseline
→ linear regression baseline
→ XGBoost model
→ rolling backtest report
→ versioned player projections
```

This deliverable should exist before substantial frontend polish.
