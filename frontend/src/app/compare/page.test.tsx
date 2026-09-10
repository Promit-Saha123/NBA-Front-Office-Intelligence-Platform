import { useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Same reactive next/navigation fake as ScenarioForm.test.tsx (see its own
// module comment for why push/replace also drive the real History API) —
// duplicated per-file per this codebase's existing convention rather than
// factored out, since vi.mock is file-scoped.
const routerMocks = vi.hoisted(() => {
  let search = "";
  const listeners = new Set<() => void>();
  return {
    getSearch: () => search,
    setSearch: (next: string) => {
      search = next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset: () => {
      search = "";
      window.history.replaceState(null, "", "/compare");
    },
  };
});

function queryOf(href: string): string {
  return new URL(href, "http://localhost/").search.slice(1);
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (href: string) => {
      window.history.pushState(null, "", href);
      routerMocks.setSearch(queryOf(href));
    },
    replace: (href: string) => {
      window.history.replaceState(null, "", href);
      routerMocks.setSearch(queryOf(href));
    },
  }),
  usePathname: () => "/compare",
  useSearchParams: () =>
    new URLSearchParams(useSyncExternalStore(routerMocks.subscribe, routerMocks.getSearch, routerMocks.getSearch)),
}));

const lookupMocks = vi.hoisted(() => ({
  listTeams: vi.fn(),
  getTeamRoster: vi.fn(),
  listSeasonPlayers: vi.fn(),
}));
vi.mock("@/lib/api/lookups", () => lookupMocks);

const scenarioMocks = vi.hoisted(() => ({ postScenario: vi.fn() }));
vi.mock("@/lib/api/scenarios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/scenarios")>();
  return { ...actual, postScenario: scenarioMocks.postScenario };
});

import Compare from "./page";
import type { ScenarioResponse } from "@/lib/api/scenarios";

const TEAMS = { season: "2014-15", teams: ["BOS", "GSW"] };
const GSW_ROSTER = {
  season: "2014-15",
  team_id: "GSW",
  players: [{ player_id: "barbole01", name: "Leandro Barbosa", minutes: 100 }],
};
const BOS_ROSTER = {
  season: "2014-15",
  team_id: "BOS",
  players: [{ player_id: "bradlav01", name: "Avery Bradley", minutes: 1800 }],
};
const SEASON_PLAYERS = {
  season: "2014-15",
  players: [
    { player_id: "barbole01", name: "Leandro Barbosa" },
    { player_id: "acyqu01", name: "Quincy Acy" },
    { player_id: "bradlav01", name: "Avery Bradley" },
    { player_id: "curryst01", name: "Stephen Curry" },
  ],
};

function scenarioResponse(overrides: Partial<ScenarioResponse>): ScenarioResponse {
  return {
    team_id: "GSW",
    season: "2014-15",
    player_out_id: "barbole01",
    player_in_id: "acyqu01",
    baseline_rotation: [{ player_id: "curryst01", minutes: 34.5 }],
    scenario_rotation: [{ player_id: "acyqu01", minutes: 6.6 }],
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
    explanation_factors: [],
    team_profile: [],
    historical_only: true,
    attribution: ["FiveThirtyEight NBA RAPTOR data, CC BY 4.0"],
    model_version: null,
    ...overrides,
  };
}

