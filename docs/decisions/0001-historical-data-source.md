# 0001 — Historical Data Source for the Next-Season BPM Model

**Status:** Accepted (recorded 2026-07-19)
**Decision:** **No historical source is currently approved for the next-season BPM
target.**

> **Status update (2026-07-19):** the "model target changes via an approved decision
> record" re-evaluation trigger has fired —
> [decision 0003](0003-internal-player-impact-target.md) replaced the BPM target
> with the internally computed Player Contribution Estimate (PCE), in part because
> of this record's finding that no legally usable BPM source exists without a paid
> license the owner declined to pursue. This record is preserved unchanged below as
> the history of the BPM-era search; its licensing findings remain in force. The
> successor source search (box-score + team-outcome inputs for PCE) is defined in
> [data-source-evaluation.md §1](../data-source-evaluation.md) and remains
> unresolved.

## Context

Slice 1 requires an audited historical player-season dataset whose fields include, or
defensibly support deriving, Box Plus/Minus — the initial model target fixed by
[ml-specification.md §2](../ml-specification.md). The audit workflow
([workflows/audit-data-source.md](../../workflows/audit-data-source.md)) was executed
on 2026-07-19 against five candidates, with gating criteria: BPM availability, enough
consecutive seasons for rolling backtests, canonicalizable player-season rows, usable
identifiers, sufficiently clear licensing/provenance/redistribution rights, pinnable
snapshots, documented latest season, and understood missingness/traded-player
handling. Full evidence: [data-source-evaluation.md](../data-source-evaluation.md) §5
and [data-audits/](../data-audits/).

## Candidates Considered and Outcomes

### A. Kaggle "NBA Stats (1947-present)" (sumitrodatta/nba-aba-baa-stats) — rejected

Provenance is the uploader's own scrape of Basketball-Reference. The Kaggle license
label ("CC0: Public Domain", read from the page's own metadata) is an invalid grant —
the uploader cannot license data they collected under Sports Reference's terms. Those
terms (clause 5, read verbatim from a 2026-07-18 Internet Archive copy of
sports-reference.com/data_use.html; the live page blocks automated retrieval) prohibit
using site content *"for purposes of training, fine-tuning, prompting, or instructing
artificial intelligence models … including … supporting machine learning methods used
to predict, classify, label, or score inputs"* and prohibit competing statistical
databases. Training a BPM prediction model is precisely the prohibited use. Under the
workflow's stopping condition the dataset was never downloaded; its BPM claim remains
unverified and moot.

### B. stats.nba.com via `nba_api` — rejected for this product without NBA consent

NBA.com Terms of Use §9 (fetched directly, 2026-07-19) restrict NBA Statistics to
"legitimate news reporting or private, non-commercial purposes" and prohibit use "in
connection with any website, product, or service that features a database … of
comprehensive, regularly updated statistics" without the Operator's express prior
consent — which describes this platform. Independently, stats.nba.com does not
publish BPM; deriving it would require validating against Basketball-Reference's BPM
values, which candidate A's rejection shows we cannot legally obtain. Fails gates 1
and 5.

### C. FiveThirtyEight `nba-raptor` — not selected; fallback candidate

The only candidate with clean licensing: CC BY 4.0 (LICENSE file verified at pinned
commit `6d9b3277a3dc8ecd74bdef7a4f48da5bb1297bb4`), published by the metric's own
creator, 46 gapless seasons (1977–2022), stable Basketball-Reference-format IDs, zero
duplicate canonical keys, explicit traded-player representation. Full audit:
[fivethirtyeight-raptor-audit.md](../data-audits/fivethirtyeight-raptor-audit.md).

**Why it is still not selected:** it fails gating criterion 1 — BPM is absent and not
derivable from RAPTOR data. Selecting it as the production training source would
implicitly change the model target, and per CLAUDE.md the model target may only change
through its own explicitly approved decision record. That approval is deliberately
**not** given here. Additional material risk even under a changed target: the dataset
is frozen at 2021-22 and its publisher no longer exists, so the metric can never be
computed for later seasons without rebuilding the methodology.

**Interim standing:** *Permitted and structurally suitable for pipeline prototyping,
but not approved as the production training source for the current BPM objective.*
It may be used to build and test ingestion, manifests, canonicalization, identity
crosswalks, and temporal-split scaffolding, with CC BY 4.0 attribution.

### D. FiveThirtyEight `nba-player-advanced-metrics` — rejected

Carries the box-score rate columns C lacks, but the repository has **no license file**
(GitHub API: `license: None`), so redistribution and derived-work rights are
unresolved. Also degraded: many columns absent from 2019-20 onward. Fails gate 5.

### E. Sports Reference custom data licensing — unresolved, not pursued

The only identified path to genuine, licensed BPM: SR's stated policy offers custom
datasets at a minimum of $5,000, and their AI/ML-training prohibition would still
require explicit contractual permission for model training. Viable only with budget
and negotiation; no request has been made.

## Consequences

* Slice 1 model training **does not start** until either a BPM source with confirmed
  permission exists or the target is changed by an approved decision record.
* Pipeline work that does not depend on the target (canonical schema, ingestion,
  manifests, identity crosswalk, temporal-split scaffolding) may proceed against the
  pinned FiveThirtyEight snapshot
  (`data/raw/fivethirtyeight-nba-raptor/2026-07-19/`, data version
  `fivethirtyeight-nba-raptor-2022-11-29`).
* Any regular-season target derived later from this snapshot must come from the
  by-team files (`season_type == "RS"`), because the by-player files blend regular
  season and playoffs (verified in the audit).
* The evaluation record and this ADR must be updated if any candidate's terms change.

## Next Research Direction

In priority order:

1. **Propose a model-target decision** (separate ADR, requires explicit owner
   approval): next-season RAPTOR — or an internally computed, openly reproducible
   impact metric — instead of BPM, weighing the frozen-at-2022 limitation against
   licensing reality.
2. **Contact Sports Reference** for a quoted custom license covering BPM history and
   explicit ML-training permission (≥$5,000 expected).
3. **Investigate openly licensed play-by-play / box-score sources** capable of
   supporting an internally derived impact metric with documented provenance
   (evaluate each against the same eight gates before use).

## Re-evaluation Triggers

* The model target changes via an approved decision record.
* Sports Reference grants (or newly refuses) a usable license.
* NBA consent is obtained for a statistics-database product, or NBA terms change.
* A new candidate appears with BPM (or an equivalent target) under clear licensing.
* Licensing terms of any evaluated candidate materially change.
