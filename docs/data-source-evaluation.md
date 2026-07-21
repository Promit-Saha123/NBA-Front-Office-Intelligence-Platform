# Data Source Evaluation

**Status: the historical/current box-score + team-outcome source for PCE
construction is unresolved — no dataset is approved.** The original BPM-era
evaluation (completed 2026-07-19, no source approved; see
[decisions/0001-historical-data-source.md](decisions/0001-historical-data-source.md))
is preserved below as history. The model target has since changed to the Player
Contribution Estimate (PCE) per
[decisions/0003-internal-player-impact-target.md](decisions/0003-internal-player-impact-target.md),
which replaces the target-label requirement (§1) with the PCE input requirements.

This document is the required evaluation record for choosing the player-season data
source. No candidate below is approved as the production training source.

> ⚠️ **Do not scrape Sports Reference properties (Basketball-Reference and related
> sites) without confirmed permission.** Their terms restrict automated collection, and
> a third-party redistribution (e.g., a Kaggle dataset) does not override the original
> source's rights. Any use requires documented, confirmed permission or a clearly
> licensed alternative.

`nba_api` is treated only as a replaceable data-source adapter behind an internal
interface — never as the system of record, and never as a live dependency of automated
tests.

---

## 1. Required Fields (revised 2026-07-19 for the PCE target)

The target is now internally computed
([decision 0003](decisions/0003-internal-player-impact-target.md)), so no external
target label is required. Instead, the selected source must contain, or support
derivation of, the **PCE construction inputs**. (The original requirement — BPM as
an externally sourced target — was superseded by decision 0003 after the BPM-era
search ended with no approved source.)

Required:

* stable player IDs
* stable team IDs
* season
* team stints for traded players (per-team rows or reconstructable stints)
* games
* minutes
* points
* field-goal attempts
* three-point attempts
* free-throw attempts
* assists
* turnovers
* offensive and defensive rebounds (total rebounds acceptable where necessary)
* steals
* blocks
* team possessions, or the inputs needed to derive possessions
* team offensive rating
* team defensive rating
* team net rating, or the inputs needed to derive it
* historical coverage across consecutive seasons (enough for coefficient learning
  plus rolling backtests)
* clear provenance
* clear license and redistribution rights

**Current-season coverage and a future refresh path are no longer required**
([decision 0005](decisions/0005-historical-only-product-scope.md) — historical-only
product). The supported product season range will be fixed by the approved source's
coverage and displayed in the product.

Desirable: games started, usage rate, rate versions of counting stats, position,
age, team wins (win-conversion calibration), regular-season/playoff separation.

Record here, per candidate, which fields are present, derivable, or missing.

## 2. Historical Coverage Requirements

Document for each candidate:

* seasons covered (rolling backtests need enough consecutive seasons for multiple
  train-through-season-N → predict-season-N+1 folds)
* completeness within covered seasons (all players vs. minutes cutoffs)
* handling of traded players (total-season rows vs. per-team rows)
* the source's historical cutoff (which fixes the product's supported season
  range — no update cadence is required, per decision 0005)

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

## 5. Candidate-Source Comparison (historical record — BPM-era evaluation)

> The table below records the evaluation conducted while next-season BPM was the
> approved target; its "Target (BPM) availability" row reflects that era. The
> licensing and provenance findings remain valid. New candidates for the PCE input
> search will be evaluated against §1 (revised) and added separately.

Evaluated 2026-07-19. Evidence classes: **primary** = terms/data/license inspected
directly (including a one-day-old Wayback Machine copy of Sports Reference's policy
page, since the live page blocks automated retrieval); **secondary** = publisher's own
description not independently verified; **inference** = reasoned, not confirmed.

