import { useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Same reactive next/navigation fake as ScenarioForm.test.tsx (no official
// Next.js App Router test utility exists) — extended with a static
// useParams() since these pages read the route param that way.
const routerMocks = vi.hoisted(() => {
  // Every test's fixture data (CURRY, below) is season "2014-15" — the URL
  // starts pinned to that explicitly so assertions don't depend on
  // DEFAULT_SEASON's value (which is the *most recent* supported season,
  // not a fixed one — see url-state.ts). The one test that actually
  // exercises the default-season fallback overrides this itself.
  let search = "season=2014-15";
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
    replace: vi.fn(),
    reset: () => {
      search = "season=2014-15";
      window.history.replaceState(null, "", "/players/curryst01?season=2014-15");
      routerMocks.replace.mockClear();
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: (href: string, options?: unknown) => {
      routerMocks.replace(href, options);
      window.history.replaceState(null, "", href);
      routerMocks.setSearch(href.includes("?") ? href.slice(href.indexOf("?") + 1) : "");
    },
  }),
  usePathname: () => "/players/curryst01",
  useSearchParams: () =>
    new URLSearchParams(useSyncExternalStore(routerMocks.subscribe, routerMocks.getSearch, routerMocks.getSearch)),
  useParams: () => ({ playerId: "curryst01" }),
}));

const detailMocks = vi.hoisted(() => ({ getPlayerDetail: vi.fn() }));
vi.mock("@/lib/api/detail", () => detailMocks);

import { PlayerDetailView } from "./PlayerDetailView";
import { ScenarioApiError, messageForErrorCode } from "@/lib/api/errors";
import { DEFAULT_SEASON } from "@/lib/url-state";
import type { PlayerDetailResponse } from "@/lib/api/detail";

const CURRY: PlayerDetailResponse = {
  player_id: "curryst01",
  name: "Stephen Curry",
  season: "2014-15",
  minutes: 2613.0,
  possessions: 5524,
  team_stints: [{ team_id: "GSW", minutes: 2000.5, possessions: 4200 }],
  contribution_value: 4.234,
  offensive_impact: 3.123,
  defensive_impact: 1.111,
  provider_type: "historical_raptor_benchmark",
  provider_version: "historical-raptor-benchmark-v1",
  data_version: "fivethirtyeight-nba-raptor-2022-11-29",
  contribution_epistemic_type: "historical_benchmark",
  attribution: ["FiveThirtyEight NBA RAPTOR data, CC BY 4.0"],
};

beforeEach(() => {
  routerMocks.reset();
  detailMocks.getPlayerDetail.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PlayerDetailView", () => {
  it("shows a loading state before the fetch resolves", () => {
    detailMocks.getPlayerDetail.mockReturnValue(new Promise(() => {})); // never resolves
    render(<PlayerDetailView />);
    expect(screen.getByRole("status")).toHaveTextContent(/loading player/i);
  });

  it("renders the player's stats and a working link to their team on success", async () => {
    detailMocks.getPlayerDetail.mockResolvedValue(CURRY);
    render(<PlayerDetailView />);

    expect(await screen.findByRole("heading", { level: 1, name: "Stephen Curry" })).toBeInTheDocument();
    expect(screen.getByText("2613.0")).toBeInTheDocument();
    expect(screen.getByText("5524")).toBeInTheDocument();
    expect(screen.getByText("4.234")).toBeInTheDocument();
    expect(screen.getByText("3.123")).toBeInTheDocument();
    expect(screen.getByText("1.111")).toBeInTheDocument();

    const teamLink = screen.getByRole("link", { name: "GSW" });
    expect(teamLink).toHaveAttribute("href", "/teams/GSW?season=2014-15");
  });

  it("renders every team stint as a separate link for a mid-season-traded player", async () => {
    detailMocks.getPlayerDetail.mockResolvedValue({
      ...CURRY,
      team_stints: [
        { team_id: "DEN", minutes: 1750, possessions: 3516 },
        { team_id: "POR", minutes: 752, possessions: 1490 },
      ],
    });
    render(<PlayerDetailView />);

    await screen.findByRole("heading", { level: 1, name: "Stephen Curry" });
    expect(screen.getByRole("link", { name: "DEN" })).toHaveAttribute("href", "/teams/DEN?season=2014-15");
    expect(screen.getByRole("link", { name: "POR" })).toHaveAttribute("href", "/teams/POR?season=2014-15");
  });

  it("renders a fallback instead of a team link when team_stints is empty", async () => {
    detailMocks.getPlayerDetail.mockResolvedValue({ ...CURRY, team_stints: [] });
    render(<PlayerDetailView />);

    await screen.findByRole("heading", { level: 1, name: "Stephen Curry" });
    expect(screen.getByText("Not on a tracked roster this season")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "GSW" })).not.toBeInTheDocument();
  });

  it("renders an actionable error message, not raw HTTP text", async () => {
    detailMocks.getPlayerDetail.mockRejectedValue(
      new ScenarioApiError({
        status: 404,
        code: "PLAYER_NOT_FOUND",
        message: messageForErrorCode("PLAYER_NOT_FOUND"),
      }),
    );
    render(<PlayerDetailView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/no record in the selected season/i);
  });

  it("re-fetches with the new provider and updates the URL when the selector changes", async () => {
    detailMocks.getPlayerDetail.mockResolvedValue(CURRY);
    const user = userEvent.setup();
    render(<PlayerDetailView />);
    await screen.findByRole("heading", { level: 1, name: "Stephen Curry" });

    expect(detailMocks.getPlayerDetail).toHaveBeenLastCalledWith(
      "2014-15",
      "curryst01",
      "historical_benchmark",
      expect.anything(),
    );

    await user.selectOptions(
      screen.getByLabelText(/contribution provider/i),
      "Synthetic estimate (demo values)",
    );

    await waitFor(() =>
      expect(detailMocks.getPlayerDetail).toHaveBeenLastCalledWith(
        "2014-15",
        "curryst01",
        "synthetic",
        expect.anything(),
      ),
    );
    expect(routerMocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("contribution_provider=synthetic"),
      expect.anything(),
    );
  });

  it("falls back to the default season when ?season= is absent or unsupported", async () => {
    detailMocks.getPlayerDetail.mockResolvedValue({ ...CURRY, season: DEFAULT_SEASON });
    // 2022-23 is real but outside SUPPORTED_SEASON_LABELS (the pinned
    // snapshot's RS data ends at 2021-22 — decision 0015).
    window.history.replaceState(null, "", "/players/curryst01?season=2022-23");
    routerMocks.setSearch("season=2022-23");
    render(<PlayerDetailView />);

    await screen.findByRole("heading", { level: 1, name: "Stephen Curry" });
    expect(detailMocks.getPlayerDetail).toHaveBeenCalledWith(
      DEFAULT_SEASON,
      "curryst01",
      "historical_benchmark",
      expect.anything(),
    );
  });
});
