# 0004 — PCE Data-Source Options

**Status:** Proposed — awaiting owner decisions on the questions in §8. No source is
approved by this record.

> **Status update (2026-07-20):**
> [decision 0005](0005-historical-only-product-scope.md) made the product
> historical-only, which partially supersedes this record: §8 question 1 (product
> intent) is answered — public **historical** product — and current-season
> coverage/refresh criteria no longer apply. The candidate research and licensing
> findings below remain valid as the record of the current-data-era search; the
> outreach options are re-scoped to historical data only. This record is preserved
> unchanged below.

Evidence labels: **[verified]** (primary source inspected), **[inference]**
(reasoned, not directly confirmed), **[unresolved]** (open question).

## 1. Context

[Decision 0003](0003-internal-player-impact-target.md) replaced the BPM target with
the internally computed Player Contribution Estimate (PCE). PCE construction needs
player box-score statistics **and** team outcomes (possessions/ratings or their
inputs), historical and current, under usable rights
([data-source-evaluation.md §1](../data-source-evaluation.md)). Nine candidates
were researched 2026-07-19/20 across all required categories; full comparison and
primary-source citations are in
[data-source-evaluation.md §5b](../data-source-evaluation.md).

## 2. Candidates Considered (summary)

| # | Candidate | Status |
|---|---|---|
| A | stats.nba.com via `nba_api` | Unresolved (legal, not technical) |
| B | Sportradar official API | Unresolved (cost + ML clause) |
| C | BigDataBall (commercial CSVs) | Unresolved (license scope) |
| D | balldontlie API | Rejected |
| E | sports-statistics.com | Rejected |
| F | Kaggle: eoinamoore box scores | Rejected |
| G | Kaggle: wyattowalsh basketball | Rejected |
| H | FiveThirtyEight `nba-elo` | Partially meets — prototyping component (audited, CC BY 4.0) |
| I | hoopR / sportsdataverse releases | Rejected for production |

## 3. Rejected Sources and Reasons

* **D. balldontlie** — self-described aggregator, "not the original source";
  redistribution prohibited without permission; storage/caching restricted; at-will
  termination [verified — its Terms]. Incompatible with pinned snapshots and
  derived-output publication.
* **E. sports-statistics.com** — no stated license; data collected from ESPN
  endpoints; no demonstrable authority to relicense [verified — page; inference on
  authority].
* **F/G. Kaggle re-uploads (eoinamoore CC0 label; wyattowalsh CC BY-SA label)** —
  uploader-applied labels cannot license NBA.com-derived data; the same
  invalid-grant reasoning as decision 0001's candidate A [verified labels; verified
  NBA ToU §9].
* **I. hoopR / sportsdataverse** — MIT licenses the *code*, not the ESPN/NBA-derived
  *data*; upstream terms govern [verified principle; upstream rights unresolved].

## 4. Viable Options

### Option A — stats.nba.com via `nba_api` (official data, legal path required)

The only free candidate that is field-complete: full player box scores and game
logs (stints derivable), team ratings and possessions, advanced stats since
1996-97, current seasons, stable NBA IDs [inference — well-documented API surface;
not exercised this audit]. The blocker is NBA ToU §9 [verified, fetched
2026-07-19]: statistics may be used only for "legitimate news reporting or private,
non-commercial purposes" (ii), and not in "any website, product, or service that
features a database … of comprehensive, regularly updated statistics" without
express prior consent (vii).

Consequences:

* A **public** deployment of this platform squarely triggers §9(vii) → requires
  written NBA consent [verified reading].
* A **private, non-commercial** build (local development, portfolio demo not
  publicly serving a stats database) is arguably within §9(ii)
  [inference — a defensible but unconfirmed legal reading; not legal advice].
* Automated collection cadence must stay conservative regardless; snapshots would
  be pinned and manifested, never a live dependency [project rule].

### Option B — Sportradar (official licensed provider)

30-day free trial; production pricing is a custom quote [verified — developer
portal]. Their T&C restrict using "AI models, algorithms, Outputs or other
intellectual property" to train AI/ML models — whether this clause reaches raw
data feeds used for our regression/prediction is **the** contract question
[verified clause via excerpt; scope unresolved]. Strong on every technical
criterion; cost expected to be the highest of all options [inference].

