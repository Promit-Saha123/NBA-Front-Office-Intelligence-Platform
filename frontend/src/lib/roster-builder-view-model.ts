/**
 * Thin, reshape-only view-model boundary for POST /custom-rosters (decision
 * 0014), same reshape-only rule as view-model.ts: never calculates, infers,
 * or fabricates a value not already in the validated RosterBuilderResponse.
 *
 * `disclosures` reuses view-model.ts's ScenarioDisclosures type as-is — the
 * two responses share every field that type describes (provider/version/
 * data-version/epistemic-type/minutes-method/assumptions/attribution/model-
 * version/historical-only), so ScenarioDisclosuresPanel renders both without
 * modification.
 */
import type { RosterBuilderResponse } from "@/lib/api/roster-builder";
import type { ScenarioDisclosures } from "@/lib/view-model";

export interface RosterBuilderViewModel {
  season: string;
  playerIds: string[];
  rotation: RosterBuilderResponse["rotation"];
  contribution: number;
  teamProfile: RosterBuilderResponse["team_profile"];
  allocationRepairs: string[];
  disclosures: ScenarioDisclosures;
}

export function toRosterBuilderViewModel(response: RosterBuilderResponse): RosterBuilderViewModel {
  return {
    season: response.season,
    playerIds: response.player_ids,
    rotation: response.rotation,
    contribution: response.contribution,
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
