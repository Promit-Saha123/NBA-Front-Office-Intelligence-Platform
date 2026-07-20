# Testing Strategy

## 1. Purpose

This document defines the testing and quality strategy for the NBA Front Office Intelligence Platform.

The testing approach should protect the parts of the system where silent errors would most damage credibility:

* data ingestion
* identity resolution
* temporal alignment
* feature generation
* model artifacts
* roster construction
* minutes allocation
* team-impact calculations
* win conversion
* explanation grounding
* API contracts
* end-to-end scenario behavior

A successful local run is not sufficient evidence that a feature is correct.

---

## 2. Testing Principles

Tests should be:

* deterministic
* isolated where practical
* readable
* focused on behavior
* fast enough for regular development
* explicit about assumptions
* independent of live external APIs
* based on stable fixtures or synthetic data
* layered by risk

Prefer testing observable behavior over implementation details.

Use integration tests where correctness depends on components working together.

---

## 3. Testing Layers

The project should use:

### Unit tests

For focused calculations and business rules.

### Integration tests

For database access, pipeline stages, model loading, and service boundaries.

### Contract tests

For data-source adapters, API schemas, and artifact metadata.

### End-to-end tests

For the critical user workflow.

### Data-quality tests

For raw, canonical, and feature datasets.

### Model-evaluation tests

For temporal splits, baselines, backtests, and artifact compatibility.

---

## 4. Test Environments

The project should support:

### Local development

Fast unit and integration tests using local services or containers.

### Continuous integration

Automated checks on every pull request.

### Optional pre-release environment

Full application and database validation before deployment.

Tests must not require:

* live NBA endpoints
* undocumented external services
* developer-specific file paths
* local secrets
* manual notebook execution

---

## 5. Test Data Strategy

Use a combination of:

* small synthetic fixtures
* curated historical samples
* anonymized or public canonical records
* versioned test snapshots
* generated edge cases

Do not use the full historical dataset for ordinary unit tests.

A small representative fixture should cover:

* normal player-season rows
* traded players
* duplicate names
* missing identifiers
* low-minute players
* players with multiple teams
* valid and invalid rosters
* missing projections
* unusual minute allocations

---

## 6. External API Isolation

Automated tests must not call live external APIs.

Data-source adapter tests should use:

* recorded fixtures
* mocked responses
* local files
* schema-contract samples

Test:

* successful parsing
* missing fields
* unexpected fields
* changed types
* rate-limit responses
* timeout handling
* invalid payloads
* empty responses

Live-source smoke tests may exist separately and should not run as part of normal CI.

---

## 7. Data Ingestion Tests

Test extraction and ingestion for:

* successful source read
* expected columns
* expected data types
* missing required columns
* malformed season values
* duplicate records
* invalid identifiers
* impossible statistics
* empty source files
* partial source files
* source schema drift
* idempotent reruns

A repeated ingestion of the same versioned snapshot should not create duplicate canonical rows.

---

## 8. Raw Data Preservation Tests

Verify that ingestion:

* preserves the original source file
* records retrieval metadata
* calculates a checksum
* creates a data manifest
* does not modify raw input
* produces a new transformed output
* associates canonical rows with a data version

Where practical, compare checksums before and after pipeline execution.

---

## 9. Canonical Schema Tests

Canonical tables should enforce:

* stable primary keys
* required fields
* valid foreign keys
* valid season formats
* expected enumerations
* uniqueness constraints
* nonnegative statistical values where applicable
* valid percentages and rates
* consistent team references

Schema violations should fail loudly.

---

## 10. Identity Resolution Tests

Identity matching is a high-risk area.

Test:

* exact stable identifier match
* normalized name plus birth date
* name plus career overlap
* accented characters
* suffixes such as Jr. and III
* shortened names
* known aliases
* duplicate names
* ambiguous name-only matches
* manual-verification flags
* low-confidence matches
* unmatched players

Ambiguous matches must not be silently accepted.

The crosswalk must preserve:

```text
source
source identifier
internal identifier
match method
confidence
manual verification status
```

---

## 11. Traded-Player Tests

Datasets often include:

