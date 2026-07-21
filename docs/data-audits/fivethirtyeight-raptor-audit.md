# Data-Source Audit: FiveThirtyEight NBA RAPTOR

**Audit date:** 2026-07-19
**Auditor:** automated audit (`scripts/audit_data_source.py`) plus manual inspection
**Outcome:** Permitted and structurally suitable for pipeline prototyping; **not
suitable as the training source for the then-current next-season BPM target**,
because it does not contain BPM. See
[decision 0001](../decisions/0001-historical-data-source.md). *(Post-audit note:
the target has since changed to PCE via
[decision 0003](../decisions/0003-internal-player-impact-target.md); this source
also cannot support PCE construction — it carries no box-score fields, §8.)*

Facts below are labeled **[verified]** (checked directly against primary sources or the
downloaded data) or **[inference]** (reasoned but not directly confirmed).

---

## 1. Source and Provenance

* **Source:** `nba-raptor` folder of the `fivethirtyeight/data` GitHub repository
  [verified — files downloaded from that repository].
* **Publisher:** FiveThirtyEight (ABC News), publishing its own RAPTOR metric
  [verified — repository is under the `fivethirtyeight` organization; RAPTOR is
  FiveThirtyEight's own published metric].
* **Pinned commit:** `6d9b3277a3dc8ecd74bdef7a4f48da5bb1297bb4` (2022-11-29, the last
  commit touching `nba-raptor`) [verified — GitHub API].
* **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
  [verified — repository-wide `LICENSE` file downloaded at the pinned commit and
  preserved alongside the data; GitHub API reports SPDX `CC-BY-4.0`].
* **Retrieval method:** HTTPS download from `raw.githubusercontent.com` at the pinned
  commit on 2026-07-19; no live-endpoint dependence for reuse [verified].
* **Attribution obligation:** CC BY 4.0 requires attribution to FiveThirtyEight in any
  redistribution or derived work [verified — license text].

## 2. Files, Integrity, and Preservation

Raw files preserved unmodified under
`data/raw/fivethirtyeight-nba-raptor/2026-07-19/` with
[manifest.json](../../data/raw/fivethirtyeight-nba-raptor/2026-07-19/manifest.json)
recording source, retrieval date, pinned commit, license, and SHA-256 checksums.
All checksums re-verified on 2026-07-19 after the audit: **all match** [verified].

| File | Rows | Columns | Seasons |
|---|---|---|---|
| `historical_RAPTOR_by_player.csv` | 19,159 | 15 | 1977–2022, no gaps |
| `historical_RAPTOR_by_team.csv` | 29,976 | 17 | 1977–2022, no gaps |
| `modern_RAPTOR_by_player.csv` | 4,685 | 21 | 2014–2022, no gaps |
| `modern_RAPTOR_by_team.csv` | 7,289 | 17 | 2014–2022 |

Automated per-file profiles: [by-player](fivethirtyeight-raptor-historical-by-player.md),
[by-team](fivethirtyeight-raptor-historical-by-team.md),
[modern by-player](fivethirtyeight-raptor-modern-by-player.md). All [verified].

## 3. Identifiers

* `player_id` uses Basketball-Reference-format ID strings (e.g. `claxtni01`)
  [verified — column contents; the format matches Basketball-Reference's public ID
  scheme — the IDs arrive via FiveThirtyEight's CC BY 4.0 files, not from any
  Sports Reference property].
* No blank or null `player_id` values in any audited file [verified].
* **Names are not usable as identifiers**: up to 3 distinct IDs share one name
  (e.g. "Charles Smith" ×3, "Charles Jones" ×3) [verified].
* IDs are stable while name spellings drift (e.g. `claxtni01` appears as both
  "Nic Claxton" and "Nicolas Claxton"; `doziepj01` as "P.J. Dozier"/"PJ Dozier")
  [verified]. This is name drift on a stable ID, not an identity conflict
  [inference from the examples inspected; not every multi-name ID was reviewed].
* Suffixes are preserved in names ("Marvin Bagley III", "Brandon Boston Jr.");
  no accented characters occur anywhere in `player_name` (names appear
  ASCII-normalized) [verified].
* A crosswalk to canonical internal IDs can key on `player_id` directly; name-based
  matching is unnecessary within this source [inference].

## 4. Canonical Grain and Duplicates

* `historical_RAPTOR_by_player.csv`: exactly one row per `player_id × season`;
  **0 duplicate keys** [verified].
* `historical_RAPTOR_by_team.csv`: one row per
  `player_id × season × season_type × team`; **0 duplicate keys** on that grain
  [verified]. `season_type` takes exactly two values, `RS` and `PO` [verified].

## 5. Traded-Player Representation

* By-player files contain a single aggregated row per player-season; per-team detail
  lives only in the by-team files [verified].
* 2,121 regular-season player-seasons span 2+ teams in the historical by-team file
  [verified]. Canonicalization can use the by-player file as the aggregate row and
  the by-team file for team detail, with no double counting as long as the two grains
  are never mixed in one table [inference — this is the required pipeline rule].

## 6. Regular-Season vs. Playoff Ambiguity (resolved)

The by-player files **blend regular season and playoffs**: for all 19,159
player-seasons, by-player `mp` equals the sum of RS + PO minutes from the by-team
file (only 10,614 rows match the RS-only sum — those players simply had no playoff
minutes) [verified empirically]. The rating columns therefore include playoff
possessions [inference — consistent with the minutes finding; per-column weighting was
not independently re-derived].

**Consequence:** a regular-season-only player-season table must be built from the
by-team files (`season_type == "RS"`, aggregating multi-team rows), not from the
by-player files.

## 7. Nulls and Schema Findings

* Near-zero missingness: 1 null `pace_impact` in 19,159 historical rows; 1 row with
  null box/on-off component columns in the modern file; totals columns complete
  [verified].
* Schema differs between eras by design: the modern file (2014+) adds the
  `raptor_box_*` / `raptor_onoff_*` component split; era-dependent input detail
  (box-only before 2001, plus-minus 2001–2013, tracking 2014+) is documented by the
  publisher [verified — upstream README preserved with the snapshot]. Era
  heterogeneity means the metric's information content is not constant across
  1977–2022 [inference].

## 8. Target Availability

* **BPM is absent.** No BPM, OBPM, or DBPM column exists in any file [verified], and
  BPM cannot be derived from RAPTOR values [inference — BPM is defined over box-score
  inputs this dataset does not carry].
* Available impact metrics: `raptor_offense/defense/total`, WAR (split RS/PO),
  `predator_*` (FiveThirtyEight's predictive variant), `pace_impact` [verified].
* Feature coverage against [ml-specification §5](../ml-specification.md): playing time
  (`mp`, `poss`) and multi-season impact history are present; box-score scoring,
  playmaking, rebounding, and defensive-activity fields (TS%, usage, AST%, TRB%, …)
  are **absent** and would need a separate licensed source [verified].

## 9. Coverage and Freshness

* 46 consecutive seasons (1977–2022) with no gaps — far more than rolling backtests
  require [verified].
* **Frozen at 2021-22** (606 player rows in season 2022; last data commit 2022-11-29;
  FiveThirtyEight has ceased operations, so no future updates will occur — the
  latter is [inference] from public reporting, the commit history fact is
  [verified]). At audit time the platform's later slices were expected to need
  current-season data; this source can never supply seasons after 2021-22, and
  RAPTOR is not computable for new seasons without rebuilding FiveThirtyEight's
  methodology [inference]. *(Post-audit note: decision 0005 later made the product
  historical-only, so frozen coverage is no longer disqualifying in itself.)*

## 10. Suitability Conclusion

* **Suitable now for:** structural pipeline prototyping — ingestion, manifests,
  canonicalization, identity crosswalks, temporal-split and backtest scaffolding —
  under CC BY 4.0 with attribution [verified license; suitability is inference].
* **Not suitable as:** the production training source for the then-current
  next-season BPM target (no BPM — gating criterion 1 fails), nor for PCE
  construction (no box-score fields), nor as a long-term current-season source
  (frozen at 2022).
* Selection status: **not selected**; see
  [decision 0001](../decisions/0001-historical-data-source.md).
