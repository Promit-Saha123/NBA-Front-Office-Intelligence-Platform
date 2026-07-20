# Workflow: Review a Pull Request

## Objective

Verify that a change meets this project's correctness, honesty, and architecture
standards before merge.

## Prerequisites

* The change has a reviewable diff and a stated purpose
* CI checks (once configured) have run

## Inputs

* The pull request diff and description
* [CLAUDE.md](../CLAUDE.md) rules and relevant docs under [docs/](../docs/)

## Steps

1. Confirm the change matches its stated requirement — no unrelated files, rewrites,
   or dead code.
2. Check architecture boundaries: thin routes, logic in services, data access in
   repositories, no core calculations in frontend components, migrations included
   for schema changes.
3. Check epistemic honesty: model predictions, heuristic assumptions, deterministic
   calculations, and descriptive interpretations remain correctly labeled; no
   unsupported basketball claims; no arbitrary fit constants.
4. Check data and ML rules where touched: raw snapshots preserved, no temporal
   leakage, versioned artifacts not overwritten, no live external APIs in tests.
5. Check tests: appropriate to the change, deterministic, and failure paths covered;
   no weakened or deleted assertions without justification.
6. Check security: no secrets, parameterized database access, validated input, no
   stack traces exposed.
7. Confirm documentation and decision records were updated where the change requires
   it (see CLAUDE.md Decision Records triggers).
8. For scenario-engine changes, additionally verify: minutes total exactly 240,
   model and data versions present, heuristic status visible, explanations match
   calculated factors.

## Validation Checks

* Every item in the CLAUDE.md Definition of Done holds for this change.
* Required CI gates pass; failures are explained and fixed, not bypassed.

## Expected Outputs

* An approval, or concrete change requests referencing the violated rule or document

## Stopping Conditions

* Stop and request changes if any Definition of Done item fails.
* Stop and escalate if the change contradicts an approved decision record without a
  superseding record.