* one total-season row
* one row for each team
* partial-season team rows

Test that the canonical pipeline:

* identifies aggregate rows
* avoids double counting
* preserves team-level detail where needed
* produces one modeling row per player-season
* documents the aggregation method
* handles midseason roster membership correctly

Use known synthetic cases with exact expected totals.

---

## 12. Data-Validation Tests

Test:

* null-rate thresholds
* duplicate-key detection
* row-count anomalies
* missing seasons
* missing target values
* impossible age values
* impossible games or minutes
* invalid percentages
* broken foreign keys
* unexpected team codes
* unsupported positions
* out-of-range BPM values
* inconsistent player identifiers

Validation failures should include actionable error messages.

---

## 13. Database Tests

Use database integration tests for:

* repository queries
* inserts
* updates
* transactions
* rollbacks
* uniqueness constraints
* foreign-key constraints
* pagination
* filters
* migration application
* migration rollback where practical

Do not test database behavior solely with mocks.

Use an isolated test database or transaction rollback strategy.

---

## 14. Migration Tests

For each schema change:

* apply migrations from a clean database
* apply migrations from the previous version
* verify expected schema
* verify existing data remains valid
* test downgrade where supported
* ensure application models match the migrated schema

Migration files must be committed with the related code change.

---

## 15. Feature Engineering Tests

Test:

* expected feature names
* feature order
* feature data types
* null handling
* rolling-window calculations
* lagged features
* age calculations
* season alignment
* multi-season averages
* team-context joins
* deterministic output
* schema version changes

Use hand-calculated synthetic examples for important features.

---

## 16. Temporal Leakage Tests

Leakage tests are mandatory.

Verify:

* feature season precedes target season
* target-season columns are absent from inputs
* rolling windows stop before the target season
* train, validation, and test seasons remain ordered
* future team membership is not used
* future minutes are not used
* future awards or outcomes are not used

Add explicit regression tests whenever a leakage bug is found.

---

## 17. Baseline Model Tests

Test that:

* persistence baseline runs
* multi-season average baseline runs
* linear regression baseline runs
* metrics are computed correctly
* missing-history behavior is documented
* baselines use only past information
* results are saved to evaluation output

A training workflow should fail if approved baselines are skipped without explanation.

---

## 18. Model Training Tests

Test:

* training configuration loads
* feature schema is compatible
* target exists
* seeds are applied where supported
* training completes on a small fixture
* validation data remains separate
* test data is not used for tuning
* artifact is produced
* metadata is complete
* model version is unique

Full model-performance runs may be separate from fast CI tests.

---

## 19. Backtesting Tests

Test:

* rolling windows are constructed correctly
* each target season occurs after its training period
* no season appears in both training and target data for the same fold
* metrics are aggregated correctly
* fold-level results are preserved
* empty folds fail clearly
* unsupported season ranges fail clearly

Use synthetic season labels to verify split logic.

---

## 20. Model Artifact Tests

Verify:

* model artifact exists
* metadata file exists
* checksum matches
* model can be loaded
* feature schema version matches
* data version is present
* target definition is present
* model version is unique
* incompatible artifacts fail clearly
* deprecated models are not selected accidentally

Never silently fall back to an unversioned artifact.

---

## 21. Inference Tests

Test:

* known player produces prediction
* missing player fails clearly
* missing features fail clearly
* incompatible schema fails
* incompatible season fails
* output includes model version
* output includes data version
* repeated identical inputs produce identical predictions
* response schema remains stable

Use a small versioned test model where practical.

---

## 22. Scenario Request Tests

Test:

* valid team
* invalid team
* valid outgoing player
* outgoing player not on roster
* valid incoming player
* incoming player already on roster
* same player added and removed
* unsupported season
* duplicate roster members
* missing projection
* invalid roster size

API and service tests should both cover important validation paths.

---

## 23. Minutes Allocation Tests

Minutes allocation is a critical area.

Test:

* total minutes equal exactly 240
* no player has negative minutes
* no player exceeds configured maximum
* removed player receives zero minutes
* only rostered players receive minutes
* active rotation size is valid
* minimum-minute behavior is correct
* positional viability is enforced
* allocation is deterministic
* repair behavior is reported
* invalid configurations fail

