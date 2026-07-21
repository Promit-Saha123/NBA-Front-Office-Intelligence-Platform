---
name: scenario-rules
description: Mandatory scenario-engine and explainability rules for this project. Use BEFORE any work involving the roster scenario engine, minutes allocation, rotations, player swaps, win conversion, contribution aggregation, scenario endpoints/responses, or generated explanations.
---

# Scenario Engine Rules

The v1 minutes engine is a **heuristic assumption engine**, not a rotation-prediction model.

Do not present unvalidated weights or rules as established basketball truth.

The engine must enforce:

* exactly 240 regulation minutes
* no negative minutes
* removed players receive zero minutes
* only rostered players receive minutes
* player workload limits
* a valid rotation
* basic positional viability

The first scenario should support one player added and one player removed.

For a fixed combination of:

* roster input
* data version
* model version
* minutes method
* configuration

the result must be deterministic.

Scenario responses must expose:

```text
model_version
data_version
minutes_method
minutes_assumptions
```

Editable minutes belong after the automatic scenario loop works.

Do not apply arbitrary fit bonuses or penalties to projected wins.

In v1, shooting, playmaking, rebounding, defensive activity, availability, and positional balance are descriptive profile outputs unless an empirically evaluated model says otherwise.

Detailed methodology lives in:

```text
docs/scenario-engine.md
```

## Explainability

Every explanation must be traceable to calculated values.

Acceptable:

```text
Three-point volume increased while defensive rebounding declined.
```

Unacceptable:

```text
The incoming player adds championship leadership and winning mentality.
```

An LLM may rewrite verified analytical factors into clearer prose, but it must not create new basketball claims.

Preserve the underlying factors used to generate every explanation.

Use this label where appropriate:

> Heuristic scenario profile, not a validated causal fit model.

## Scenario-engine Definition of Done

For scenario-engine changes, also verify:

* minutes total exactly 240
* model and data versions are present
* heuristic status is visible
* explanations match calculated factors
* no arbitrary fit constant was introduced
