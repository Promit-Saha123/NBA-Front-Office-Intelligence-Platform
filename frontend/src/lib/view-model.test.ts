import { describe, expect, it } from "vitest";
import type { ScenarioResponse } from "@/lib/api/scenarios";
import { toScenarioViewModel } from "./view-model";

function sampleResponse(overrides: Partial<ScenarioResponse> = {}): ScenarioResponse {
  return {
    team_id: "GSW",
    season: "2014-15",
    player_out_id: "barbole01",
    player_in_id: "acyqu01",
    baseline_rotation: [
      { player_id: "curryst01", minutes: 34.5 },
      { player_id: "barbole01", minutes: 6.6 },
    ],
    scenario_rotation: [
      { player_id: "curryst01", minutes: 34.5 },
      { player_id: "acyqu01", minutes: 6.6 },
      { player_id: "barbole01", minutes: 0.0 },
    ],
    baseline_contribution: -1.83,
    scenario_contribution: -1.87,
    contribution_change: -0.04,
    provider_type: "historical_raptor_benchmark",
    provider_version: "historical-raptor-benchmark-v1",
    data_version: "fivethirtyeight-nba-raptor-2022-11-29",
    contribution_epistemic_type: "historical_benchmark",
    minutes_method: "heuristic-v1",
    minutes_assumptions: { editable: false, validated: false, total_minutes: 240 },
    allocation_repairs: [],
    explanation_factors: [
      {
        metric: "team_contribution",
        baseline_value: -1.83,
        scenario_value: -1.87,
        change: -0.04,
        direction: "decrease",
        importance: 1.0,
      },
    ],
    team_profile: [
      {
        category: "offensive_impact",
        baseline_value: 1.2,
        scenario_value: 1.5,
        change: 0.3,
        direction: "increase",
        epistemic_type: "descriptive_interpretation",
      },
    ],
    historical_only: true,
    attribution: ["FiveThirtyEight NBA RAPTOR data, CC BY 4.0"],
    model_version: null,
    ...overrides,
  };
}

describe("toScenarioViewModel", () => {
  it("preserves model_version verbatim as null — never fabricates a value", () => {
    const vm = toScenarioViewModel(sampleResponse({ model_version: null }));
    expect(vm.disclosures.modelVersion).toBeNull();
  });

  it("preserves a future non-null model_version verbatim too", () => {
    const vm = toScenarioViewModel(sampleResponse({ model_version: "pce-v1" }));
    expect(vm.disclosures.modelVersion).toBe("pce-v1");
  });

  it("preserves contribution values exactly, without recalculating them", () => {
    const response = sampleResponse();
    const vm = toScenarioViewModel(response);
    expect(vm.baselineContribution).toBe(response.baseline_contribution);
    expect(vm.scenarioContribution).toBe(response.scenario_contribution);
    expect(vm.contributionChange).toBe(response.contribution_change);
  });

  it("passes explanation factors through unmodified — never generates new ones", () => {
    const response = sampleResponse();
    const vm = toScenarioViewModel(response);
    expect(vm.explanationFactors).toEqual(response.explanation_factors);
  });

  it("passes team profile through unmodified — never generates new ones", () => {
    const response = sampleResponse();
    const vm = toScenarioViewModel(response);
    expect(vm.teamProfile).toEqual(response.team_profile);
  });

  it("groups disclosure fields verbatim from the response", () => {
    const response = sampleResponse();
    const vm = toScenarioViewModel(response);
    expect(vm.disclosures).toEqual({
      providerType: response.provider_type,
      providerVersion: response.provider_version,
      dataVersion: response.data_version,
      contributionEpistemicType: response.contribution_epistemic_type,
      minutesMethod: response.minutes_method,
      minutesAssumptions: response.minutes_assumptions,
      attribution: response.attribution,
      modelVersion: response.model_version,
      historicalOnly: response.historical_only,
    });
  });

  it("pairs rotation entries by player_id, preserving baseline order first", () => {
    const vm = toScenarioViewModel(sampleResponse());
    expect(vm.rotationComparison).toEqual([
      { playerId: "curryst01", baselineMinutes: 34.5, scenarioMinutes: 34.5 },
      { playerId: "barbole01", baselineMinutes: 6.6, scenarioMinutes: 0.0 },
      { playerId: "acyqu01", baselineMinutes: null, scenarioMinutes: 6.6 },
    ]);
  });

  it("marks a player present in scenario but absent from baseline with baselineMinutes: null", () => {
    const response = sampleResponse({
      baseline_rotation: [{ player_id: "curryst01", minutes: 34.5 }],
      scenario_rotation: [
        { player_id: "curryst01", minutes: 34.5 },
        { player_id: "acyqu01", minutes: 10.0 },
      ],
    });
    const vm = toScenarioViewModel(response);
    const incoming = vm.rotationComparison.find((row) => row.playerId === "acyqu01");
    expect(incoming).toEqual({ playerId: "acyqu01", baselineMinutes: null, scenarioMinutes: 10.0 });
  });

  it("marks a player present in baseline but absent from scenario with scenarioMinutes: null", () => {
    const response = sampleResponse({
      baseline_rotation: [
        { player_id: "curryst01", minutes: 34.5 },
        { player_id: "droppedplayer01", minutes: 4.0 },
      ],
      scenario_rotation: [{ player_id: "curryst01", minutes: 34.5 }],
    });
    const vm = toScenarioViewModel(response);
    const dropped = vm.rotationComparison.find((row) => row.playerId === "droppedplayer01");
    expect(dropped).toEqual({ playerId: "droppedplayer01", baselineMinutes: 4.0, scenarioMinutes: null });
  });

  it("does not add any field beyond what the response and reshaping produce", () => {
    const vm = toScenarioViewModel(sampleResponse());
    // Guards against a "projected wins"-style invented metric ever being added here.
    expect(Object.keys(vm).sort()).toEqual(
      [
        "teamId",
        "season",
        "playerOutId",
        "playerInId",
        "rotationComparison",
        "baselineContribution",
        "scenarioContribution",
        "contributionChange",
        "explanationFactors",
        "teamProfile",
        "allocationRepairs",
        "disclosures",
      ].sort(),
    );
  });
});