Use synthetic rotations with exact expected outputs.

---

## 24. Editable Minutes Tests

When editable minutes are introduced, test:

* valid edits
* total below 240
* total above 240
* negative minutes
* excessive player minutes
* removed-player minutes
* duplicate player entries
* reset-to-default behavior
* auto-balance behavior, if supported
* recalculation after edits
* distinction between default and custom assumptions

The user should never receive a scenario result from an invalid rotation.

---

## 25. Team Impact Tests

Test:

* correct minutes weighting
* baseline and scenario use identical aggregation
* known synthetic roster produces expected impact
* zero-change scenario produces zero difference
* replacement-level handling
* bench-player handling
* missing-player behavior
* rounding does not alter internal totals

Use hand-calculated examples.

---

## 26. Win Conversion Tests

Test:

* known team rating maps to expected wins
* baseline and scenario use the same method
* invalid inputs fail
* extreme values are handled
* output remains within documented bounds
* conversion version is returned
* formula changes require a new version

If the relationship is fitted, test model loading and metadata compatibility.

---

## 27. Team Profile Tests

For each descriptive profile:

* verify formula
* verify minutes weighting
* verify league normalization
* verify baseline and scenario difference
* verify missing-data handling
* verify zero-change behavior
* verify output range

Profile tests should not assume that profile changes alter projected wins unless an approved model explicitly does so.

---

## 28. Explanation Tests

Every explanation must map to a calculated factor.

Test:

* factor exists for each explanation
* numerical direction matches text
* importance threshold is respected
* insignificant factors are omitted
* contradictory factors are handled
* unsupported claims are never emitted
* zero-change factors do not generate misleading text
* stored factor values match the displayed explanation

Maintain a prohibited-claim test set for words or categories such as:

```text
leadership
chemistry
clutch
winning mentality
championship experience
locker-room impact
```

unless explicitly supported by future validated data.

---

## 29. API Contract Tests

Test:

* route status codes
* request validation
* response schemas
* error schemas
* machine-readable error codes
* pagination
* missing resources
* unsupported methods
* model and data version fields
* heuristic-assumption metadata

Breaking contract changes should be deliberate and versioned.

---

## 30. Backend Service Tests

Service tests should cover:

* business-rule enforcement
* orchestration
* repository interactions
* model-service interactions
* error mapping
* scenario determinism
* assumption propagation

Mock external boundaries, not the core business logic being tested.

---

## 31. Repository Tests

Repository integration tests should cover:

* expected queries
* filters
* joins
* pagination
* transaction behavior
* absent records
* duplicate records
* version selection
* latest-active-model lookup
* current-roster lookup

Watch for N+1 query behavior in roster and scenario reads.

---

## 32. Frontend Unit and Component Tests

Test:

* team selector
* player search
* add-player action
* remove-player action
* roster display
* loading states
* empty states
* API errors
* validation messages
* scenario result display
* model-versus-heuristic labels
* explanation factors
* version metadata where displayed

Do not test only snapshots. Prefer behavioral assertions.

---

## 33. Frontend Type Safety

The frontend should use generated or manually maintained typed API contracts.

Tests and build checks should catch:

* missing fields
* renamed fields
* incompatible response shapes
* unsafe null assumptions
* invalid enum values

Core scenario response handling should not rely on `any`.

---

## 34. Accessibility Tests

For critical interactions, verify:

* form controls have labels
* buttons have accessible names
* keyboard navigation works
* focus states are visible
* errors are associated with fields
* tables or editable grids are navigable
* charts have text alternatives or summaries
* color is not the only indicator of meaning

Accessibility checks may be automated and manually reviewed.

---

## 35. End-to-End Tests

At least one end-to-end test must cover:

```text
Open Roster Lab
→ select team
→ view current roster
→ remove player
→ add player
→ run scenario
→ display projected win change
→ display rotation assumptions
→ display explanation factors
```

Additional end-to-end cases should cover:

