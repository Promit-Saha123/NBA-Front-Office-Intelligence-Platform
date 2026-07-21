# 0006 — Historical PCE Data Source

**Status:** Proposed — **deferred by
[decision 0007](0007-fully-free-historical-prototype.md)** (2026-07-20): the
initial release follows the fully free path, so the two-track outreach and any
purchase are optional future work, reopened only after the free historical
product is complete. No source is approved by this record; the research and
licensing findings below remain valid.

Evidence labels: **[verified]**, **[inference]**, **[unresolved]** as in decisions
0001–0005.

## 1. Context

The product is historical-only ([decision 0005](0005-historical-only-product-scope.md)):
the source needs no current coverage, refreshes, or live endpoints, but must
support — or clearly define restrictions on — a publicly deployable, free,
historical portfolio application displaying **derived** PCE outputs. Candidates
were researched 2026-07-19/20 across all required categories; the full scored table
with primary-source citations is
[data-source-evaluation.md §5c](../data-source-evaluation.md).

## 2. Candidates Considered

Ten candidates/classes: BigDataBall; stats.nba.com via `nba_api`; the
NocturneBear GitHub archive; a TU Wien research deposit; dougstats.com; the Kaggle
re-upload family; sports-statistics.com / hoopR releases; the FiveThirtyEight
CC BY 4.0 pair (RAPTOR + nba-elo); Sportradar; Sports Reference custom licensing.

## 3. Audits Performed

No new downloads were permitted this round — every newly examined candidate has
unresolved or invalid rights [verified per candidate, §5c]. Existing audited
snapshots (both CC BY 4.0, pinned, checksummed): RAPTOR
([audit](../data-audits/fivethirtyeight-raptor-audit.md)) and nba-elo
([audit](../data-audits/fivethirtyeight-nba-elo-audit.md)). Checksums re-verified
2026-07-20: all match [verified].

## 4. Rejected Candidates

* **NocturneBear/NBA-Data-2010-2024** — field-complete game-level box scores
  2010–2024, but the repo's MIT label cannot license its NBA-Stats-derived data
  (schema uses NBA `personId`/`teamId`) [verified].
* **TU Wien deposit** — CC BY 4.0 label is a two-hop invalid chain (deposit ←
  Kaggle re-upload ← NBA data), and it sits on a test instance that warns uploads
  "may be deleted" [verified].
* **dougstats.com** — no license stated; no demonstrable redistribution authority
  [verified homepage; disclaimer unreviewed].
* **Kaggle family, sports-statistics.com, hoopR** — class-level rejection
  unchanged by the historical-only scope: uploader/repackager labels cannot
  license NBA- or ESPN-derived data [verified, 0001/0004].

## 5. Unresolved Candidates

* **BigDataBall** — T&C verified 2026-07-20: *"only for your personal,
  non-commercial use"*, no commercial use, no resale, one copy on a single
  device; **silent** on ML training, derived metrics, and public display
  [verified]. A free portfolio app is non-commercial, but "personal use" +
  single-device copies make public deployment of even derived outputs unclear
  [inference]. Historical season files are one-time purchases with no stated
  expiration [verified product page; perpetuity inference].
* **stats.nba.com via `nba_api`** — ToU §9(ii) restricts NBA Statistics to news
  or private non-commercial use; §9(vii) targets "regularly updated" statistical
  databases, which a frozen historical product is not — the consent ask is now
  narrower (frozen snapshot, derived-metric display) but consent is still needed
  for public deployment [verified clauses; application inference].
* **Sportradar** — technically complete; AI/ML clause and custom pricing need
  negotiation; deprioritized on cost for a portfolio-scale historical product
  [verified clause; cost inference].
* **Sports Reference custom** — ≥$5,000 plus ML-permission negotiation; dominated
  by cheaper paths [verified policy].

## 6. Viable Options and Recommended Path

* **Viable free option:** stats.nba.com **with NBA consent** — free,
  field-complete 1946+ (advanced 1996+), possessions/ratings included. Without
  consent it supports only private, non-deployed development [inference reading
  of §9(ii); unresolved].
* **Viable paid option:** **BigDataBall with written permission** — one-time
  ~$30–40/season/dataset, game-level player + team data 2002-03+, possessions
  derivable (play-by-play available), estimated **$1,200–$1,600** for 20 seasons
  of player + team files [verified prices; total inference].

**Recommended path (two tracks in parallel, prototype continues meanwhile):**

1. **Track P (paid, primary):** send BigDataBall a written scope inquiry —
   (a) ML/statistical-modeling use, (b) retention of derived metrics,
   (c) public display of derived outputs in a free, non-commercial historical
   portfolio app, (d) public code with private data, (e) confirmation historical
   purchases are perpetual. Purchase **only after** written confirmation.
2. **Track F (free, parallel):** send the NBA consent inquiry, re-scoped to a
   frozen historical database with derived-metric display.
3. **Meanwhile:** continue the permitted CC BY 4.0 prototyping stage (0004 §5 /
   0005 §4) with synthetic box-score fixtures.

Decision standard applied: BigDataBall leads because a modestly priced, clearly
scoped written permission would give complete fields, true possessions, stable
snapshots, and ~24-season depth; a slightly shallower range (2002-03+) under
clear rights beats richer-but-ambiguous alternatives [per decision standard].

## 7. Season Range and First Deployable Season

* **Minimum:** 10 consecutive seasons (~300 team-season observations) for pooled
  fitting, stability windows, and ≥3 rolling prediction folds [inference].
* **Recommended:** 20 seasons, e.g. **2002-03 through 2021-22** (BigDataBall
  range; ~600 team-seasons; supports coefficient-stability windows, ≥5 rolling
  folds, and an untouched final block) [inference].
* **Suggested first deployable scenario season: 2015-16** — modern era, complete
  stint data, inside the RAPTOR benchmark window (through 2022) for methodology
  comparison [inference].

## 8. PCE Feasibility and Remaining Compromises

With either track resolved, all six requirements are supported: historical PCE
construction, stability validation, next-season model training, rolling
backtests, same-season scenarios, and public historical deployment [inference].
**PCE remains technically infeasible from currently held data** (no box-score
fields) [verified].

Remaining methodological compromises: thin public defensive information (inherent
to box scores); possession estimation needed if play-by-play is not purchased;
franchise relocation mapping required across 20 seasons; identifier crosswalk
(source IDs → internal IDs) still to be built; pre-2002 eras out of scope under
Track P [all inference].

## 9. Questions Requiring Owner Approval

1. Approve **sending** the BigDataBall written-scope inquiry (I will draft it;
   you send it)?
2. Approve **sending** the narrowed NBA consent inquiry (same arrangement)?
3. Confirm budget approval in principle for ~$1,200–$1,600 **contingent** on
   satisfactory written permission from BigDataBall?
4. Confirm the recommended 2002-03–2021-22 target range and 2015-16 first
   deployable season, subject to the chosen source?

## 10. Re-evaluation Triggers

* Either inquiry is answered (positively or negatively).
* A clearly licensed historical box-score dataset with genuine authority appears.
* Prices, terms, or NBA ToU change materially.
* Prototyping shows the 2002-03+ depth or possession-estimation approach is
  insufficient for credible PCE validation.
