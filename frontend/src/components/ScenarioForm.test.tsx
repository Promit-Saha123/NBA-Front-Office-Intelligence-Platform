import { useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---- Fake, reactive next/navigation router (see module comment below) ----
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
    push: vi.fn(),
    replace: vi.fn(),
    reset: () => {
      search = "";
      routerMocks.push.mockClear();
      routerMocks.replace.mockClear();
    },
  };
});

/**
 * A minimal, reactive fake of next/navigation: router.push/replace update a
 * module-level "current URL" and notify subscribers via useSyncExternalStore,
 * so useSearchParams() re-renders consumers the same way real client-side
 * navigation would — without an actual Next.js router (no official test
 * utility exists for this as of writing).
 */
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (href: string, options?: unknown) => {
      routerMocks.push(href, options);
      routerMocks.setSearch(href.includes("?") ? href.slice(href.indexOf("?") + 1) : "");
    },
    replace: (href: string, options?: unknown) => {
      routerMocks.replace(href, options);
      routerMocks.setSearch(href.includes("?") ? href.slice(href.indexOf("?") + 1) : "");
    },
  }),
  usePathname: () => "/",
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

import { ScenarioForm } from "./ScenarioForm";
import { ScenarioApiError } from "@/lib/api/errors";
import type { ScenarioResponse } from "@/lib/api/scenarios";

const TEAMS = { season: "2014-15", teams: ["BOS", "GSW"] };
const GSW_ROSTER = {
  season: "2014-15",
  team_id: "GSW",
  players: [
    { player_id: "barbole01", name: "Leandro Barbosa", minutes: 100 },
    { player_id: "curryst01", name: "Stephen Curry", minutes: 2000 },
  ],
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
    { player_id: "curryst01", name: "Stephen Curry" },
    { player_id: "acyqu01", name: "Quincy Acy" },
    { player_id: "bradlav01", name: "Avery Bradley" },
  ],
};

const VALID_RESPONSE: ScenarioResponse = {
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
  historical_only: true,
  attribution: ["FiveThirtyEight NBA RAPTOR data, CC BY 4.0"],
  model_version: null,
};

function setInitialUrl(query: string) {
  routerMocks.setSearch(query.replace(/^\?/, ""));
}

async function waitForTeamsLoaded() {
  await waitFor(() => expect(screen.getByLabelText(/^team/i)).not.toBeDisabled());
}

async function selectTeam(user: ReturnType<typeof userEvent.setup>, teamId: string) {
  await waitForTeamsLoaded();
  await user.selectOptions(screen.getByLabelText(/^team/i), teamId);
  await waitFor(() => expect(screen.getByLabelText(/player to remove/i)).not.toBeDisabled());
}

