import { afterEach, describe, expect, it, vi } from "vitest";
import { getTeamRoster, listSeasonPlayers, listTeams } from "./lookups";
import { INVALID_RESPONSE_SHAPE_CODE, ScenarioApiError } from "./errors";

function mockFetchOnce(response: { ok: boolean; status: number; body: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status,
      json: async () => response.body,
    } as Response),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listTeams", () => {
  it("requests the correct URL and returns a validated response", async () => {
    mockFetchOnce({ ok: true, status: 200, body: { season: "2014-15", teams: ["BOS", "GSW"] } });
    const result = await listTeams("2014-15");
    expect(result).toEqual({ season: "2014-15", teams: ["BOS", "GSW"] });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("http://test.local/seasons/2014-15/teams");
  });

  it("URL-encodes the season segment", async () => {
    mockFetchOnce({ ok: true, status: 200, body: { season: "weird season", teams: [] } });
    await listTeams("weird season");
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe("http://test.local/seasons/weird%20season/teams");
  });

  it("rejects a malformed response instead of trusting an unsafe cast", async () => {
    mockFetchOnce({ ok: true, status: 200, body: { season: "2014-15" /* missing teams */ } });
    await expect(listTeams("2014-15")).rejects.toMatchObject({ code: INVALID_RESPONSE_SHAPE_CODE });
  });

  it("normalizes an unsupported-season domain error", async () => {
    mockFetchOnce({
      ok: false,
      status: 422,
      body: { code: "UNSUPPORTED_SEASON", message: "internal detail" },
    });
    await expect(listTeams("1999-00")).rejects.toMatchObject({
      status: 422,
      code: "UNSUPPORTED_SEASON",
    });
  });
});

describe("getTeamRoster", () => {
  it("requests the correct URL for team + season", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      body: { season: "2014-15", team_id: "GSW", players: [] },
    });
    await getTeamRoster("2014-15", "GSW");
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe("http://test.local/seasons/2014-15/teams/GSW/roster");
  });

  it("normalizes a TEAM_NOT_FOUND domain error", async () => {
    mockFetchOnce({
      ok: false,
      status: 404,
      body: { code: "TEAM_NOT_FOUND", message: "internal detail" },
    });
    await expect(getTeamRoster("2014-15", "ZZZ")).rejects.toMatchObject({
      status: 404,
      code: "TEAM_NOT_FOUND",
    });
  });

  it("returns validated roster players", async () => {
    const body = {
      season: "2014-15",
      team_id: "GSW",
      players: [{ player_id: "curryst01", name: "Stephen Curry", minutes: 2000.5 }],
    };
    mockFetchOnce({ ok: true, status: 200, body });
    const result = await getTeamRoster("2014-15", "GSW");
    expect(result).toEqual(body);
  });
});

describe("listSeasonPlayers", () => {
  it("requests the correct URL and returns validated players", async () => {
    const body = { season: "2014-15", players: [{ player_id: "acyqu01", name: "Quincy Acy" }] };
    mockFetchOnce({ ok: true, status: 200, body });
    const result = await listSeasonPlayers("2014-15");
    expect(result).toEqual(body);
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe("http://test.local/seasons/2014-15/players");
  });

  it("propagates ScenarioApiError, not a raw Error, on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(listSeasonPlayers("2014-15")).rejects.toBeInstanceOf(ScenarioApiError);
  });
});
