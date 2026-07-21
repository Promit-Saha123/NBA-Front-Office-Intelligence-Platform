# 0005 — Historical-Only Product Scope

**Status:** Accepted (owner-directed, 2026-07-20)

Evidence labels: **[verified]**, **[inference]**, **[unresolved]** as in decisions
0001–0004.

## 1. Decision

The initial product is a **historical** NBA roster-scenario and player-projection
platform.

The project will **not** require:

* current NBA rosters
* current-season data
* live refreshes
* live NBA endpoints
* production rights for a regularly updated NBA statistics database

The deployed application may use only:

* clearly licensed historical datasets
* synthetic fixtures
* derived outputs permitted by the source license
* versioned local snapshots

The historical cutoff must be explicit and visible in the product.

## 2. Positioning

> A historical NBA front-office simulation and player-projection platform that
> combines a versioned Player Contribution Estimate with transparent rotation
> assumptions.

The product must never be described as current, live, real-time, production NBA
forecasting, or an exact predictor of coaching decisions or wins.

## 3. Primary Historical Workflow

```text
Select a historical season
→ select a team from that season
→ view the historical roster
→ remove one player
→ add another historically available player
→ generate a valid heuristic rotation
→ calculate projected contribution and win change
→ display assumptions, versions, and explanation factors
```

### Added-player universe rule (v1 recommendation)

**The added player must have a player-season record in the same selected season
and must not already be on the selected team's roster.** Any team of origin within
that season is allowed (including a mid-season stint team); the player joins at
their season-level profile.

Why this is the simplest credible rule:

* PCE is season-relative (within-season standardization, decision 0003), so
  same-season values are directly comparable without any era-translation model
  [verified — 0003 design].
* Rotation heuristics rely on same-season minutes and roles [inference].
* Cross-era swaps would demand pace/style/rule-change adjustments the project has
  not validated, and would invite exactly the unsupported claims the product
  forbids [inference].
* "Played that season, not on this roster" is trivially checkable from the
  canonical player-season table — no salary, contract, or eligibility modeling
  [verified — schema design].

Explicitly out of scope for v1: cross-era comparisons, salary-cap logic, injury
simulation, multi-player trades, current-roster assumptions.

## 4. Historical Scope from Currently Permitted Data

* FiveThirtyEight RAPTOR: player-season impact values, **1977–2022**, no box-score
  fields [verified — audit].
* FiveThirtyEight nba-elo: team game outcomes (scores, wins; no possessions),
  **1947–2015** [verified — audit].
* Overlap: **1977–2015** (39 seasons) [verified].

**PCE is not computable from currently held data** — both snapshots lack the
required box-score fields (FGA, 3PA, FTA, AST, TOV, REB, STL, BLK, minutes-based
stints) [verified — audits]. Synthetic fixtures therefore remain necessary for all
pipeline and scenario tests until a historical box-score source is approved.

Two phases are therefore separated:

* **Historical scenario prototype (possible now):** exercise the scenario engine
  mechanics inside the 1977–2015 overlap (suggested seed season: 2014-15, covered
  by both snapshots and by the component-split modern RAPTOR file), using RAPTOR
  values strictly as stand-in projections for prototyping — clearly labeled, never
  deployed as the product metric [per 0004 scoping].
* **Historical PCE research phase (blocked):** construct and validate PCE once a
  legally usable historical box-score + team-outcome source is approved.

The **supported season range of the deployed product will be fixed by the approved
historical source** at approval time and displayed in the product.

## 5. Reframed Data-Source Blocker

Old framing: "need a current production data source."
New framing: **"need a legally usable historical box-score and team-outcome source
sufficient to construct PCE."** Current-season coverage and future refreshes are
**no longer required**.

Still required: stable player IDs; stable team IDs; season; team stints; games;
minutes; points; FGA; 3PA; FTA; assists; turnovers; rebounds (ORB/DRB preferred);
steals; blocks; team outcomes (possessions or derivable, ratings or derivable,
wins); clear provenance; clear license; permitted ML use; reproducible snapshots.

Implication for the 0004 candidates [inference, to be re-verified next task]:
dropping the current-coverage and refresh requirements widens the field (one-time
historical purchases and frozen datasets become viable) and weakens — but does not
eliminate — the NBA ToU concern: §9(vii) targets "regularly updated" statistical
databases, which a frozen historical product is not, but §9(ii) still restricts
NBA-sourced statistics in public products. Clearly licensed data remains the
requirement.

## 6. Historical PCE Behavior

PCE remains the approved target direction (decision 0003), with:

* PCE constructed **only from historical data**.
* Next-season PCE prediction evaluated **historically**: rolling backtests only,
  predicting season N+1 only where historical ground truth exists.

```text
Train through 2018-19
→ predict 2019-20
→ compare with historical 2019-20 PCE
```

* **No current-season prediction claim will be made anywhere in the product.**
* `pce-v1` is **not frozen** until the historical source is approved and the
  metric-validation program of decision 0003 §6 passes.

## 7. Deployment Direction

The public application **may be deployed as a historical product**. Deployment is
no longer blocked by current-data licensing; it is gated only by the historical
source approval and the build itself.

Required visible disclosures in the deployed product:

* supported historical season range
* data source and license (with attribution where required)
* data version
* model version
* minutes-method version
* win-conversion version
* historical-only status
* scenario outputs are estimates
* no current-season claim

Retained restrictions: no live scraping, no restricted raw data, no undocumented
sources, no dependence on current NBA endpoints.

## 8. Smallest Historical MVP (implementation order — not started by this record)

1. Approve historical box-score source
2. Build canonical player/team/season/stint schemas
3. Construct and validate historical PCE
4. Train and backtest next-season PCE model
5. Seed one historical season
6. Build one-player swap scenario service
7. Expose one FastAPI endpoint
8. Build minimal Roster Lab UI
9. Add editable minutes
10. Deploy historical application

## 9. Consequences

* [data-source-evaluation.md](../data-source-evaluation.md) requirements drop
  current coverage and refresh-path criteria; candidates are re-scored next task.
* Decision 0004's outreach questions are **partially superseded**: the "product
  intent" question is answered (public historical product), and current-coverage
  requirements no longer apply to candidate scoring. Its unresolved candidates
  (NBA consent, Sportradar, BigDataBall) remain relevant only as historical-data
  paths.
* Specifications and workflows are reworded from current-roster to
  historical-roster snapshots (same-change updates).
* Earlier ADRs are preserved unchanged as historical records.

## 10. Re-evaluation Triggers

* The owner later wants current-season or live features (this record must then be
  superseded, and the 0004 current-data questions reopen).
* A historical source is approved whose range materially changes the product scope.
* Legal review contradicts the §9(vii)/"regularly updated" reading above.
* The historical-only product proves insufficient for its portfolio/demonstration
  purpose.
