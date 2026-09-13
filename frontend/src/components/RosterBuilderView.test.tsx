import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const lookupMocks = vi.hoisted(() => ({ listSeasonPlayers: vi.fn() }));
vi.mock("@/lib/api/lookups", () => lookupMocks);

const rosterBuilderMocks = vi.hoisted(() => ({ postCustomRoster: vi.fn() }));
vi.mock("@/lib/api/roster-builder", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/roster-builder")>();
  return { ...actual, postCustomRoster: rosterBuilderMocks.postCustomRoster };
});

import { RosterBuilderView } from "./RosterBuilderView";
import { DEFAULT_SEASON } from "@/lib/url-state";
import type { RosterBuilderResponse } from "@/lib/api/roster-builder";

const PLAYERS = Array.from({ length: 12 }, (_, i) => ({
  player_id: `p${i + 1}`,
  name: `Player ${i + 1}`,
}));

const VALID_RESPONSE: RosterBuilderResponse = {
  season: DEFAULT_SEASON,
  player_ids: PLAYERS.map((p) => p.player_id),
  rotation: PLAYERS.map((p) => ({ player_id: p.player_id, minutes: 20 })),
  contribution: 1.234,
  provider_type: "historical_raptor_benchmark",
  provider_version: "historical-raptor-benchmark-v1",
  data_version: "fivethirtyeight-nba-raptor-2022-11-29",
  contribution_epistemic_type: "historical_benchmark",
  minutes_method: "heuristic-v1",
  minutes_assumptions: { editable: true, validated: false, total_minutes: 240 },
  allocation_repairs: [],
  team_profile: [
    { category: "offensive_impact", value: 1.5, epistemic_type: "descriptive_interpretation" },
    { category: "defensive_impact", value: -0.5, epistemic_type: "descriptive_interpretation" },
  ],
  historical_only: true,
  attribution: ["FiveThirtyEight NBA RAPTOR data, CC BY 4.0"],
  model_version: null,
};

beforeEach(() => {
  lookupMocks.listSeasonPlayers
    .mockReset()
    .mockResolvedValue({ season: DEFAULT_SEASON, players: PLAYERS });
  rosterBuilderMocks.postCustomRoster.mockReset();
});

describe("RosterBuilderView", () => {
  it("browses players, fills all 12 slots, runs a projection, and shows a valid result", async () => {
    rosterBuilderMocks.postCustomRoster.mockResolvedValue(VALID_RESPONSE);
    const user = userEvent.setup();
    render(<RosterBuilderView />);

    await waitFor(() => expect(screen.getByText("Player 1")).toBeInTheDocument());

    for (const player of PLAYERS) {
      const row = screen.getByText(player.name).closest("li");
      if (!row) throw new Error(`no <li> found for ${player.name}`);
      await user.click(within(row).getByRole("button", { name: "Add to roster" }));
    }

    expect(screen.getByText("Roster (12/12)")).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/Contribution provider/),
      "historical_benchmark",
    );
    await user.click(screen.getByRole("button", { name: "Run projection" }));

    await waitFor(() =>
      expect(screen.getByText("Projection completed successfully.")).toBeInTheDocument(),
    );
    expect(screen.getByText("Roster projection")).toBeInTheDocument();
    expect(rosterBuilderMocks.postCustomRoster).toHaveBeenCalledWith(
      expect.objectContaining({
        season: DEFAULT_SEASON,
        player_ids: PLAYERS.map((p) => p.player_id),
        contribution_provider: "historical_benchmark",
      }),
      expect.anything(),
    );
  });

  it("disables Run projection until every slot is filled and a provider is chosen", async () => {
    render(<RosterBuilderView />);
    await waitFor(() => expect(screen.getByText("Player 1")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Run projection" })).toBeDisabled();
  });

  it("filters the player browser by search text", async () => {
    render(<RosterBuilderView />);
    await waitFor(() => expect(screen.getByText("Player 1")).toBeInTheDocument());
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Search players"), "Player 3");
    expect(screen.getByText("Player 3")).toBeInTheDocument();
    expect(screen.queryByText("Player 1")).not.toBeInTheDocument();
  });

  it("moves a player from the browser to a slot, and back again on remove", async () => {
    render(<RosterBuilderView />);
    await waitFor(() => expect(screen.getByText("Player 1")).toBeInTheDocument());
    const user = userEvent.setup();
    const row = screen.getByText("Player 1").closest("li");
    if (!row) throw new Error("no <li> found for Player 1");
    await user.click(within(row).getByRole("button", { name: "Add to roster" }));

    expect(screen.getByText("Roster (1/12)")).toBeInTheDocument();
    // Only one match now — the slot's copy — since the browser row for this
    // now-assigned player has disappeared.
    expect(screen.getByText("Player 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByText("Roster (0/12)")).toBeInTheDocument();
  });
});