async function fillValidSelection(user: ReturnType<typeof userEvent.setup>) {
  await selectTeam(user, "GSW");
  await user.selectOptions(screen.getByLabelText(/player to remove/i), "barbole01");
  await user.selectOptions(screen.getByLabelText(/player to add/i), "acyqu01");
  await user.selectOptions(screen.getByLabelText(/contribution provider/i), "historical_benchmark");
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
  scenarioMocks.postScenario.mockReset().mockResolvedValue(VALID_RESPONSE);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("initial state from the URL", () => {
  it("normalizes an empty URL to the locked season via router.replace (an edit, not a submission)", async () => {
    render(<ScenarioForm />);
    await waitFor(() => expect(routerMocks.replace).toHaveBeenCalledWith("/?season=2014-15", { scroll: false }));
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it("hydrates team/player/provider selections already present in the URL", async () => {
    setInitialUrl(
      "season=2014-15&team_id=GSW&player_out_id=barbole01&player_in_id=acyqu01&contribution_provider=historical_benchmark",
    );
    render(<ScenarioForm />);
    await waitFor(() => expect(screen.getByLabelText(/^team/i)).toHaveValue("GSW"));
    await waitFor(() => expect(screen.getByLabelText(/player to remove/i)).toHaveValue("barbole01"));
    expect(screen.getByLabelText(/player to add/i)).toHaveValue("acyqu01");
    expect(screen.getByLabelText(/contribution provider/i)).toHaveValue("historical_benchmark");
  });

  it("treats a malformed contribution_provider as unset, not a silently-accepted value", async () => {
    setInitialUrl("season=2014-15&contribution_provider=not-a-real-provider");
    render(<ScenarioForm />);
    await waitFor(() => expect(screen.getByLabelText(/^team/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/contribution provider/i)).toHaveValue("");
    expect(screen.getByRole("button", { name: /run scenario/i })).toBeDisabled();
  });

  it("treats missing parameters as an empty, valid initial state (never throws)", async () => {
    render(<ScenarioForm />);
    expect(screen.getByLabelText(/^team/i)).toHaveValue("");
    expect(screen.getByRole("button", { name: /run scenario/i })).toBeDisabled();
  });
});

describe("dependent-field cleanup", () => {
  it("clears the outgoing player when the team changes", async () => {
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await selectTeam(user, "GSW");
    await user.selectOptions(screen.getByLabelText(/player to remove/i), "barbole01");
    expect(screen.getByLabelText(/player to remove/i)).toHaveValue("barbole01");

    await selectTeam(user, "BOS");
    await waitFor(() => expect(screen.getByLabelText(/player to remove/i)).toHaveValue(""));
  });
});

describe("selection-prevention rules", () => {
  it("excludes the selected team's current roster from the player-in options", async () => {
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await selectTeam(user, "GSW");

    const playerIn = screen.getByLabelText(/player to add/i) as HTMLSelectElement;
    const optionValues = within(playerIn)
      .getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value);
    // barbole01 and curryst01 are on GSW's roster — must not be offered as incoming.
    expect(optionValues).not.toContain("barbole01");
    expect(optionValues).not.toContain("curryst01");
    expect(optionValues).toContain("acyqu01");
  });

  it("keeps submit disabled without an explicit contribution provider (no fallback)", async () => {
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await selectTeam(user, "GSW");
    await user.selectOptions(screen.getByLabelText(/player to remove/i), "barbole01");
    await user.selectOptions(screen.getByLabelText(/player to add/i), "acyqu01");

    expect(screen.getByRole("button", { name: /run scenario/i })).toBeDisabled();
  });

  it("flags a URL-supplied team id that isn't a real team, on the team field itself", async () => {
    setInitialUrl("season=2014-15&team_id=ZZZ");
    render(<ScenarioForm />);
    await waitForTeamsLoaded();
    await waitFor(() =>
      expect(screen.getByText(/that team wasn't found for this season/i)).toBeInTheDocument(),
    );
    const team = screen.getByLabelText(/^team/i);
    // The invalid id stays visible (not silently blanked) so the error text is legible.
    expect(team).toHaveValue("ZZZ");
    expect(team).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: /run scenario/i })).toBeDisabled();
  });

  it("flags a URL-supplied player-out id that isn't on the selected team's roster", async () => {
    setInitialUrl(
      "season=2014-15&team_id=GSW&player_out_id=not-on-roster&player_in_id=acyqu01&contribution_provider=historical_benchmark",
    );
    render(<ScenarioForm />);
    await waitFor(() =>
      expect(screen.getByText(/isn't on this team's roster/i)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/player to remove/i)).toHaveValue("not-on-roster");
    expect(screen.getByRole("button", { name: /run scenario/i })).toBeDisabled();
  });

  it("disables player-in while the team roster is still loading, even after teams/players have loaded", async () => {
    let resolveRoster: (value: typeof GSW_ROSTER) => void = () => {};
    lookupMocks.getTeamRoster.mockReturnValue(
      new Promise((resolve) => {
        resolveRoster = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await waitForTeamsLoaded();
    await user.selectOptions(screen.getByLabelText(/^team/i), "GSW");

    // Roster fetch is still pending — player-in must not yet be enabled with
    // an unfiltered (potentially roster-inclusive) option list.
    expect(screen.getByLabelText(/player to add/i)).toBeDisabled();

    resolveRoster(GSW_ROSTER);
    await waitFor(() => expect(screen.getByLabelText(/player to add/i)).not.toBeDisabled());
  });
});

describe("submission", () => {
  it("calls postScenario with the exact normalized request and pushes the submitted URL", async () => {
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await fillValidSelection(user);

    const button = screen.getByRole("button", { name: /run scenario/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    await user.click(button);

    expect(scenarioMocks.postScenario).toHaveBeenCalledWith(
      {
        team_id: "GSW",
        season: "2014-15",
        player_out_id: "barbole01",
        player_in_id: "acyqu01",
        contribution_provider: "historical_benchmark",
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(routerMocks.push).toHaveBeenCalledWith(
      "/?season=2014-15&team_id=GSW&player_out_id=barbole01&player_in_id=acyqu01&contribution_provider=historical_benchmark",
      { scroll: false },
    );
  });

  it("shows a busy submit button and an announced loading region while in flight", async () => {
    let resolvePromise: (value: ScenarioResponse) => void = () => {};
    scenarioMocks.postScenario.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await fillValidSelection(user);
    const button = screen.getByRole("button", { name: /run scenario/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    await user.click(button);

    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(/calculating/i);

    resolvePromise(VALID_RESPONSE);
    await waitFor(() => expect(screen.getByText(/completed successfully/i)).toBeInTheDocument());
  });

  it("announces success to assistive tech via the live status region, not only in the static preview", async () => {
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await fillValidSelection(user);
    const button = screen.getByRole("button", { name: /run scenario/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    await user.click(button);

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/completed successfully/i),
    );
  });

  it("shows the CC BY 4.0 attribution in the success preview", async () => {
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await fillValidSelection(user);
    const button = screen.getByRole("button", { name: /run scenario/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    await user.click(button);

    await waitFor(() =>
      expect(screen.getByText(/FiveThirtyEight NBA RAPTOR data, CC BY 4\.0/)).toBeInTheDocument(),
    );
  });

  it("blocks duplicate submission while a request is in flight", async () => {
    let resolvePromise: (value: ScenarioResponse) => void = () => {};
    scenarioMocks.postScenario.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await fillValidSelection(user);
    const button = screen.getByRole("button", { name: /run scenario/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    await user.click(button);
    // Disabled now — a second click cannot fire a submit at all.
    await user.click(button);

    resolvePromise(VALID_RESPONSE);
    await waitFor(() => expect(scenarioMocks.postScenario).toHaveBeenCalledTimes(1));
  });

  it("disables every field while a request is in flight (prevents the stale-selection race by construction)", async () => {
    let resolvePromise: (value: ScenarioResponse) => void = () => {};
    scenarioMocks.postScenario.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await fillValidSelection(user);
    await user.click(screen.getByRole("button", { name: /run scenario/i }));

    expect(screen.getByLabelText(/^team/i)).toBeDisabled();
    expect(screen.getByLabelText(/player to remove/i)).toBeDisabled();
    expect(screen.getByLabelText(/player to add/i)).toBeDisabled();
    expect(screen.getByLabelText(/contribution provider/i)).toBeDisabled();

    resolvePromise(VALID_RESPONSE);
    await waitFor(() => expect(screen.getByLabelText(/^team/i)).not.toBeDisabled());
  });

  it("aborts the in-flight request on unmount without throwing", async () => {
    let capturedSignal: AbortSignal | undefined;
    scenarioMocks.postScenario.mockImplementation(
      (_req: unknown, options?: { signal?: AbortSignal }) =>
        new Promise(() => {
          capturedSignal = options?.signal;
        }),
    );
    const user = userEvent.setup();
    const { unmount } = render(<ScenarioForm />);
    await fillValidSelection(user);
    await user.click(screen.getByRole("button", { name: /run scenario/i }));

    expect(() => unmount()).not.toThrow();
    expect(capturedSignal?.aborted).toBe(true);
  });

  it("preserves the user's selections after a failed submission", async () => {
    scenarioMocks.postScenario.mockRejectedValue(
      new ScenarioApiError({ status: 404, code: "TEAM_NOT_FOUND", message: "That team wasn't found." }),
    );
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await fillValidSelection(user);
    await user.click(screen.getByRole("button", { name: /run scenario/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByLabelText(/^team/i)).toHaveValue("GSW");
    expect(screen.getByLabelText(/player to remove/i)).toHaveValue("barbole01");
    expect(screen.getByLabelText(/player to add/i)).toHaveValue("acyqu01");
  });
});

describe("error display", () => {
  async function submitWithError(error: ScenarioApiError) {
    scenarioMocks.postScenario.mockRejectedValue(error);
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await fillValidSelection(user);
    await user.click(screen.getByRole("button", { name: /run scenario/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  }

  it("shows an actionable message for a known domain error and preserves its code for diagnostics", async () => {
    await submitWithError(
      new ScenarioApiError({
        status: 409,
        code: "PLAYER_ALREADY_ON_ROSTER",
        message: "The incoming player is already on this team's roster.",
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("already on this team's roster");
  });

  it("shows an actionable message for a FastAPI validation error", async () => {
    await submitWithError(
      new ScenarioApiError({ status: 422, code: "FASTAPI_VALIDATION_ERROR", message: "Check your selections and try again." }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/check your selections/i);
  });

  it("shows an actionable message for a network error, never raw HTTP text", async () => {
    await submitWithError(
      new ScenarioApiError({ status: 0, code: "NETWORK_ERROR", message: "Could not reach the server. Check your connection and try again." }),
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/could not reach the server/i);
    expect(alert).not.toHaveTextContent(/422|500|Unprocessable Entity/i);
  });

  it("shows an actionable message for an invalid response shape", async () => {
    await submitWithError(
      new ScenarioApiError({ status: 200, code: "INVALID_RESPONSE_SHAPE", message: "The server returned an unexpected response." }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/unexpected response/i);
  });

  it("shows an actionable message for a client configuration error", async () => {
    await submitWithError(
      new ScenarioApiError({ status: 0, code: "CLIENT_CONFIGURATION_ERROR", message: "This app isn't configured correctly. Please try again later." }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/configured correctly/i);
  });

  it("never renders devDetail in the error region", async () => {
    await submitWithError(
      new ScenarioApiError({
        status: 500,
        code: "UNKNOWN_ERROR",
        message: "Something went wrong on our end. Please try again.",
        devDetail: "raw backend stack trace or internal detail",
      }),
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("raw backend stack trace");
  });

  it("moves focus to the error region when an error appears", async () => {
    await submitWithError(
      new ScenarioApiError({ status: 500, code: "UNKNOWN_ERROR", message: "Something went wrong on our end. Please try again." }),
    );
    expect(document.activeElement).toBe(screen.getByRole("alert"));
  });

  it("never retries with a different provider after an error", async () => {
    await submitWithError(
      new ScenarioApiError({ status: 422, code: "MISSING_CONTRIBUTION", message: "No contribution value is available for one of the selected players." }),
    );
    expect(scenarioMocks.postScenario).toHaveBeenCalledTimes(1);
    expect(scenarioMocks.postScenario).toHaveBeenCalledWith(
      expect.objectContaining({ contribution_provider: "historical_benchmark" }),
      expect.anything(),
    );
  });
});

const RESULTS_RESPONSE: ScenarioResponse = {
  ...VALID_RESPONSE,
  baseline_rotation: [
    { player_id: "curryst01", minutes: 200 },
    { player_id: "barbole01", minutes: 40 },
  ],
  // Mirrors backend/scenario/service.py: the outgoing player is carried into
  // scenario_rotation at 0 minutes, not omitted — never null in the real contract.
  scenario_rotation: [
    { player_id: "curryst01", minutes: 200 },
    { player_id: "acyqu01", minutes: 40 },
    { player_id: "barbole01", minutes: 0 },
  ],
  allocation_repairs: ["baseline: capped a player at the max"],
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
};

describe("results and disclosures (UI-003)", () => {
  async function submitAndGetResults() {
    scenarioMocks.postScenario.mockResolvedValue(RESULTS_RESPONSE);
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await fillValidSelection(user);
    const button = screen.getByRole("button", { name: /run scenario/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    await user.click(button);
    await waitFor(() => expect(screen.getByText(/completed successfully/i)).toBeInTheDocument());
  }

  it("shows the rotation comparison with resolved player names and a 240-minute total on each side", async () => {
    await submitAndGetResults();

    // Two tables exist now (the read-only comparison, and the editable-minutes
    // table below it) — this checks the read-only one specifically.
    const table = screen.getAllByRole("table")[0];
    expect(within(table).getByText("Stephen Curry")).toBeInTheDocument();
    expect(within(table).getByText("Leandro Barbosa")).toBeInTheDocument();
    expect(within(table).getByText("Quincy Acy")).toBeInTheDocument();

    const rows = within(table).getAllByRole("row");
    const totalRow = rows[rows.length - 1];
    expect(within(totalRow).getAllByText("240.0")).toHaveLength(2);
  });

  it("labels the outgoing and incoming players as Removed/Added, not by color alone", async () => {
    await submitAndGetResults();

    const table = screen.getAllByRole("table")[0];
    const barbosaRow = within(table).getByText("Leandro Barbosa").closest("tr")!;
    expect(within(barbosaRow).getByText("Removed")).toBeInTheDocument();
    const acyRow = within(table).getByText("Quincy Acy").closest("tr")!;
    expect(within(acyRow).getByText("Added")).toBeInTheDocument();
  });

  it("shows the allocation repairs note when the response includes one", async () => {
    await submitAndGetResults();
    expect(screen.getByText(/capped a player at the max/i)).toBeInTheDocument();
  });

  it("renders explanation factors traceable to the calculated baseline/scenario values", async () => {
    await submitAndGetResults();
    expect(screen.getByText("Team contribution")).toBeInTheDocument();
    expect(screen.getByText(/-1\.830 → -1\.870/)).toBeInTheDocument();
    expect(screen.getByText(/Decreased/)).toBeInTheDocument();
  });

  it("renders the historical-prototype banner, provider badge, and not-a-prediction disclaimer", async () => {
    await submitAndGetResults();
    expect(
      screen.getByText(/historical prototype.*simulates roster scenarios from the 2014-15 nba season/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/historical raptor benchmark.*fivethirtyeight's raptor dataset/i)).toBeInTheDocument();
    expect(
      screen.getByText(/scenario estimates describe a historical what-if under stated assumptions/i),
    ).toBeInTheDocument();
  });

  it("renders the required attribution footer verbatim, alongside the provider's own citation", async () => {
    await submitAndGetResults();
    expect(
      screen.getByText(/team game data: nba elo by fivethirtyeight.*not affiliated with or endorsed by fivethirtyeight, abc news, or the nba/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/FiveThirtyEight NBA RAPTOR data, CC BY 4\.0/)).toBeInTheDocument();
  });

  it("renders an explicit not-applicable state for model_version, never hiding the field", async () => {
    await submitAndGetResults();
    expect(screen.getByText(/not applicable.*no trained model/i)).toBeInTheDocument();
  });

  it("shows the synthetic-provider badge instead when that provider was used", async () => {
    scenarioMocks.postScenario.mockResolvedValue({
      ...RESULTS_RESPONSE,
      provider_type: "synthetic",
      contribution_epistemic_type: "synthetic_estimate",
    });
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await fillValidSelection(user);
    const button = screen.getByRole("button", { name: /run scenario/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    await user.click(button);

    await waitFor(() =>
      expect(screen.getByText(/synthetic contribution estimate.*not derived from real player data/i)).toBeInTheDocument(),
    );
  });

  it("shows the minutes method and minutes assumptions", async () => {
    await submitAndGetResults();
    expect(screen.getByText("heuristic-v1")).toBeInTheDocument();
    expect(screen.getByText(/total minutes: 240/i)).toBeInTheDocument();
  });

  it("explains via allocation_repairs, rather than silently omitting a row, when the incoming player is cut by the rotation-size cap", async () => {
    // Real shape observed from a live backend call: when the incoming
    // player's inherited minutes weight is too low for the rotation-size
    // cap, scenario_rotation has no entry for them at all (not even zero) —
    // only the outgoing player is guaranteed a zero-minute entry.
    scenarioMocks.postScenario.mockResolvedValue({
      ...RESULTS_RESPONSE,
      baseline_rotation: [{ player_id: "curryst01", minutes: 240 }],
      scenario_rotation: [
        { player_id: "curryst01", minutes: 240 },
        { player_id: "barbole01", minutes: 0 },
      ],
      allocation_repairs: ["scenario: excluded (rotation size limit): ['acyqu01']"],
    });
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await fillValidSelection(user);
    const button = screen.getByRole("button", { name: /run scenario/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    await user.click(button);
    await waitFor(() => expect(screen.getByText(/completed successfully/i)).toBeInTheDocument());

    const table = screen.getAllByRole("table")[0];
    expect(within(table).queryByText("Quincy Acy")).not.toBeInTheDocument();
    expect(screen.getByText(/excluded \(rotation size limit\): \['acyqu01'\]/)).toBeInTheDocument();
  });

  it("shows the editable-minutes table after a successful submit, seeded with the submitted provider", async () => {
    await submitAndGetResults();

    expect(screen.getByRole("heading", { name: /edit scenario minutes/i })).toBeInTheDocument();
    // Two tables now exist: the read-only comparison above, and the editable one below it.
    expect(screen.getAllByRole("table")).toHaveLength(2);

    const recalculate = screen.getByRole("button", { name: /recalculate/i });
    await waitFor(() => expect(recalculate).not.toBeDisabled());
    const user = userEvent.setup();
    await user.click(recalculate);

    // The second call (the edit's own recalculate) must reuse the exact request
    // fields the original submit used, notably the submitted provider — not a
    // value re-read from `selection`, which could have drifted since submission.
    await waitFor(() => expect(scenarioMocks.postScenario).toHaveBeenCalledTimes(2));
    expect(scenarioMocks.postScenario).toHaveBeenLastCalledWith(
      expect.objectContaining({
        team_id: "GSW",
        season: "2014-15",
        player_out_id: "barbole01",
        player_in_id: "acyqu01",
        contribution_provider: "historical_benchmark",
        manual_minutes: expect.any(Object),
      }),
    );
  });
});

describe("accessibility", () => {
  it("gives every field a programmatic accessible name", async () => {
    render(<ScenarioForm />);
    expect(screen.getByLabelText(/season/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^team/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/player to remove/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/player to add/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contribution provider/i)).toBeInTheDocument();
  });

  it("locks the season field with a visible, understandable disabled state", async () => {
    render(<ScenarioForm />);
    const season = screen.getByLabelText(/season/i);
    expect(season).toBeDisabled();
    expect(season).toHaveValue("2014-15");
    expect(screen.getByText(/only the 2014-15 season is available/i)).toBeInTheDocument();
  });

  it("supports full keyboard operation: tab to the submit button and press Enter", async () => {
    const user = userEvent.setup();
    render(<ScenarioForm />);
    await fillValidSelection(user);
    const button = screen.getByRole("button", { name: /run scenario/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    button.focus();
    expect(document.activeElement).toBe(button);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(scenarioMocks.postScenario).toHaveBeenCalledTimes(1));
  });

  it("associates each field's error text via aria-describedby, not color alone", async () => {
    // The dropdown options already exclude this combination (player-in
    // filters out the current roster, which structurally includes
    // player-out) — so the only way to reach this defense-in-depth message
    // is a direct URL edit, same as a manually-typed/shared link.
    setInitialUrl(
      "season=2014-15&team_id=GSW&player_out_id=barbole01&player_in_id=barbole01&contribution_provider=historical_benchmark",
    );
    render(<ScenarioForm />);
    await waitFor(() => expect(screen.getByLabelText(/player to add/i)).toHaveValue("barbole01"));

    const playerIn = screen.getByLabelText(/player to add/i);
    const describedBy = playerIn.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    // Both help text and error text are associated (space-separated ids) — the
    // error is not the only description, and is not conveyed by color alone.
    const describedText = describedBy!
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent)
      .join(" ");
    expect(describedText).toMatch(/different player/i);
  });
});
