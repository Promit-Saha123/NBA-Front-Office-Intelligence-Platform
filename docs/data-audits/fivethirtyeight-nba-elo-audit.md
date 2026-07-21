# Data-Source Audit: FiveThirtyEight NBA Elo (team game results)

**Audit date:** 2026-07-20
**Auditor:** automated audit (`scripts/audit_data_source.py`) plus manual inspection
**Outcome:** Permitted (CC BY 4.0). Supplies **team game outcomes only** — a hybrid
component for prototyping the team-outcome side of PCE, not a standalone source.
Facts are labeled **[verified]** or **[inference]**.

## Source, License, Integrity

* `nba-elo` folder of the `fivethirtyeight/data` GitHub repository, pinned commit
  `6d880e939ad3d11d94c137c911681b3cf718fd74` (2022-12-16, last commit touching the
  folder) [verified — GitHub API].
* License CC BY 4.0 — repository-wide LICENSE preserved with the snapshot,
  byte-identical (SHA-256 `7e7170…c8a2661`) to the copy in the nba-raptor snapshot
  [verified].
* Preserved unmodified under `data/raw/fivethirtyeight-nba-elo/2026-07-19/` with
  [manifest.json](../../data/raw/fivethirtyeight-nba-elo/2026-07-19/manifest.json)
  (retrieval completed 2026-07-20; see manifest directory note); SHA-256 for
  `nbaallelo.csv`: `d46ed3540ee8d9eca31b3e94cc8c777e0be5156173d814ebf65b8195e8d616bc`
  [verified].

## Structure and Quality

Automated profile: [fivethirtyeight-nba-elo-games.md](fivethirtyeight-nba-elo-games.md).

* 126,314 rows × 23 columns — one row per team per game (two rows per game,
  `_iscopy` flag), 63,157 games [verified].
* Seasons 1947–2015 (`year_id`), no gaps; NBA and ABA rows both present (`lg_id`
  filter required) [verified].
* Zero duplicate `game_id × team_id` keys; zero null scores; zero blank team IDs
  [verified].
* `team_id` (104 values) vs. `fran_id` (53 franchises): franchise names map to up
  to 6 historical team codes — use `team_id` + season, with `fran_id` only for
  lineage [verified].
* Derivability spot-check: 2014-15 regular-season wins recomputed from
  `game_result` reproduce the known standings exactly (e.g. GSW 67) [verified].

## Fit Against PCE Requirements

* **Provides:** team game scores (points for/against), wins/losses, home/away,
  playoff flags, season labels → team wins, point differential, and per-game margin
  are all derivable [verified].
* **Does not provide:** any player statistics, minutes, stints, or the team
  box-score components (FGA, FTA, ORB, TOV) needed to derive possessions — so
  offensive/defensive/net rating per 100 possessions is **not** derivable from this
  file alone [verified]. Margin-based team outcomes are usable but pace-confounded
  [inference].
* **Frozen at 2014-15** in the in-repo file; FiveThirtyEight later maintained
  `nba_elo.csv` (through ~2023) on a separate projects host whose licensing
  labeling is less explicit — not downloaded; rights marked unresolved
  [verified that it is referenced by the repo README; its license status
  unresolved].

## Conclusion

Useful now as the **team-outcome half of a prototyping hybrid** (with player
statistics still unsourced), and as a long-horizon wins/margin reference. Not a
production source: frozen coverage, no player data, no possessions.