* API failure
* missing projection
* invalid roster change
* editable minutes, when implemented

Use stable seeded data.

Do not depend on live NBA data in end-to-end CI.

---

## 36. Performance Tests

Initial performance checks should monitor:

* common API response time
* scenario calculation duration
* player-search duration
* roster query count
* model-loading behavior
* database N+1 issues
* frontend bundle growth

Performance tests need not block early development unless a clear regression threshold is exceeded.

Record meaningful regressions.

---

## 37. Security Tests

Test:

* request validation
* SQL injection resistance through parameterized access
* CORS configuration
* secret-file exclusion
* production error responses
* dependency vulnerability scanning
* oversized input handling
* unsupported content types

Ensure logs do not expose:

* tokens
* passwords
* API keys
* full connection strings
* sensitive environment variables

---

## 38. Logging and Observability Tests

Verify that important operations log:

* request identifier
* job or workflow name
* execution duration
* model version
* data version
* scenario method
* error category

Test that:

* errors are logged once at the appropriate layer
* secrets are redacted
* validation failures are distinguishable
* data jobs report accepted and rejected rows
* scenario repairs are visible
* model-loading failures are actionable

---

## 39. Dependency and Build Checks

Continuous integration should run:

* dependency installation from a lockfile
* backend linting
* backend type checking
* backend tests
* frontend linting
* frontend type checking
* frontend tests
* migration validation
* secret scanning
* dependency vulnerability checks where practical

Pin package manager and runtime versions.

Avoid CI commands that differ materially from documented local commands.

---

## 40. Test Markers and Categories

Separate tests by speed and external requirements.

Suggested categories:

```text
unit
integration
database
data
ml
scenario
frontend
e2e
slow
external-smoke
```

Normal pull-request checks should run fast and deterministic tests.

Slow model evaluation and live external smoke tests may run separately.

---

## 41. Coverage Expectations

Coverage percentage is not the only quality measure.

Prioritize coverage for:

* data validation
* identity resolution
* temporal split logic
* feature generation
* artifact loading
* minutes allocation
* team-impact calculations
* win conversion
* API contracts
* scenario explanations

Do not write meaningless tests solely to increase coverage.

---

## 42. Regression Testing

Every confirmed bug should produce a regression test when practical.

The regression test should:

* reproduce the original failure
* fail before the fix
* pass after the fix
* document the expected behavior

Recurring data-source failures should produce contract fixtures and adapter tests.

---

## 43. Test Failure Policy

Do not:

* delete tests merely because they fail
* weaken assertions without justification
* skip validation to make tests pass
* mark flaky tests ignored indefinitely
* use broad exception catching to hide failures
* replace missing values with fabricated data

When a test is genuinely obsolete, update it in the same change as the approved behavior change.

---

## 44. Continuous Integration Gates

A pull request should not be considered ready when required checks fail.

Initial required gates should include:

* lint
* type checking
* unit tests
* integration tests
* migration checks
* critical scenario tests

End-to-end tests may become required once the first complete scenario loop exists.

---

## 45. Manual Review Checklist

Before merging a significant change, manually verify:

* the feature matches the requirement
* assumptions are labeled correctly
* numerical outputs are plausible
* errors are understandable
* documentation is current
* no unrelated files changed
* no secrets were committed
* no arbitrary constants were added without explanation
* no live external dependency was introduced into tests
* the final diff is reviewable

---

## 46. Definition of Done

A change is complete only when:

* the requested behavior works
* relevant automated tests exist
* required tests pass
* linting passes
* type checking passes
* migrations are included where needed
* API contracts are updated
* model and data versions remain traceable
* failure paths are tested
* logs are sufficient
* documentation is updated
* assumptions remain explicit
* the final diff is reviewed

---

## 47. Initial Critical Test Set

Before polishing the application, the project should have tests proving:

```text
historical data is canonicalized correctly
temporal leakage is blocked
baseline models run
model artifacts are versioned
a roster swap is validated
minutes total exactly 240
removed players receive zero minutes
scenario output is deterministic
win conversion is versioned
explanations map to calculated factors
the full Roster Lab workflow works end to end
```
