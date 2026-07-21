---
name: ml-rules
description: Mandatory machine-learning rules for this project. Use BEFORE any work involving PCE, features, feature generation, training, baselines, XGBoost, model evaluation, backtests, projections, model artifacts, or inference.
---

# Machine Learning Rules

The approved future target is the next-season **Player Contribution Estimate
(PCE)** — an internally computed player-contribution metric with statistically
learned coefficients (decision 0003; initial version `pce-v1`). PCE is a
statistically estimated metric calculated deterministically from fixed, versioned
coefficients. Do not describe PCE as causal, official, definitive, or equivalent
to BPM, RAPTOR, EPM, or another established metric.

**The first release ships no trained model** (decision 0007): contribution values
come from the provider abstraction (RAPTOR benchmark / synthetic), clearly
labeled, and PCE work begins only when its historical box-score source is
approved. These ML rules govern that future phase.

One training row represents one player during one completed season.

Before training XGBoost, establish simple baselines such as:

* previous-season PCE
* multi-season average PCE
* linear regression

A complex model is only better if it outperforms reasonable baselines in time-respecting evaluation.

Never use target-season or future information in features.

Do not use random row-level splitting as the primary validation method.

Use season-based validation or rolling backtests:

```text
Train through season N
→ predict season N+1
```

Training and inference must use the same feature-generation code.

Every model artifact must include:

* model version
* data version
* target definition
* feature list
* hyperparameters
* evaluation results
* training date
* artifact location
* code commit where available

Never overwrite an existing model artifact.

Detailed requirements live in:

```text
docs/ml-specification.md
```
