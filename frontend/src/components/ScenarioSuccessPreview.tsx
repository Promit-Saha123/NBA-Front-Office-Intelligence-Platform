import type { ScenarioViewModel } from "@/lib/view-model";
import { RotationComparisonTable } from "./RotationComparisonTable";
import { ExplanationFactorsList } from "./ExplanationFactorsList";
import { ScenarioDisclosuresPanel } from "./ScenarioDisclosuresPanel";
import styles from "./ScenarioForm.module.css";

export interface ScenarioSuccessPreviewProps {
  /** Computed once by the caller (ScenarioForm) so every field shown here — and every
   *  other read of the same response — goes through the same reshape-only mapping. */
  viewModel: ScenarioViewModel;
  /** Already-resolved display names (from the lookup data the form already loaded) —
   *  this component never fetches or infers a name itself. Falls back to the raw id. */
  teamLabel: string;
  playerOutLabel: string;
  playerInLabel: string;
  playerLabel: (playerId: string) => string;
}

/**
 * UI-003's full results and disclosures experience: the summary grid, the
 * before/after rotation comparison, the explanation factors, and the full
 * disclosures panel (decision 0007 §8). Adds no mapping or calculation of
 * its own beyond display formatting (`.toFixed()` rounding, the rotation
 * table's 240-minute display sum) — scenario-engine.md: "may be rounded for
 * display while preserving full precision internally".
 */
export function ScenarioSuccessPreview({
  viewModel,
  teamLabel,
  playerOutLabel,
  playerInLabel,
  playerLabel,
}: ScenarioSuccessPreviewProps) {
  return (
    <section className={styles.successPreview} aria-labelledby="results-heading">
      <h2 id="results-heading">Scenario result</h2>
      <dl className={styles.successGrid}>
        <div>
          <dt>Team</dt>
          <dd>{teamLabel}</dd>
        </div>
        <div>
          <dt>Season</dt>
          <dd>{viewModel.season}</dd>
        </div>
        <div>
          <dt>Player removed</dt>
          <dd>{playerOutLabel}</dd>
        </div>
        <div>
          <dt>Player added</dt>
          <dd>{playerInLabel}</dd>
        </div>
        <div>
          <dt>Original contribution</dt>
          <dd>{viewModel.baselineContribution.toFixed(3)}</dd>
        </div>
        <div>
          <dt>Modified contribution</dt>
          <dd>{viewModel.scenarioContribution.toFixed(3)}</dd>
        </div>
        <div>
          <dt>Net contribution change</dt>
          <dd>{viewModel.contributionChange.toFixed(3)}</dd>
        </div>
      </dl>

      <section className={styles.resultSection} aria-labelledby="rotation-heading">
        <h3 id="rotation-heading">Rotation comparison</h3>
        <RotationComparisonTable
          rows={viewModel.rotationComparison}
          outgoingPlayerId={viewModel.playerOutId}
          incomingPlayerId={viewModel.playerInId}
          playerLabel={playerLabel}
        />
        {viewModel.allocationRepairs.length > 0 ? (
          <p className={styles.help}>Allocation adjustments: {viewModel.allocationRepairs.join("; ")}</p>
        ) : null}
      </section>

      <section className={styles.resultSection} aria-labelledby="factors-heading">
        <h3 id="factors-heading">What changed</h3>
        <ExplanationFactorsList factors={viewModel.explanationFactors} />
      </section>

      <ScenarioDisclosuresPanel disclosures={viewModel.disclosures} season={viewModel.season} />
    </section>
  );
}
