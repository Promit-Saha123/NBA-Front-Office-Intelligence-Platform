import { describe, expect, it } from "vitest";
import {
  applySelectionUpdate,
  EMPTY_SCENARIO_SELECTION,
  isCompleteSelection,
  parseScenarioSelection,
  serializeScenarioSelection,
  type ScenarioSelectionState,
} from "./url-state";

const FULL_SELECTION: ScenarioSelectionState = {
  season: "2014-15",
  teamId: "GSW",
  playerOutId: "barbole01",
  playerInId: "acyqu01",
  contributionProvider: "historical_benchmark",
};

describe("parseScenarioSelection", () => {
  it("parses a fully populated URL", () => {
    const params = serializeScenarioSelection(FULL_SELECTION);
    expect(parseScenarioSelection(params)).toEqual(FULL_SELECTION);
  });

  it("normalizes missing params to null, never throws", () => {
    const params = new URLSearchParams();
    expect(parseScenarioSelection(params)).toEqual(EMPTY_SCENARIO_SELECTION);
  });

  it("drops an unsupported season instead of passing it through", () => {
    const params = new URLSearchParams({ season: "1999-00" });
    expect(parseScenarioSelection(params).season).toBeNull();
  });

  it("never silently falls back to a default contribution_provider", () => {
    const withoutProvider = new URLSearchParams({ team_id: "GSW" });
    expect(parseScenarioSelection(withoutProvider).contributionProvider).toBeNull();

    const withInvalidProvider = new URLSearchParams({ contribution_provider: "pce" });
    expect(parseScenarioSelection(withInvalidProvider).contributionProvider).toBeNull();
  });

  it("treats an empty or whitespace-only id param as unset", () => {
    const params = new URLSearchParams({ team_id: "   " });
    expect(parseScenarioSelection(params).teamId).toBeNull();
  });

  it("trims surrounding whitespace from a valid id", () => {
    const params = new URLSearchParams({ team_id: "  GSW  " });
    expect(parseScenarioSelection(params).teamId).toBe("GSW");
  });
});

describe("serializeScenarioSelection", () => {
  it("omits null fields as absent params, not empty-string params", () => {
    const params = serializeScenarioSelection(EMPTY_SCENARIO_SELECTION);
    expect(params.toString()).toBe("");
    expect(params.has("season")).toBe(false);
  });

  it("never includes anything beyond the 5 known input fields", () => {
    const params = serializeScenarioSelection(FULL_SELECTION);
    const keys = Array.from(params.keys()).sort();
    expect(keys).toEqual(
      ["contribution_provider", "player_in_id", "player_out_id", "season", "team_id"].sort(),
    );
  });
});

describe("round-trip and back/forward stability", () => {
  it("round-trips a full selection through serialize -> parse", () => {
    expect(parseScenarioSelection(serializeScenarioSelection(FULL_SELECTION))).toEqual(
      FULL_SELECTION,
    );
  });

  it("is idempotent under repeated serialize/parse cycles (what back/forward relies on)", () => {
    const once = parseScenarioSelection(serializeScenarioSelection(FULL_SELECTION));
    const twice = parseScenarioSelection(serializeScenarioSelection(once));
    expect(twice).toEqual(once);
  });

  it("round-trips a partial selection without inventing values for the missing fields", () => {
    const partial: ScenarioSelectionState = {
      ...EMPTY_SCENARIO_SELECTION,
      season: "2014-15",
      teamId: "GSW",
    };
    expect(parseScenarioSelection(serializeScenarioSelection(partial))).toEqual(partial);
  });
});

describe("isCompleteSelection", () => {
  it("is true only when all 5 fields are set", () => {
    expect(isCompleteSelection(FULL_SELECTION)).toBe(true);
    expect(isCompleteSelection(EMPTY_SCENARIO_SELECTION)).toBe(false);
    expect(isCompleteSelection({ ...FULL_SELECTION, playerInId: null })).toBe(false);
  });
});

describe("applySelectionUpdate", () => {
  it("clears playerOutId when the team changes", () => {
    const next = applySelectionUpdate(FULL_SELECTION, { teamId: "BOS" });
    expect(next.teamId).toBe("BOS");
    expect(next.playerOutId).toBeNull();
    // playerInId has no team restriction in the backend, so it is left alone.
    expect(next.playerInId).toBe(FULL_SELECTION.playerInId);
  });

  it("does not clear playerOutId when the team is set to the same value", () => {
    const next = applySelectionUpdate(FULL_SELECTION, { teamId: "GSW" });
    expect(next.playerOutId).toBe(FULL_SELECTION.playerOutId);
  });

  it("does not clear playerOutId for an unrelated field update", () => {
    const next = applySelectionUpdate(FULL_SELECTION, {
      contributionProvider: "synthetic",
    });
    expect(next.playerOutId).toBe(FULL_SELECTION.playerOutId);
    expect(next.contributionProvider).toBe("synthetic");
  });

  it("does not clear anything when the season is set to its current value", () => {
    const next = applySelectionUpdate(FULL_SELECTION, { season: "2014-15" });
    expect(next).toEqual(FULL_SELECTION);
  });

  it("clears team and both players when the season actually changes", () => {
    // SUPPORTED_SEASONS has exactly one value today, so this can't happen via
    // the UI yet — cast a hypothetical second season to prove the cleanup
    // rule itself is correct before a second season ever ships.
    const hypotheticalSeason = "2015-16" as ScenarioSelectionState["season"];
    const next = applySelectionUpdate(FULL_SELECTION, { season: hypotheticalSeason });
    expect(next).toEqual({
      season: hypotheticalSeason,
      teamId: null,
      playerOutId: null,
      playerInId: null,
      contributionProvider: FULL_SELECTION.contributionProvider,
    });
  });
});
