---
name: testing-rules
description: Mandatory testing rules for this project. Use when writing or reviewing tests, deciding test coverage for a change, or completing any task's Definition of Done test requirements.
---

# Testing Rules

A change is not complete because it ran successfully once.

Add tests appropriate to the change.

At minimum, protect:

* API contracts
* database behavior
* data validation
* identity resolution
* temporal leakage
* feature-schema consistency
* model artifact loading
* deterministic inference
* 240-minute enforcement
* removed-player handling
* impossible rotations
* assumption metadata
* frontend loading and error states
* scenario result rendering

At least one end-to-end test must cover:

```text
Select team
→ remove player
→ add player
→ run scenario
→ display valid result
```

Detailed requirements live in:

```text
docs/testing-strategy.md
```
