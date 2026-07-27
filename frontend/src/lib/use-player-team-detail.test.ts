import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePlayerDetail } from "./use-player-team-detail";
import * as detailApi from "@/lib/api/detail";

const CURRY: detailApi.PlayerDetailResponse = {
  season: "2014-15",
  player_id: "curryst01",
  name: "Stephen Curry",
  minutes: 2613.0,
  possessions: 5524,
  team_stints: [{ team_id: "GSW", minutes: 2000.5, possessions: 4200 }],
  contribution_value: 4.234,
  provider_type: "historical_raptor_benchmark",
  provider_version: "historical-raptor-benchmark-v1",
  data_version: "fivethirtyeight-nba-raptor-2022-11-29",
  contribution_epistemic_type: "historical_benchmark",
  offensive_impact: 3.123,
  defensive_impact: 1.111,
  attribution: ["FiveThirtyEight NBA RAPTOR data, CC BY 4.0"],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePlayerDetail", () => {
  it("returns data once the request resolves", async () => {
    vi.spyOn(detailApi, "getPlayerDetail").mockResolvedValue(CURRY);
    const { result } = renderHook(() => usePlayerDetail("2014-15", "curryst01", "historical_benchmark"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(CURRY);
  });

  it("never shows stale data or a false not-loading state when a key is revisited before an intervening request settles", async () => {
    // Same regression shape as use-roster-lookups.test.ts's equivalent case,
    // exercised here via the shared use-async-request.ts helpers instead of
    // duplicated hook-local logic: switching provider (curryst01 with
    // historical_benchmark, then synthetic, which never resolves in this
    // test) and back must not resurrect the first provider's stale result.
    const pendingSynthetic = new Promise<never>(() => {}); // never resolves

    const getPlayerDetail = vi
      .spyOn(detailApi, "getPlayerDetail")
      .mockImplementation((_season, _playerId, provider) => {
        if (provider === "historical_benchmark") return Promise.resolve(CURRY);
        if (provider === "synthetic") return pendingSynthetic;
        return Promise.reject(new Error("unexpected provider in test"));
      });

    const { result, rerender } = renderHook(
      ({ provider }) => usePlayerDetail("2014-15", "curryst01", provider),
      { initialProps: { provider: "historical_benchmark" as "historical_benchmark" | "synthetic" } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(CURRY);

    rerender({ provider: "synthetic" }); // starts, deliberately never resolves in this test
    expect(result.current.loading).toBe(true);

    rerender({ provider: "historical_benchmark" }); // back before synthetic ever settled
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    expect(getPlayerDetail).toHaveBeenCalledTimes(3);
  });

  it("propagates a normalized ScenarioApiError, not a raw rejection", async () => {
    const { ScenarioApiError, messageForErrorCode } = await import("@/lib/api/errors");
    vi.spyOn(detailApi, "getPlayerDetail").mockRejectedValue(
      new ScenarioApiError({
        status: 404,
        code: "PLAYER_NOT_FOUND",
        message: messageForErrorCode("PLAYER_NOT_FOUND"),
      }),
    );
    const { result } = renderHook(() => usePlayerDetail("2014-15", "nobody01", "historical_benchmark"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(ScenarioApiError);
    expect(result.current.error?.code).toBe("PLAYER_NOT_FOUND");
    expect(result.current.data).toBeNull();
  });
});