beforeEach(() => {
  routerMocks.reset();
  lookupMocks.listTeams.mockReset().mockResolvedValue(TEAMS);
  lookupMocks.listSeasonPlayers.mockReset().mockResolvedValue(SEASON_PLAYERS);
  lookupMocks.getTeamRoster
    .mockReset()
    .mockImplementation((_season: string, teamId: string) =>
      Promise.resolve(teamId === "GSW" ? GSW_ROSTER : BOS_ROSTER),
    );
  scenarioMocks.postScenario.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Compare page — two independent ScenarioForm instances", () => {
  it("gives each side unique, non-colliding field ids", async () => {
    render(<Compare />);
    await waitFor(() => expect(document.getElementById("a-team")).toBeInTheDocument());

    for (const suffix of ["season", "team", "player-out", "player-in", "provider"]) {
      expect(document.querySelectorAll(`#a-${suffix}`)).toHaveLength(1);
      expect(document.querySelectorAll(`#b-${suffix}`)).toHaveLength(1);
    }
  });

  it("selecting a team on side A does not affect side B's selection or URL params", async () => {
    const user = userEvent.setup();
    render(<Compare />);
    const teamA = document.getElementById("a-team") as HTMLSelectElement;
    const teamB = document.getElementById("b-team") as HTMLSelectElement;
    await waitFor(() => expect(teamA).not.toBeDisabled());

    await user.selectOptions(teamB, "BOS");
    await waitFor(() => expect(window.location.search).toContain("b_team_id=BOS"));

    await user.selectOptions(teamA, "GSW");
    await waitFor(() => expect(window.location.search).toContain("a_team_id=GSW"));

    // Side B's selection and URL param survived side A's independent update.
    expect(teamB).toHaveValue("BOS");
    expect(window.location.search).toContain("b_team_id=BOS");
  });

  it("runs an independent scenario on each side: select team, remove player, add player, run, both results display", async () => {
    scenarioMocks.postScenario.mockImplementation((request: { team_id: string }) =>
      Promise.resolve(
        request.team_id === "GSW"
          ? scenarioResponse({ team_id: "GSW", player_out_id: "barbole01", player_in_id: "acyqu01" })
          : scenarioResponse({
              team_id: "BOS",
              player_out_id: "bradlav01",
              player_in_id: "curryst01",
            }),
      ),
    );

    const user = userEvent.setup();
    render(<Compare />);
    const teamA = document.getElementById("a-team") as HTMLSelectElement;
    const teamB = document.getElementById("b-team") as HTMLSelectElement;
    await waitFor(() => expect(teamA).not.toBeDisabled());

    // Side A: GSW, remove Barbosa, add Acy.
    await user.selectOptions(teamA, "GSW");
    await waitFor(() => expect(document.getElementById("a-player-out")).not.toBeDisabled());
    await user.selectOptions(document.getElementById("a-player-out") as HTMLSelectElement, "barbole01");
    await user.selectOptions(document.getElementById("a-player-in") as HTMLSelectElement, "acyqu01");
    await user.selectOptions(document.getElementById("a-provider") as HTMLSelectElement, "historical_benchmark");

    // Side B: BOS, remove Bradley, add Curry.
    await user.selectOptions(teamB, "BOS");
    await waitFor(() => expect(document.getElementById("b-player-out")).not.toBeDisabled());
    await user.selectOptions(document.getElementById("b-player-out") as HTMLSelectElement, "bradlav01");
    await user.selectOptions(document.getElementById("b-player-in") as HTMLSelectElement, "curryst01");
    await user.selectOptions(document.getElementById("b-provider") as HTMLSelectElement, "synthetic");

    const [formA, formB] = Array.from(document.querySelectorAll("form"));
    await user.click(formA.querySelector('button[type="submit"]') as HTMLButtonElement);
    await user.click(formB.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => expect(scenarioMocks.postScenario).toHaveBeenCalledTimes(2));
    expect(scenarioMocks.postScenario).toHaveBeenCalledWith(
      expect.objectContaining({ team_id: "GSW", player_out_id: "barbole01", player_in_id: "acyqu01" }),
      expect.anything(),
    );
    expect(scenarioMocks.postScenario).toHaveBeenCalledWith(
      expect.objectContaining({ team_id: "BOS", player_out_id: "bradlav01", player_in_id: "curryst01" }),
      expect.anything(),
    );

    // Both results rendered — one "Scenario result" heading per side.
    await waitFor(() =>
      expect(screen.getAllByRole("heading", { name: /scenario result/i })).toHaveLength(2),
    );

    // Both submissions' URL params survived the second commit.
    expect(window.location.search).toContain("a_team_id=GSW");
    expect(window.location.search).toContain("b_team_id=BOS");
  });
});
