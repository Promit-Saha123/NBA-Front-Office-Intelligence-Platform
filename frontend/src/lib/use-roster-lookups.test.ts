import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTeamRoster } from "./use-roster-lookups";
import * as lookups from "@/lib/api/lookups";

const ROSTER_A = { season: "2014-15", team_id: "A", players: [{ player_id: "a1", name: "Player A1", minutes: 100 }] };
const ROSTER_A2 = { season: "2014-15", team_id: "A", players: [{ player_id: "a2", name: "Player A2", minutes: 200 }] };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useTeamRoster", () => {
  it("returns data once the request resolves", async () => {
    vi.spyOn(lookups, "getTeamRoster").mockResolvedValue(ROSTER_A);
    const { result } = renderHook(() => useTeamRoster("2014-15", "A"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(ROSTER_A);
  });

  it("is idle (not loading) when no team is selected", () => {
    const spy = vi.spyOn(lookups, "getTeamRoster");
    const { result } = renderHook(() => useTeamRoster("2014-15", null));
    expect(result.current).toEqual({ data: null, error: null, loading: false });
    expect(spy).not.toHaveBeenCalled();
  });

  it("never shows stale data or a false not-loading state when a key is revisited before an intervening request settles", async () => {
    // Regression test for the exact race the frontend-architect review found:
    // A resolves, B starts but never resolves before we flip back to A —
    // the naive "does the completed key match the current key" check would
    // incorrectly report loading:false with A's *old* data while a brand
    // new request for A is actually still in flight.
    const pendingB = new Promise<never>(() => {}); // never resolves — simulates "still in flight"

    const getTeamRoster = vi.spyOn(lookups, "getTeamRoster").mockImplementation((_season, teamId) => {
      if (teamId === "A") return Promise.resolve(ROSTER_A);
      if (teamId === "B") return pendingB;
      return Promise.reject(new Error("unexpected team in test"));
    });

    const { result, rerender } = renderHook(({ teamId }) => useTeamRoster("2014-15", teamId), {
      initialProps: { teamId: "A" },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(ROSTER_A);

    rerender({ teamId: "B" }); // B starts, deliberately never resolves in this test
    expect(result.current.loading).toBe(true);

    rerender({ teamId: "A" }); // back to A before B ever settled
    // Must show loading, not the old A data, while the new A request is outstanding.
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    expect(getTeamRoster).toHaveBeenCalledTimes(3);
  });

  it("shows fresh data (not the first fetch's data) once a revisited key's newest request resolves", async () => {
    let callCount = 0;
    vi.spyOn(lookups, "getTeamRoster").mockImplementation(() => {
      callCount += 1;
      // First call for "A" resolves immediately; second call for "A" (after
      // revisiting) resolves with different data, simulating that time has
      // passed and the "fresh" fetch is what should ultimately be shown.
      return Promise.resolve(callCount === 1 ? ROSTER_A : ROSTER_A2);
    });

    const { result, rerender } = renderHook(({ teamId }) => useTeamRoster("2014-15", teamId), {
      initialProps: { teamId: "A" as string | null },
    });
    await waitFor(() => expect(result.current.data).toEqual(ROSTER_A));

    rerender({ teamId: null });
    rerender({ teamId: "A" });
    await waitFor(() => expect(result.current.data).toEqual(ROSTER_A2));
  });

  it("propagates a normalized ScenarioApiError, not a raw rejection", async () => {
    const { ScenarioApiError } = await import("@/lib/api/errors");
    vi.spyOn(lookups, "getTeamRoster").mockRejectedValue(
      new ScenarioApiError({ status: 404, code: "TEAM_NOT_FOUND", message: "That team wasn't found." }),
    );
    const { result } = renderHook(() => useTeamRoster("2014-15", "ZZZ"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(ScenarioApiError);
    expect(result.current.error?.code).toBe("TEAM_NOT_FOUND");
    expect(result.current.data).toBeNull();
  });
});
