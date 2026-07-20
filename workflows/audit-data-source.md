# Workflow: Audit a Data Source

## Objective

Evaluate a candidate historical data source thoroughly enough to accept or reject it
as the system of record for player-season data.

## Prerequisites

* [docs/data-source-evaluation.md](../docs/data-source-evaluation.md) reviewed
* Confirmation that retrieving the candidate's data is permitted by its license or
  terms — **never scrape Sports Reference properties without confirmed permission**

## Inputs

* Candidate source name, access method, and license/terms
* Required-field list from [docs/ml-specification.md](../docs/ml-specification.md) §5

## Steps

1. Document the source's provenance, license, and permitted uses in
   [docs/data-source-evaluation.md](../docs/data-source-evaluation.md).
2. Retrieve a small sample (a few seasons) through a permitted method; preserve the
   raw files unmodified with source, retrieval date, checksum, and license metadata.
3. Verify field coverage against the required-field list, especially **BPM**.
4. Verify season coverage and completeness against backtesting needs.
5. Examine identifier stability across seasons, trades, duplicate names, suffixes,
   and accented characters.
6. Examine traded-player representation (total-season vs. per-team rows).
7. Check data quality: nulls, duplicates, impossible values, schema drift across
   seasons.
8. Record findings in a new audit file under
   [docs/data-audits/](../docs/data-audits/).
9. Update the candidate-comparison table in docs/data-source-evaluation.md.

## Validation Checks

* Raw sample files are preserved with complete manifests and matching checksums.
* Every required field is marked present, derivable, or missing — none unexamined.
* Licensing conclusions cite the actual terms, not assumptions.

## Expected Outputs

* A completed audit document in docs/data-audits/
* An updated comparison row in docs/data-source-evaluation.md
* If the source is selected: a decision record in
  [docs/decisions/](../docs/decisions/)

## Stopping Conditions

* Stop immediately if licensing does not clearly permit the intended use.
* Stop if BPM is neither present nor reproducibly derivable — the source cannot be
  primary without an approved target change.
* Stop and flag for review if identifier ambiguity cannot be resolved.
