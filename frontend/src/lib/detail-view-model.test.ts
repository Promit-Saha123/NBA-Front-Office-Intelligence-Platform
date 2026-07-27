import { describe, expect, it } from "vitest";
import type { PlayerDetailResponse, TeamDetailResponse } from "@/lib/api/detail";
import { toPlayerDetailViewModel, toTeamDetailViewModel } from "./detail-view-model";

function samplePlayerResponse(overrides: Partial<PlayerDetailResponse> = {}): PlayerDetailResponse {
  return {
    player_id: "curryst01",
    name: "Stephen Curry",
    season: "2014-15",
    minutes: 2613.0,
    possessions: 5524,
    team_stints: [{ team_id: "GSW", minutes: 2000.5, possessions: 4200 }],
    contribution_value: 4.2,
    offensive_impact: 3.1,
    defensive_impact: 1.1,
    provider_type: "historical_raptor_benchmark",
    provider_version: "historical-raptor-benchmark-v1",
    data_version: "fivethirtyeight-nba-raptor-2022-11-29",
    contribution_epistemic_type: "historical_benchmark",
    attribution: ["FiveThirtyEight NBA RAPTOR data, CC BY 4.0"],
    ...overrides,
  };
}

function sampleTeamResponse(overrides: Partial<TeamDetailResponse> = {}): TeamDetailResponse {
  return {
    team_id: "GSW",
    season: "2014-15",
    players: [{ player_id: "curryst01", name: "Stephen Curry", minutes: 2000.5 }],
    roster_size: 1,
    total_roster_minutes: 2000.5,
    ...overrides,
  };
}

describe("toPlayerDetailViewModel", () => {
  it("reshapes every field verbatim, never computing a new value", () => {
    const response = samplePlayerResponse();
    const vm = toPlayerDetailViewModel(response);
    expect(vm).toEqual({
      playerId: response.player_id,
      name: response.name,
      season: response.season,
      minutes: response.minutes,
      possessions: response.possessions,
      teamStints: [{ teamId: "GSW", minutes: 2000.5, possessions: 4200 }],
      contributionValue: response.contribution_value,
      offensiveImpact: response.offensive_impact,
      defensiveImpact: response.defensive_impact,
      providerType: response.provider_type,
      providerVersion: response.provider_version,
      dataVersion: response.data_version,
      contributionEpistemicType: response.contribution_epistemic_type,
      attribution: response.attribution,
    });
  });

  it("preserves multiple team stints for a traded player, in order", () => {
    const vm = toPlayerDetailViewModel(
      samplePlayerResponse({
        team_stints: [
          { team_id: "DEN", minutes: 1750, possessions: 3516 },
          { team_id: "POR", minutes: 752, possessions: 1490 },
        ],
      }),
    );
    expect(vm.teamStints).toEqual([
      { teamId: "DEN", minutes: 1750, possessions: 3516 },
      { teamId: "POR", minutes: 752, possessions: 1490 },
    ]);
  });

  it("preserves an empty team_stints list as an empty array, not an invented placeholder", () => {
    const vm = toPlayerDetailViewModel(samplePlayerResponse({ team_stints: [] }));
    expect(vm.teamStints).toEqual([]);
  });
});

describe("toTeamDetailViewModel", () => {
  it("reshapes players and aggregates verbatim, never computing a new value", () => {
    const response = sampleTeamResponse();
    const vm = toTeamDetailViewModel(response);
    expect(vm.players).toEqual([{ playerId: "curryst01", name: "Stephen Curry", minutes: 2000.5 }]);
    expect(vm.rosterSize).toBe(response.roster_size);
    expect(vm.totalRosterMinutes).toBe(response.total_roster_minutes);
  });

  it("preserves an empty roster as an empty array, not an invented placeholder", () => {
    const vm = toTeamDetailViewModel(sampleTeamResponse({ players: [], roster_size: 0, total_roster_minutes: 0 }));
    expect(vm.players).toEqual([]);
  });
});
