"use client";

import type { ScenarioViewModel } from "@/lib/view-model";
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
}

/**
 * UI-002's temporary, minimal success confirmation — proves the full
 * request flow works. Static, non-live content: the "scenario completed"
 * announcement itself is ScenarioStatus's job (the live region), so this
 * panel doesn't duplicate it. Deliberately not the final results experience
 * (UI-003): no rotation comparison, no explanation factors, no full
 * disclosures panel — `data_version`, `minutes_method`,
 * `minutes_assumptions`, and `model_version` are all already present on
 * `viewModel` but intentionally not rendered here yet (decision 0007 §8
 * describes what UI-003 must surface in full). `attribution` is shown now
 * regardless, ahead of the rest — it's a CC BY 4.0 license obligation, not
 * cosmetic polish, so the first surface that renders a real scenario result
 * shouldn't ship without it even in a temporary preview. Adds no mapping or
 * calculation of its own beyond `.toFixed(3)` display rounding
 * (scenario-engine.md: "may be rounded for display while preserving full
 * precision internally").
 */
export function ScenarioSuccessPreview({
  viewModel,
  teamLabel,
  playerOutLabel,
  playerInLabel,
}: ScenarioSuccessPreviewProps) {
  return (
    <div className={styles.successPreview}>
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
          <dt>Provider</dt>
          <dd>
            {viewModel.disclosures.providerType} ({viewModel.disclosures.providerVersion})
          </dd>
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
      <p className={styles.attribution}>{viewModel.disclosures.attribution.join(" · ")}</p>
    </div>
  );
}
