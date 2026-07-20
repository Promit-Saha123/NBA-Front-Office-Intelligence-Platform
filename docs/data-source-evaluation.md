# Data Source Evaluation

**Status: historical data source not yet selected.**

This document is the required evaluation record for choosing the historical
player-season data source. It must be completed and paired with a decision record in
[decisions/](decisions/) before ingestion begins. No candidate below is approved yet.

> ⚠️ **Do not scrape Sports Reference properties (Basketball-Reference and related
> sites) without confirmed permission.** Their terms restrict automated collection, and
> a third-party redistribution (e.g., a Kaggle dataset) does not override the original
> source's rights. Any use requires documented, confirmed permission or a clearly
> licensed alternative.

`nba_api` is treated only as a replaceable data-source adapter behind an internal
interface — never as the system of record, and never as a live dependency of automated
tests.

---

## 1. Required Fields

The selected source must contain, or support derivation of, the fields in
[ml-specification.md §5](ml-specification.md). The critical requirement is:

* **Box Plus/Minus (BPM)** — the initial model target; offensive and defensive BPM
  where available. A source without BPM (or a documented, reproducible way to derive
  it) cannot be the primary source without an approved decision changing the target.

Also required or derivable:

* identity and season fields (source player ID, name, season, team, age, position)
* playing time (games played, games started, total minutes, minutes per game)
* scoring and efficiency (points, FGA, 3PA, FTA, TS%, eFG%, usage rate)
* playmaking (assists, turnovers, AST%, TOV%)
* rebounding (ORB%, DRB%, TRB%)
* defensive activity (steals, blocks, STL%, BLK%)
* multi-season impact history (prior-season BPM values)

Record here, per candidate, which fields are present, derivable, or missing.

## 2. Historical Coverage Requirements

Document for each candidate:

* seasons covered (rolling backtests need enough consecutive seasons for multiple
  train-through-season-N → predict-season-N+1 folds)
* completeness within covered seasons (all players vs. minutes cutoffs)
* handling of traded players (total-season rows vs. per-team rows)
* update cadence for the latest completed season

Minimum acceptable coverage: _to be determined during evaluation_.

## 3. Identifier Compatibility

* What stable player identifier does the source provide?
* Is it stable across seasons and team changes?
* Can it be crosswalked to other candidate sources' identifiers?
* How are duplicate names, suffixes (Jr., III), and accented characters handled?

Names must never be primary identifiers.

## 4. Licensing and Provenance

For each candidate, document:

* original data producer and chain of redistribution
* license or terms of use, quoted or linked
* whether automated retrieval is permitted
* whether storage and derived-work publication are permitted
* attribution requirements

A third-party license does not override the original source's rights.

## 5. Candidate-Source Comparison

| Criterion | Candidate A | Candidate B | Candidate C |
|---|---|---|---|
| Name / provider | _TBD_ | _TBD_ | _TBD_ |
| BPM available | | | |
| Required fields coverage | | | |
| Seasons covered | | | |
| Stable player identifier | | | |
| License permits this use | | | |
| Retrieval method | | | |
| Traded-player representation | | | |
| Maintenance / reliability | | | |
| Risks | | | |

Candidates will be enumerated during the audit workflow
([workflows/audit-data-source.md](../workflows/audit-data-source.md)); none are named
here to avoid implying pre-approval.

## 6. Raw-Data Preservation

Regardless of source, every retrieved snapshot must be preserved unmodified with a
manifest recording:

* source
* retrieval date
* checksum
* license information
* data version
* code version where available

Raw source files are never overwritten; transformation always produces new outputs.

## 7. Player Identity Crosswalk Requirements

The canonical layer uses internal player and team identifiers with explicit source
crosswalks preserving:

```text
source
source identifier
internal identifier
match method
confidence
manual verification status
```

Ambiguous identity matches require review and must not be silently accepted.

## 8. Selection Outcome

_Not yet selected._ When a source is chosen, record the decision in
[decisions/](decisions/) with context, options considered, rationale, consequences,
and re-evaluation triggers, then update this document with the completed comparison
and the audit results from [data-audits/](data-audits/).
