/**
 * Thin, reshape-only view-model boundary (decision 0008, "DTO-to-presentation
 * coupling"). This module may rename fields and group them for presentation;
 * it must never calculate, infer, or fabricate a value that isn't already in
 * the validated ScenarioResponse — that would violate CLAUDE.md's rule that
 * the frontend never invents metrics. In particular `model_version` is
 * carried through verbatim, including `null`; nothing here ever substitutes
 * a fabricated value for it.
 */
import type { ScenarioResponse } from "@/lib/api/scenarios";

export interface RotationComparisonRow {
  playerId: string;
  /** null only if the player has no baseline_rotation entry (e.g. the incoming player). */
  baselineMinutes: number | null;
  /** null only if the player has no scenario_rotation entry. */
  scenarioMinutes: number | null;
}

export interface ScenarioDisclosures {
  providerType: ScenarioResponse["provider_type"];
  providerVersion: string;
  dataVersion: string;
  contributionEpistemicType: ScenarioResponse["contribution_epistemic_type"];
  minutesMethod: string;
  minutesAssumptions: ScenarioResponse["minutes_assumptions"];
  attribution: string[];
  /** Verbatim from the backend — always `null` in the free MVP (decision 0007: no trained model ships). */
  modelVersion: string | null;
  historicalOnly: boolean;
}

export interface ScenarioViewModel {
  teamId: string;
  season: string;
  playerOutId: string;
  playerInId: string;
  rotationComparison: RotationComparisonRow[];
  baselineContribution: number;
  scenarioContribution: number;
  contributionChange: number;
  explanationFactors: ScenarioResponse["explanation_factors"];
  teamProfile: ScenarioResponse["team_profile"];
  allocationRepairs: string[];
  disclosures: ScenarioDisclosures;
}

/** Pairs baseline/scenario rotation entries by player_id, preserving each list's own order
 *  (baseline entries first, then any scenario-only entries) — no sort criterion is invented. */
function pairRotations(
  baseline: ScenarioResponse["baseline_rotation"],
  scenario: ScenarioResponse["scenario_rotation"],
): RotationComparisonRow[] {
  const scenarioByPlayer = new Map(scenario.map((entry) => [entry.player_id, entry.minutes]));
  const seen = new Set<string>();
  const rows: RotationComparisonRow[] = [];

  for (const entry of baseline) {
    rows.push({
      playerId: entry.player_id,
      baselineMinutes: entry.minutes,
      scenarioMinutes: scenarioByPlayer.get(entry.player_id) ?? null,
    });
    seen.add(entry.player_id);
  }
  for (const entry of scenario) {
    if (seen.has(entry.player_id)) continue;
    rows.push({ playerId: entry.player_id, baselineMinutes: null, scenarioMinutes: entry.minutes });
  }
  return rows;
}

export function toScenarioViewModel(response: ScenarioResponse): ScenarioViewModel {
  return {
    teamId: response.team_id,
    season: response.season,
    playerOutId: response.player_out_id,
    playerInId: response.player_in_id,
    rotationComparison: pairRotations(response.baseline_rotation, response.scenario_rotation),
    baselineContribution: response.baseline_contribution,
    scenarioContribution: response.scenario_contribution,
    contributionChange: response.contribution_change,
    explanationFactors: response.explanation_factors,
    teamProfile: response.team_profile,
    allocationRepairs: response.allocation_repairs,
    disclosures: {
      providerType: response.provider_type,
      providerVersion: response.provider_version,
      dataVersion: response.data_version,
      contributionEpistemicType: response.contribution_epistemic_type,
      minutesMethod: response.minutes_method,
      minutesAssumptions: response.minutes_assumptions,
      attribution: response.attribution,
      modelVersion: response.model_version,
      historicalOnly: response.historical_only,
    },
  };
}
