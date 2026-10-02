import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// TeamDetailView never calls the router (no provider selector, no writes to
// the URL) — only useParams and a read-only useSearchParams are needed.
// searchMocks.search is mutated per-test to exercise the ?season= override.
const searchMocks = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ teamId: "GSW" }),
  useSearchParams: () => new URLSearchParams(searchMocks.search),
}));

const detailMocks = vi.hoisted(() => ({ getTeamDetail: vi.fn() }));
vi.mock("@/lib/api/detail", () => detailMocks);

import { TeamDetailView } from "./TeamDetailView";
import { ScenarioApiError, messageForErrorCode } from "@/lib/api/errors";
import { DEFAULT_SEASON } from "@/lib/url-state";
import type { TeamDetailResponse } from "@/lib/api/detail";

const WARRIORS: TeamDetailResponse = {
  team_id: "GSW",
  season: "2014-15",
  players: [
    { player_id: "curryst01", name: "Stephen Curry", minutes: 2000.5 },
    { player_id: "thompkl01", name: "Klay Thompson", minutes: 1800.2 },
  ],
  roster_size: 2,
  total_roster_minutes: 3800.7,
};

beforeEach(() => {
  detailMocks.getTeamDetail.mockReset();
  // Every fixture here (WARRIORS) is season "2014-15" — pinned explicitly so
  // assertions don't depend on DEFAULT_SEASON's value (the *most recent*
  // supported season, not a fixed one — see url-state.ts). The one test that
  // actually exercises the default-season fallback overrides this itself.
  searchMocks.search = "season=2014-15";
});

describe("TeamDetailView", () => {
  it("shows a loading state before the fetch resolves", () => {
    detailMocks.getTeamDetail.mockReturnValue(new Promise(() => {}));
    render(<TeamDetailView />);
    expect(screen.getByRole("status")).toHaveTextContent(/loading team/i);
  });

  it("renders the roster with working links to each player, and the roster aggregates", async () => {
    detailMocks.getTeamDetail.mockResolvedValue(WARRIORS);
    render(<TeamDetailView />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Golden State Warriors" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3800.7")).toBeInTheDocument();

    const curryLink = screen.getByRole("link", { name: "Stephen Curry" });
    expect(curryLink).toHaveAttribute("href", "/players/curryst01?season=2014-15");
    expect(screen.getByRole("link", { name: "Klay Thompson" })).toHaveAttribute(
      "href",
      "/players/thompkl01?season=2014-15",
    );

    expect(detailMocks.getTeamDetail).toHaveBeenCalledWith("2014-15", "GSW", expect.anything());
  });

  it("renders an explicit empty-roster message rather than a blank table", async () => {
    detailMocks.getTeamDetail.mockResolvedValue({ ...WARRIORS, players: [], roster_size: 0, total_roster_minutes: 0 });
    render(<TeamDetailView />);

    await screen.findByRole("heading", { level: 1, name: "Golden State Warriors" });
    expect(screen.getByText(/no roster data was found/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders an actionable error message, not raw HTTP text", async () => {
    detailMocks.getTeamDetail.mockRejectedValue(
      new ScenarioApiError({
        status: 404,
        code: "TEAM_NOT_FOUND",
        message: messageForErrorCode("TEAM_NOT_FOUND"),
      }),
    );
    render(<TeamDetailView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/wasn't found for the selected season/i);
  });

  it("falls back to the default season when ?season= is absent or unsupported", async () => {
    detailMocks.getTeamDetail.mockResolvedValue({ ...WARRIORS, season: DEFAULT_SEASON });
    // 2022-23 is real but outside SUPPORTED_SEASON_LABELS (the pinned
    // snapshot's RS data ends at 2021-22 — decision 0015).
    searchMocks.search = "season=2022-23";
    render(<TeamDetailView />);

    await screen.findByRole("heading", { level: 1, name: "Golden State Warriors" });
    expect(detailMocks.getTeamDetail).toHaveBeenCalledWith(DEFAULT_SEASON, "GSW", expect.anything());
  });
});
