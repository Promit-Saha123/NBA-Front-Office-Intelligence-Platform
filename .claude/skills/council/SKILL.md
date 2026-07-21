---
name: council
description: Runs the Claude Council — five independent advisor subagents (Contrarian, First Principles Thinker, Expansionist, Outsider, Executor) with anonymized peer review and a Chairman synthesis. Invoke ONLY when the user says "Ask the council" or explicitly requests a Council review. Never trigger automatically.
disable-model-invocation: true
---

# Claude Council

A structured multi-perspective review run entirely inside Claude Code using
Claude subagents. No external models, no external APIs, no API keys.

Adapted from Andrej Karpathy's LLM Council concept and Ole Lehmann's
five-advisor variant; peer-review anonymization pattern adapted from
ngmeyer/council-review (MIT).

## Invocation

Run ONLY when the user explicitly says "Ask the council" or clearly requests a
Council review. Never self-invoke, never run as part of another task.

The council question is `$ARGUMENTS` (or the user's stated question).

## Workspace context limits (mandatory)

- Read only the minimum context needed to answer the question.
- Priority order: CLAUDE.md → relevant approved ADRs in `docs/decisions/` →
  relevant specification documents → files the user explicitly named.
- NEVER automatically read: `.env*`, credentials, API keys or tokens, raw
  datasets (`data/`), model artifacts, database files or dumps, dependency
  directories (`node_modules/`, `.venv/`), build outputs, unrelated
  documentation, or previous Council transcripts.
- In the final output, list exactly which files were read.
- Do not modify any file unless the user separately and explicitly requests it.
- Do not execute shell commands automatically. If a fact requires running a
  command, state the assumption instead and note what command would confirm it.
- Do not persist Council transcripts to disk unless the user asks. The verdict
  lives in the conversation only.

## Procedure

### Round 1 — Independent analysis (parallel, no cross-talk)

Launch five subagents IN PARALLEL via the Task tool (subagent_type:
general-purpose). Each receives: the question, the same minimal context bundle
(assembled once by the orchestrator under the limits above), and its persona
brief only. No advisor sees another advisor's output in this round. Each
advisor must return a self-contained analysis (≤500 words) ending with its
single strongest claim and its single biggest uncertainty.

Personas:

1. **The Contrarian** — hunts for the fatal flaw. Assume the proposal fails
   two years from now: what killed it? Attack the strongest part, not the
   weakest. Use inversion.
2. **The First Principles Thinker** — asks whether this is even the right
   problem. Decompose to fundamentals; rebuild from what is actually true,
   ignoring convention and sunk cost.
3. **The Expansionist** — finds the upside everyone is missing. What if it
   works better than expected? What adjacent opportunity does this unlock?
4. **The Outsider** — reacts with zero domain context. Reads only what is in
   front of them; asks the naive questions experts stopped asking. Catches the
   curse of knowledge.
5. **The Executor** — only cares whether it can actually be done. Dependency
   order, fastest credible path, what you do Monday morning.

### Round 2 — Anonymized peer review

The orchestrator strips all persona labels from the five analyses, shuffles
them, and relabels them Response A–E. Launch five review subagents (or reuse
the personas without telling them which response was theirs). Each reviewer
ranks A–E for insight and rigor, flags the strongest point and weakest point
of each, and must NOT try to guess authorship.

### Round 3 — Chairman synthesis

A final subagent (the Chairman) receives the five original analyses, the five
anonymous reviews, and the question. The Chairman produces the verdict in
exactly this format:

```
## Council Verdict
**Question:** <restated>

**Where the Council agrees:** high-confidence signals.
**Where the Council clashes:** genuine disagreements, both sides, and why
reasonable advisors differ.

**Final verdict:** the Chairman's recommendation, stated plainly.
**Primary blind spot:** the single most important thing the user is not seeing.
**Actionable next step:** one concrete step to take first, with a verification
check.

**Files read:** <exact list, or "none">
**Labels:** Council output is structured deliberation by Claude subagents —
descriptive interpretation, not a model prediction and not established fact.
```

### Project-specific guardrails (NBA Intelligence Platform)

- Respect CLAUDE.md claim rules: never present Council opinions as validated
  basketball or statistical truth.
- Never recommend bypassing temporal-leakage protections, data licensing
  constraints, migrations, or the 240-minute rotation invariant.
- If the question conflicts with an approved decision record, say so instead
  of silently overriding it.
