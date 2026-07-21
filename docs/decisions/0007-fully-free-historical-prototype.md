# 0007 — Fully Free Historical Prototype

**Status:** Accepted (owner-directed, 2026-07-20)

Evidence labels: **[verified]**, **[inference]**, **[unresolved]** as in prior
records.

## 1. Decision

The initial product will be built and **deployed entirely with free, clearly
licensed historical data and synthetic fixtures**. No paid source is required for
the initial release. BigDataBall, Sportradar, Sports Reference licensing, NBA
consent, restricted raw NBA data, live NBA endpoints, and paid historical data are
**out of scope for the initial version**. Paid or permissioned data may be
revisited only after the free historical product is complete.

This supersedes, for the initial release, the two-track outreach proposal of
[decision 0006](0006-historical-pce-data-source.md) (deferred to an optional
future path) and lifts the "prototyping-only" scoping of the FiveThirtyEight data
from decisions 0001/0004 — CC BY 4.0 permits public deployment with attribution
[verified — license], and this record now approves that use.

## 2. Role of PCE

PCE (decision 0003) remains the approved **future research direction** — its
target definition, methodology, and validation program are unchanged — but
**validated PCE is no longer a blocker for the first deployed version**. PCE
construction still requires a historical box-score source (0006) and stays on the
optional future path.

The application uses a **contribution-provider abstraction** (§7) with possible
implementations:

* `HistoricalRaptorBenchmarkProvider` — FiveThirtyEight RAPTOR values as
  historical benchmark inputs
* `SyntheticContributionProvider` — labeled synthetic values for tests,
  unsupported scenarios, and demos
* `FuturePceProvider` — added only when `pce-v1` exists

Values from the first two providers must **never** be labeled `pce-v1`, validated
PCE, causal impact, or current-season predictions. Approved labels: **"Historical
RAPTOR benchmark"**, **"Synthetic contribution estimate"**, **"Demo projection"**,
**"Mock contribution provider"**.

## 3. First Free Historical Product

```text
Select a historical season
→ select a historical team
→ view its roster
→ remove one player
→ add another player from the same season
→ generate a valid heuristic rotation
→ aggregate historical benchmark contribution values
→ estimate a scenario difference
→ display assumptions, data version, provider type, and explanation factors
```

The application must clearly state that the result is a **historical simulation,
not a validated prediction of real-world outcomes**.

## 4. Approved Sources (initial prototype only)

### FiveThirtyEight `nba-raptor` (CC BY 4.0, pinned commit `6d9b327`, audited)

* **Permitted uses:** historical player benchmark values; methodology comparison;
  roster-scenario prototyping; historical demonstrations — now including the
  deployed prototype, with attribution.
* **Limitations:** ends with 2021-22; **not PCE**; not current; by-player files
  blend regular season and playoffs, so regular-season values must come from the
  by-team files (`season_type == "RS"`) — this handling must remain explicit
  [verified — audit]; attribution required.
* Historical rosters and baseline minutes for a season are **derivable from the
  by-team RS stint rows** (players with regular-season minutes for a team-season)
  [verified — audit structure].

### FiveThirtyEight `nba-elo` (CC BY 4.0, pinned commit `6d880e9`, audited)

* **Permitted uses:** historical team outcomes; wins and score validation;
  historical scenario context; team-level benchmarking.
* **Limitations:** ends with 2014-15; no player box scores; no possessions; not
  sufficient for PCE construction [verified — audit].

### Synthetic fixtures

* **Permitted uses:** tests; unsupported seasons; scenario edge cases; frontend
  demonstrations; deterministic examples.
* Synthetic values must **always** be labeled.

No other data source is approved for the initial release.

## 5. Supported Season Range

* Verified overlap of the two datasets: **1977–2015**; the **final season covered
  by both is 2014-15** (nba-elo `year_id` 2015) [verified — audits].
* **Recommendation: seed with the single season 2014-15**, expanding only after
  the end-to-end flow works.

Rationale: 2014-15 is inside the verified overlap; it falls in the modern RAPTOR
window (2014+) with box/on-off component splits; the by-team file provides RS
stint rows for roster construction and traded-player handling; and nba-elo
supplies that season's full game results for team-outcome context and
win-sanity checks (already spot-verified: recomputed 2014-15 standings match)
[verified]. First expansion candidate: 2013-14 (the other modern-window overlap
season), then earlier overlap seasons from the historical file [inference].

