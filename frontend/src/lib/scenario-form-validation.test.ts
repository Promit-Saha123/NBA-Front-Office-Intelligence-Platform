import { describe, expect, it } from "vitest";
import { deriveScenarioFormState, type ScenarioFormValidationInput } from "./scenario-form-validation";
import { EMPTY_SCENARIO_SELECTION, type ScenarioSelectionState } from "./url-state";

const FULL_SELECTION: ScenarioSelectionState = {
  season: "2014-15",
  teamId: "GSW",
  playerOutId: "barbole01",
  playerInId: "acyqu01",
  contributionProvider: "historical_benchmark",
};

const BASE_INPUT: ScenarioFormValidationInput = {
  selection: EMPTY_SCENARIO_SELECTION,
  knownTeamIds: [],
  teamsLoaded: false,
  rosterPlayers: [],
  rosterLoaded: false,
  submissionStatus: "idle",
  successResult: null,
  submittedProvider: null,
};

describe("deriveScenarioFormState — teamNotFoundInvalid", () => {
  it("is false when teams haven't loaded yet, even for an unknown id", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: { ...EMPTY_SCENARIO_SELECTION, teamId: "ZZZ" },
      teamsLoaded: false,
    });
    expect(result.teamNotFoundInvalid).toBe(false);
  });

  it("is true once teams have loaded and the id isn't among them", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: { ...EMPTY_SCENARIO_SELECTION, teamId: "ZZZ" },
      knownTeamIds: ["GSW", "ATL"],
      teamsLoaded: true,
    });
    expect(result.teamNotFoundInvalid).toBe(true);
  });

  it("is false for a known team id", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: { ...EMPTY_SCENARIO_SELECTION, teamId: "GSW" },
      knownTeamIds: ["GSW", "ATL"],
      teamsLoaded: true,
    });
    expect(result.teamNotFoundInvalid).toBe(false);
  });
});

describe("deriveScenarioFormState — same-player and roster-membership flags", () => {
  it("flags samePlayerInvalid when both selections match", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: { ...EMPTY_SCENARIO_SELECTION, playerOutId: "curryst01", playerInId: "curryst01" },
    });
    expect(result.samePlayerInvalid).toBe(true);
  });

  it("does not flag samePlayerInvalid when only one side is chosen", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: { ...EMPTY_SCENARIO_SELECTION, playerOutId: "curryst01" },
    });
    expect(result.samePlayerInvalid).toBe(false);
  });

  it("flags playerInAlreadyOnRosterInvalid regardless of whether the roster has loaded", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: { ...EMPTY_SCENARIO_SELECTION, playerInId: "curryst01" },
      rosterPlayers: [{ player_id: "curryst01" }],
      rosterLoaded: false,
    });
    expect(result.playerInAlreadyOnRosterInvalid).toBe(true);
  });

  it("does not flag playerOutNotOnRosterInvalid before the roster has loaded", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: { ...EMPTY_SCENARIO_SELECTION, playerOutId: "curryst01" },
      rosterPlayers: [],
      rosterLoaded: false,
    });
    expect(result.playerOutNotOnRosterInvalid).toBe(false);
  });

  it("flags playerOutNotOnRosterInvalid once the roster has loaded and the id is absent", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: { ...EMPTY_SCENARIO_SELECTION, playerOutId: "curryst01" },
      rosterPlayers: [{ player_id: "someoneelse01" }],
      rosterLoaded: true,
    });
    expect(result.playerOutNotOnRosterInvalid).toBe(true);
  });

  it("exposes the roster player ids as a reusable Set", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      rosterPlayers: [{ player_id: "a" }, { player_id: "b" }],
    });
    expect(result.rosterPlayerIds).toEqual(new Set(["a", "b"]));
  });
});

describe("deriveScenarioFormState — submitDisabled", () => {
  it("is disabled when the selection is incomplete", () => {
    const result = deriveScenarioFormState(BASE_INPUT);
    expect(result.submitDisabled).toBe(true);
  });

  it("is enabled for a complete, valid selection", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: FULL_SELECTION,
      knownTeamIds: ["GSW"],
      teamsLoaded: true,
      rosterPlayers: [{ player_id: "barbole01" }],
      rosterLoaded: true,
    });
    expect(result.submitDisabled).toBe(false);
  });

  it("stays disabled while a submission is loading, even with a valid selection", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: FULL_SELECTION,
      knownTeamIds: ["GSW"],
      teamsLoaded: true,
      rosterPlayers: [{ player_id: "barbole01" }],
      rosterLoaded: true,
      submissionStatus: "loading",
    });
    expect(result.submitDisabled).toBe(true);
  });

  it("is disabled when a validation flag is true even if the selection is otherwise complete", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: { ...FULL_SELECTION, playerInId: FULL_SELECTION.playerOutId },
      knownTeamIds: ["GSW"],
      teamsLoaded: true,
      rosterPlayers: [{ player_id: "barbole01" }],
      rosterLoaded: true,
    });
    expect(result.submitDisabled).toBe(true);
  });
});

describe("deriveScenarioFormState — hasAnythingToClear", () => {
  it("is false for an empty selection with no submission", () => {
    const result = deriveScenarioFormState(BASE_INPUT);
    expect(result.hasAnythingToClear).toBe(false);
  });

  it("is true once any field is set", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: { ...EMPTY_SCENARIO_SELECTION, teamId: "GSW" },
    });
    expect(result.hasAnythingToClear).toBe(true);
  });

  it("is true once a submission has happened, even with an empty selection", () => {
    const result = deriveScenarioFormState({ ...BASE_INPUT, submissionStatus: "error" });
    expect(result.hasAnythingToClear).toBe(true);
  });
});

describe("deriveScenarioFormState — resultStale", () => {
  const successResult = { teamId: "GSW", playerOutId: "barbole01", playerInId: "acyqu01" };

  it("is false when no result is shown", () => {
    const result = deriveScenarioFormState({ ...BASE_INPUT, successResult: null });
    expect(result.resultStale).toBe(false);
  });

  it("is false when the current selection still matches the shown result", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: FULL_SELECTION,
      successResult,
      submittedProvider: "historical_benchmark",
    });
    expect(result.resultStale).toBe(false);
  });

  it("is true once the team selection diverges from the shown result", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: { ...FULL_SELECTION, teamId: "ATL" },
      successResult,
      submittedProvider: "historical_benchmark",
    });
    expect(result.resultStale).toBe(true);
  });

  it("is true once the provider selection diverges from what was submitted", () => {
    const result = deriveScenarioFormState({
      ...BASE_INPUT,
      selection: FULL_SELECTION,
      successResult,
      submittedProvider: "synthetic",
    });
    expect(result.resultStale).toBe(true);
  });
});