### Option C — BigDataBall (low-cost commercial CSVs)

Player + team game data 2002-03 through 2025-26, ~$30–70/season; roughly
$700–$1,500 one-time for the full player+team history plus a per-season refresh
[verified prices; total inferred]. ~24 seasons ≈ 720 team-season observations —
adequate for pooled PCE fitting [inference]. Footer says "for personal use"; ML
use, product use, and derived-output publication need written clarification before
any purchase [verified quote; scope unresolved].

### Option H — FiveThirtyEight `nba-elo` (prototyping component, already audited)

CC BY 4.0, pinned, checksummed, audited
([audit](../data-audits/fivethirtyeight-nba-elo-audit.md)): team game scores/wins
1947–2015, zero duplicate keys, wins derivability verified. No player stats, no
possessions; frozen at 2014-15 [verified]. Usable now, with the existing RAPTOR
snapshot as a benchmark, to build the PCE pipeline mechanics against real team
outcomes with synthetic player-stat fixtures.

## 5. Recommended Path (staged hybrid)

1. **Now (no approval needed — already permitted):** prototype the PCE pipeline
   with CC BY 4.0 assets (`nba-elo` team outcomes + `nba-raptor` benchmark) plus
   synthetic player-stat fixtures per the testing strategy. This exercises
   ingestion, stints, possessions-derivation code paths, and validation scaffolding
   without any restricted data.
2. **Production source (owner decision required):** pursue in parallel —
   * **NBA consent inquiry** for stats.nba.com use under ToU §9(vii) (free data,
     best field fit, official provenance), and
   * **Sportradar trial + written quote**, explicitly asking whether the AI/ML
     clause permits training internal predictive models on licensed feeds.
3. **Fallback:** **BigDataBall written clarification** (ML/product/derived-output
   scope). If confirmed, it is the cheapest adequate paid path (2002-03+ depth,
   current coverage, snapshot-friendly CSVs).

**Definition-drift guard:** whichever production source is chosen must supply *both*
player statistics and team outcomes from one internally consistent system, or the
cross-source compatibility must be demonstrated season-by-season before stitching
[per task rule; inference on method].

## 6. Cost and Licensing Implications

* Option A: $0 data cost; consent effort and legal uncertainty; private-use interim
  reading carries residual risk [unresolved].
* Option B: highest cost (custom quote, typically enterprise) + contract
  negotiation; cleanest ongoing rights if the ML clause is resolved [unresolved].
* Option C: ~$700–$1,500 initial + ~$60–100/season refresh if scope is confirmed in
  writing [unresolved].
* Option H: $0; attribution required; prototyping only [verified].

## 7. Known Data Gaps (all options)

* `nba-elo` lacks possessions → margin-based outcomes only until a box-score source
  arrives [verified].
* BigDataBall depth starts 2002-03 — no earlier eras [verified]; adequate for PCE
  but shallower than nba_api's 1946+/1996+ [inference].
* Offensive/defensive PCE decomposition needs team ORtg/DRtg (or lineup data no
  candidate provides openly) [inference].
* No candidate provides lineup/stint plus-minus for stronger identification
  [verified across candidates].

## 8. Exact Questions Requiring Owner Approval

1. **Product intent:** is the initial deployment private/non-commercial (portfolio
   demo) or a public web product? This decides whether Option A is usable at all
   before consent, and how urgent the consent inquiry is.
2. **Authorize outreach:** may I draft (for you to send) the NBA consent inquiry
   and the Sportradar trial/quote + ML-clause question? (I will not contact anyone
   myself.)
3. **Budget ceiling:** is the BigDataBall fallback (~$700–$1,500 initial) inside
   an acceptable budget if its scope is confirmed? Is a Sportradar-scale contract
   even in scope?
4. **Prototype start:** approve beginning the permitted prototyping stage (step 1
   of §5) now, ahead of the production-source decision?

## 9. Re-evaluation Triggers

* Any outreach answer (NBA consent, Sportradar quote/clause, BigDataBall scope).
* Product intent changes between private and public.
* A new openly licensed box-score dataset with verifiable authority appears.
* NBA ToU §9 changes materially.
* Prototyping reveals the margin-based (possession-less) team outcome is
  insufficient for credible PCE weights.