This supersedes 0006 §7's suggestion of 2015-16, which assumed a purchased source
extending past nba-elo's cutoff.

## 6. Product Claims

**Supported:** historical NBA scenario simulator; historical player benchmark
comparison; transparent rotation assumptions; deterministic roster aggregation;
full-stack historical analytics platform; reproducible licensed-data pipeline.

**Unsupported:** validated PCE; current NBA projections; live data; exact win
prediction; causal player impact; production front-office forecasting;
equivalence claims between the displayed benchmark values and BPM, EPM, or other
metrics (RAPTOR values are displayed *as* RAPTOR, attributed — never presented as
a house metric).

## 7. Architecture: Contribution Layer

```text
ContributionProvider (interface)
- get_player_contribution(player_id, season)
- get_provider_version()
- get_data_version()
- get_epistemic_type()
```

* Initial implementations: `HistoricalRaptorBenchmarkProvider`,
  `SyntheticContributionProvider`. Future: `PceProvider`.
* The scenario engine depends only on this interface and must not reference
  RAPTOR-specific field names.
* `get_epistemic_type()` returns the label class (e.g. historical benchmark /
  synthetic estimate / model prediction) so the UI can render the correct badge.
* Not implemented in this task.

## 8. Required UI Labels (exact wording)

* **Historical prototype banner:** "Historical prototype — this app simulates
  roster scenarios from the {season} NBA season using licensed historical data.
  It is not current and not predictive."
* **RAPTOR benchmark badge:** "Historical RAPTOR benchmark — player value from
  FiveThirtyEight's RAPTOR dataset (CC BY 4.0)."
* **Synthetic data badge:** "Synthetic contribution estimate — generated demo
  value, not derived from real player data."
* **Scenario methodology note:** "Scenario results combine historical benchmark
  values, heuristic rotation assumptions, and deterministic calculations.
  Heuristic scenario profile, not a validated causal fit model."
* **Data coverage disclosure:** "Supported seasons: {range}. Player benchmarks
  end with the 2021-22 season; team game outcomes end with 2014-15."
* **Attribution footer:** "Player benchmark data: RAPTOR by FiveThirtyEight
  (CC BY 4.0). Team game data: NBA Elo by FiveThirtyEight (CC BY 4.0). Data
  modified for this application. Not affiliated with or endorsed by
  FiveThirtyEight, ABC News, or the NBA."
* **Not-a-prediction disclaimer:** "Scenario estimates describe a historical
  what-if under stated assumptions. They do not predict real-world outcomes,
  coaching decisions, or wins."

## 9. Free MVP

1. One historical season (2014-15)
2. One historical roster dataset (derived from RAPTOR by-team RS stints)
3. RAPTOR-backed historical benchmark provider
4. Synthetic fallback provider
5. One-player same-season swap
6. Heuristic 240-minute rotation
7. Deterministic scenario calculation
8. One FastAPI endpoint
9. Minimal Next.js Roster Lab
10. Visible source attribution and methodology disclosure (§8 wording)
11. Offline tests
12. Public deployment

## 10. Consequences

* The data-source blocker is **removed for the initial release**: nothing in the
  free MVP waits on BigDataBall permission, NBA consent, Sportradar pricing, paid
  acquisition, or PCE construction. Those remain optional future paths (0006
  deferred, not withdrawn).
* [ml-specification.md](../ml-specification.md) governs the future PCE phase;
  the first release ships no trained model.
* The scenario-engine projection contract moves from a PCE-specific input to the
  provider interface (§7).
* Win-conversion for the prototype may be calibrated against nba-elo team
  outcomes and must remain versioned and documented [inference — design
  direction, method not fixed here].
* Prior ADRs remain unchanged as history; 0006's outreach questions are deferred.

## 11. Re-evaluation Triggers

* The free historical product is complete and the owner wants PCE or richer data
  (reopens 0006).
* FiveThirtyEight data availability or licensing changes.
* The seed-season prototype reveals the benchmark-provider design cannot support
  the scenario workflow.
* A clearly licensed free historical box-score source appears (would enable PCE
  without the paid path).
