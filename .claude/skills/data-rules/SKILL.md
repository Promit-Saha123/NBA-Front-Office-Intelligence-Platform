---
name: data-rules
description: Mandatory data-handling rules for this project. Use BEFORE any work involving data sources, ingestion, snapshots, audits, licensing, identifiers, crosswalks, fixtures, or the data pipeline — selecting/replacing a source, writing adapters, loading RAPTOR/Elo data, validation, or identity resolution.
---

# Data Rules

Do not make the system dependent on a live undocumented endpoint.

The product is historical-only (decision 0005) and the initial release is fully
free (decision 0007). Approved sources for the initial release — nothing else:

1. FiveThirtyEight `nba-raptor` snapshot (CC BY 4.0, pinned, audited) — player
   benchmarks, rosters/stints from by-team RS rows
2. FiveThirtyEight `nba-elo` snapshot (CC BY 4.0, pinned, audited) — team game
   outcomes
3. Synthetic fixtures — always labeled

Current-season and current-roster tiers are out of scope; do not add them without
a superseding decision record. Paid or permissioned sources (BigDataBall,
Sportradar, Sports Reference, NBA consent) are optional future paths only.

Before selecting or replacing a source, update:

```text
docs/data-source-evaluation.md
```

Do not:

* scrape Sports Reference properties without confirmed permission
* assume a third-party license overrides the original source's rights
* depend on live external APIs in automated tests
* overwrite raw source files
* use names as primary identifiers
* silently discard invalid records
* mix observations, features, predictions, assumptions, or scenario results

Treat `nba_api` as a replaceable adapter, not the system of record.

Preserve raw snapshots with:

* source
* retrieval date
* checksum
* license information
* data version
* code version where available

Use canonical internal player and team identifiers with explicit source crosswalks.

Ambiguous identity matches require review.