| Criterion | A: Kaggle "NBA Stats (1947-present)" (sumitrodatta) | B: stats.nba.com via `nba_api` | C: FiveThirtyEight `nba-raptor` | D: FiveThirtyEight `nba-player-advanced-metrics` | E: Sports Reference custom licensing |
|---|---|---|---|---|---|
| Target (BPM) availability | Claimed present (secondary; never downloaded) | Absent; derivation would need validation against B-R values we cannot legally obtain (inference) | **Absent** — RAPTOR/WAR/PREDATOR only (primary) | Absent — RAPTOR + box-score rates, no BPM (secondary: README) | Present — B-R is BPM's home (primary) |
| Historical coverage | Claimed 1947–present (secondary) | 1946–present, advanced fields shallower (inference) | **1977–2022, 46 seasons, no gaps (primary)** | 1977–2022; many columns absent 2019-20+ (secondary: README) | Full history (primary) |
| Identifier quality | B-R IDs claimed (secondary) | NBA person IDs (inference) | B-R-format `player_id`, 0 blanks, 0 dup keys (primary) | B-R `player_id` (secondary) | B-R IDs (primary) |
| Provenance | Scrape of Basketball-Reference by an individual uploader (secondary: uploader's own description) | Official NBA source (primary) | Published by the metric's creator, FiveThirtyEight (primary) | FiveThirtyEight repo, provenance of box-score rates undocumented (primary: repo inspected) | The original producer (primary) |
| License / redistribution | Uploader label "CC0: Public Domain" (primary: page metadata) — **invalid grant**: uploader cannot license scraped SR data; SR ToU cl. 5 prohibits ML-training use (primary: archived terms) | ToU §9: news/private non-commercial only (ii); no "database of comprehensive, regularly updated statistics" product without express consent (vii) (primary) | **CC BY 4.0, attribution required (primary: LICENSE file at pinned commit)** | **No license file** (primary: GitHub API `license: None`) — reuse rights unresolved | Paid custom dataset, ≥$5,000 minimum; AI/ML-training prohibition would still need explicit negotiation (primary: archived policy page) |
| Operational reliability | Kaggle re-upload cadence, single maintainer | Live undocumented endpoints, schema drift risk | Static files at pinned commit; fully reproducible | Static; last pushed 2020 | Contract-dependent |
| Current-season suitability | Depends on uploader | Yes (official, live) | **No — frozen at 2021-22, publisher defunct** | No — frozen, degraded 2019-20+ | Yes, by contract |
| Decision status | **Rejected** (licensing) | **Rejected** for this product without NBA consent (licensing + no BPM) | **Not selected**; fallback candidate — permitted for pipeline prototyping only | **Rejected** (no license) | **Unresolved** — viable only via paid negotiated permission |
| Supporting evidence | Kaggle page JSON-LD; archived SR terms 2026-07-18 | NBA.com ToU fetched directly 2026-07-19 | LICENSE + data at commit `6d9b327`; [audit](data-audits/fivethirtyeight-raptor-audit.md) | GitHub API + README | Archived SR data-use page 2026-07-18 |

Notes:

* Candidate A was **not downloaded**: the audit workflow's stopping condition
  ("stop immediately if licensing does not clearly permit the intended use") applied
  before retrieval. Its BPM claim therefore remains unverified — and moot.
* The archived SR policy page (snapshot 2026-07-18) contains **no** "sharing is
  welcomed with credit" language; older versions apparently did, current terms are
  stricter. A human should confirm the live page in a browser once.
* No Sports Reference property was scraped; only SR's *policy page* was retrieved,
  via the Internet Archive.

## 5b. PCE-Era Candidate Comparison (evaluated 2026-07-19/20)

Candidates for the PCE input requirements in §1 (revised). Evidence classes as in
§5. Statuses: **meets / partially meets / rejected / unresolved**. No candidate is
approved; see
[decisions/0004-pce-data-source-options.md](decisions/0004-pce-data-source-options.md).

> **Scoring note (2026-07-20):** this table predates
> [decision 0005](decisions/0005-historical-only-product-scope.md). The "Latest
> season" and "Future refresh path" columns are **no longer scoring criteria**
> (historical-only product); frozen datasets and one-time purchases are now
> viable. Licensing and field findings remain valid. Candidates will be re-scored
> in the historical-only search.

| Candidate | Player-stat coverage | Team-outcome coverage | Historical depth | Latest season | Stable IDs | Traded-player stints | Licensing clarity | ML-use permission | Redistribution rights | Reproducibility | Future refresh path | Expected cost | Decision status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **A. stats.nba.com via `nba_api`** | Full box scores; game logs; advanced since 1996-97 (inference) | Ratings, possessions, wins (inference) | 1946–present (inference) | Current (verified — live official source) | NBA person/team IDs (verified pattern) | Per-game logs → stints derivable (inference) | Terms verified; restrictive (verified) | §9(ii) private non-commercial only; §9(vii) bars stat-database products without consent (verified) | Not granted (verified) | Pinned snapshots possible (verified capability) | Official, ongoing (verified) | Free; consent unknown | **Unresolved** — hinges on product intent + NBA consent |
| **B. Sportradar official API** | Full (verified — product docs) | Full (verified) | Deep archive (inference) | Current (verified) | Provider IDs (verified) | Game-level → derivable (inference) | Contract-based, clear (verified) | T&C restricts using outputs to train AI/ML models — scope over raw feeds ambiguous (verified clause; scope unresolved) | Contract-dependent (unresolved) | High (contracted) | High (official) | 30-day free trial; production custom quote (unresolved) | **Unresolved** — needs quote + written ML-clause clarification |
| **C. BigDataBall** | Player game data 2002-03+ (verified — product page) | Team game data 2002-03+ (verified) | 2002-03+ (~24 seasons) (verified) | 2025-26 (verified) | Own IDs (inference) | Game-level rows (inference) | "For personal use" footer; full terms not reviewed (verified quote; scope unresolved) | Unresolved | Unresolved | CSV snapshots — good (verified format) | Active seasonal sales (verified) | ~$30–70/season; est. $700–$1,500 for player+team history | **Unresolved** — needs written scope clarification |
| **D. balldontlie API** | Box stats (verified) | Partial (verified) | 1946+ claimed (inference) | Current (verified) | Own IDs (verified) | Unclear (unresolved) | Aggregator; "not the original source"; upstream undisclosed (verified) | Not granted; storage/caching restricted "beyond reasonable application needs" (verified) | Expressly prohibited without permission (verified) | Poor — no snapshot rights (verified) | At-will termination (verified) | Free–$39.99/mo | **Rejected** — no storage/redistribution rights, opaque provenance |
| **E. sports-statistics.com** | Player game lines 2001-02+ (verified — page) | Partial (inference) | 2001-02+ (verified) | Latest completed season (verified) | Unknown (unresolved) | Unknown (unresolved) | **No license stated**; data "sourced from ESPN endpoints" (verified) | Unresolved | Unresolved — site cannot demonstrably relicense ESPN-derived data (inference) | Snapshots exist (verified) | Informal (inference) | Free | **Rejected** — no license, unverifiable authority |
| **F. Kaggle: eoinamoore box scores** | Full 1947+ incl. advanced from nba.com (verified — page description) | Team box scores (verified) | 1947+ (verified claim) | Current, nightly updates (verified claim) | Own/NBA IDs (inference) | Game rows (inference) | Uploader label "CC0" — invalid grant over NBA.com-derived data (verified label; invalid per NBA ToU) | Not grantable by uploader (verified reasoning as in 0001) | Not grantable (same) | Kaggle re-uploads (inference) | Single maintainer (inference) | Free | **Rejected** — uploader authority fails, NBA ToU governs |
| **G. Kaggle: wyattowalsh basketball** | Full from stats.nba.com (inference — known provenance; page label verified) | Yes (inference) | 1946+ (inference) | Recent (inference) | NBA IDs (inference) | Game rows (inference) | Uploader label "CC BY-SA 4.0" — invalid grant (verified label) | Not grantable (same reasoning) | Not grantable | Kaggle re-uploads | Single maintainer | Free | **Rejected** — same class as F |
| **H. FiveThirtyEight `nba-elo`** | **None** (verified) | Scores, wins, margins; **no possessions/ratings** (verified) | 1947–2015, no gaps (verified) | 2014-15 (in-repo file) (verified) | `team_id`+`fran_id`, 0 blanks (verified) | n/a (team-level) | **CC BY 4.0 (verified)** | Permitted (verified — CC BY) | Permitted with attribution (verified) | Pinned commit + checksums (verified — [audit](data-audits/fivethirtyeight-nba-elo-audit.md)) | None — frozen (verified) | Free | **Partially meets** — prototyping hybrid component only |
| **I. hoopR / sportsdataverse data releases** | Box scores 2002+ (verified — package docs) | Partial (inference) | 2002+ (verified claim) | Current (verified claim) | ESPN/NBA IDs (inference) | Game rows (inference) | Package MIT license ≠ license for ESPN/NBA-derived data (verified principle; upstream terms govern) | Not grantable by repackager (inference) | Not grantable (inference) | Parquet releases (verified) | Community-maintained (verified) | Free | **Rejected** for production — upstream rights unresolved |

Research notes — primary sources consulted (retrieved 2026-07-19/20):

* NBA.com Terms of Use §9 — https://www.nba.com/termsofuse (fetched directly 2026-07-19)
* balldontlie Terms — https://www.balldontlie.io/terms.html (fetched 2026-07-20)
* Sportradar developer T&C — https://developer.sportradar.com/sportradar-updates/page/terms-and-conditions (via search excerpt 2026-07-20; full contract not reviewed)
* BigDataBall product page — https://www.bigdataball.com/datasets/nba-data/ (fetched 2026-07-20)
* sports-statistics.com NBA page — https://sports-statistics.com/sports-data/nba-basketball-datasets-csv-files/ (fetched 2026-07-20)
* Kaggle page metadata (JSON-LD license labels) for eoinamoore and wyattowalsh datasets (fetched 2026-07-19/20)
* fivethirtyeight/data LICENSE + nba-elo at pinned commit `6d880e9` (downloaded 2026-07-20)

No restricted data was downloaded; the only new snapshot is the CC BY 4.0
`nba-elo` file.

## 5c. Historical-Only PCE Source Comparison (evaluated 2026-07-20)

Scored against §1 (revised) under
[decision 0005](decisions/0005-historical-only-product-scope.md): frozen datasets
and one-time purchases are viable; current coverage and refresh paths are not
criteria. "Public historical deployment permission" means: may derived PCE outputs
be displayed in a publicly deployed, free, historical portfolio application.
No candidate is approved; see
[decisions/0006-historical-pce-data-source.md](decisions/0006-historical-pce-data-source.md).

| Candidate | Source type | Player field coverage | Team field coverage | Seasons | Stable IDs | Team stints | Legal clarity | ML permission | Public historical deployment | Reproducibility | Cost | Technical gaps | Decision status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **BigDataBall** | Paid one-time historical CSVs | Full game-level player box scores (verified — product page) | Full game-level team data; possessions derivable, play-by-play available (verified) | 2002-03 – 2025-26 (verified) | Own IDs (inference) | Game rows → stints derivable (inference) | T&C verified: "only for your personal, non-commercial use"; one copy, single device; silent on ML/derived works/public display | Unresolved — not addressed in T&C | **Unresolved** — personal-use scope; needs written permission | High — static CSVs, checksummable (verified format) | ~$30–40/season/dataset; est. $1,200–$1,600 for 20 seasons player+team (verified prices; total inferred) | None material; ~24-season depth cap | **Unresolved** — leading paid option pending written permission |
| **stats.nba.com via `nba_api`** | Official live source (frozen snapshots possible) | Full (inference) | Full incl. possessions/ratings (inference) | 1946+; advanced 1996+ (inference) | NBA IDs (verified pattern) | Game logs → stints (inference) | ToU §9 verified: (ii) private non-commercial only; (vii) targets "regularly updated" databases — a frozen historical product weakens (vii) but (ii) still restricts public display of NBA Statistics (verified clause; application inference) | Unresolved | **Unresolved** — needs NBA consent; ask is now narrower (frozen, derived-metric display) | High via pinned snapshots | Free | None | **Unresolved** — free path via consent |
| **NocturneBear/NBA-Data-2010-2024 (GitHub)** | Community CSV archive | Full game-level player box scores incl. FGM/FGA/3P/FT, minutes (verified — README schema) | Team box scores (verified) | 2010–2024 (verified) | `personId`/`teamId` — NBA Stats identifiers (verified schema) | Game rows (verified) | MIT label on repo cannot license NBA-Stats-derived data (verified label; verified principle) | Not grantable (inference) | Not grantable (inference) | Static CSVs (verified) | Free | Depth 14 seasons | **Rejected** for production — no data authority |
| **TU Wien research deposit (Baltali)** | Academic repository record | Player-season aggregates, partial fields (verified — record page) | None stated (verified) | 2012-13 – 2023-24 (verified) | Player identifiers (verified claim) | Absent (inference) | CC BY 4.0 label, but provenance is a Kaggle re-upload and the host is a **test instance** ("Any data upload … may be deleted") (verified) | Not grantable (inference) | Not grantable (inference) | Poor — deletable test host (verified) | Free | Missing team outcomes, stints | **Rejected** — invalid two-hop license chain, unstable host |
| **dougstats.com** | Long-running personal compilation | Season/game player stats (verified site structure; fields not audited) | Partial (unresolved) | ~1987–present (inference) | Unknown (unresolved) | Unknown (unresolved) | No license stated (verified — homepage; disclaimer content not reviewed) | Unresolved | Unresolved | Text files (verified) | Free | Unaudited | **Rejected** for production — no license, no demonstrable authority |
| **Kaggle family (eoinamoore, wyattowalsh, szymonjwiak, shivamkumar…)** | Re-uploads | Full (claimed) | Varies | Up to 1946+ | NBA IDs | Game rows | Uploader labels (CC0/CC BY-SA/etc.) cannot license NBA-derived data (verified labels; verified reasoning 0001/0004) | Not grantable | Not grantable | Kaggle re-uploads | Free | — | **Rejected** — class-level, unchanged by 0005 |
| **sports-statistics.com / hoopR releases** | Aggregator snapshots | Game-level lines (verified claims) | Partial | 2001-02+ / 2002+ | Varies | Game rows | No license / package license ≠ data license (verified, 0004) | Not grantable | Not grantable | Snapshots | Free | — | **Rejected** — unchanged by 0005 |
| **FiveThirtyEight RAPTOR + nba-elo (pair)** | Publisher-owned, CC BY 4.0 | **No box scores** (verified — audits) | Scores/wins 1947–2015; **no possessions** (verified) | Overlap 1977–2015 (verified) | B-R-format player IDs; team/franchise IDs (verified) | RAPTOR by-team stints (verified) | **CC BY 4.0 (verified)** | Permitted (verified) | **Permitted with attribution (verified)** | Pinned + checksummed (verified) | Free | Cannot construct PCE (no box-score fields) | **Approved for the free MVP** ([decision 0007](decisions/0007-fully-free-historical-prototype.md)) — benchmark/scenario use, not PCE |
| **Sportradar (historical packages)** | Official licensed API | Full (verified) | Full (verified) | Deep (inference) | Provider IDs | Derivable | Contract; AI/ML clause needs negotiation (verified clause; scope unresolved) | Unresolved | Contract-dependent | High | Custom quote — expected highest (inference) | None | **Unresolved** — deprioritized on cost for a historical portfolio product |
| **Sports Reference custom license** | Paid custom dataset | Full historical (verified — the original producer) | Full (verified) | Full history | B-R IDs | Yes | ≥$5,000 minimum; ML-training prohibition requires explicit negotiated permission (verified — archived policy) | Unresolved | Unresolved | High | ≥$5,000 | None | **Unresolved** — cost-prohibitive relative to alternatives |

Research notes (primary sources, retrieved 2026-07-20 unless noted):

* BigDataBall Terms & Conditions — https://www.bigdataball.com/terms/ (fetched; last updated 2024-07-03) and product page (fetched)
* NocturneBear repo — GitHub API license + README schema (fetched)
* TU Wien record — https://test.researchdata.tuwien.ac.at/records/ymgzs-z3s43 (fetched; test-instance warning and Kaggle provenance quoted)
* dougstats.com homepage (fetched; no license found)
* NBA ToU §9, Sportradar T&C, Sports Reference policy — as previously verified (0001/0004, 2026-07-19/20)

No new data was downloaded in this round: every newly examined candidate has
unresolved or invalid rights, and the permitted CC BY 4.0 assets were already
snapshotted and audited.

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

**Unresolved: no source is approved.** Two stages so far:

1. **BPM era (closed):** no source was approved for the next-season BPM target
   (2026-07-19) — see
   [decisions/0001-historical-data-source.md](decisions/0001-historical-data-source.md).
2. **PCE era (open):** the target changed to the Player Contribution Estimate via
   [decisions/0003-internal-player-impact-target.md](decisions/0003-internal-player-impact-target.md).
   The PCE-era candidate search was conducted 2026-07-19/20 (§5b): no free source
   is both field-complete and legally clear; options were proposed in
   [decisions/0004-pce-data-source-options.md](decisions/0004-pce-data-source-options.md).
3. **Historical-only reframe:**
   [decision 0005](decisions/0005-historical-only-product-scope.md) made the
   product historical-only; the re-scored search (§5c, 2026-07-20) found no clean
   free source for PCE, and a two-track paid/consent path was proposed in
   [decisions/0006-historical-pce-data-source.md](decisions/0006-historical-pce-data-source.md).
4. **Fully free path (current):**
   [decision 0007](decisions/0007-fully-free-historical-prototype.md) approved the
   FiveThirtyEight CC BY 4.0 pair plus synthetic fixtures as the **only** sources
   for the initial release (RAPTOR benchmark values via a contribution-provider
   abstraction; seed season 2014-15). **The initial release has no data blocker.**
   The historical box-score source for PCE construction (0006) is a **deferred
   optional future path**, not a prerequisite.

FiveThirtyEight `nba-raptor` remains permitted (CC BY 4.0) for pipeline
prototyping, methodology comparison, and historical benchmarking only — see the
[audit](data-audits/fivethirtyeight-raptor-audit.md). It cannot serve PCE
construction (no box-score fields) and is not a production source.
