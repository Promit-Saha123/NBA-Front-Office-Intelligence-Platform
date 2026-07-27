import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlayerDetail, getTeamDetail } from "./detail";
import { INVALID_RESPONSE_SHAPE_CODE } from "./errors";

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

const VALID_PLAYER_BODY = {
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

const VALID_TEAM_BODY = {
  season: "2014-15",
  team_id: "GSW",
  players: [{ player_id: "curryst01", name: "Stephen Curry", minutes: 2000.5 }],
  roster_size: 1,
  total_roster_minutes: 2000.5,
};

describe("getPlayerDetail", () => {
  it("requests the correct URL, including the provider query param", async () => {
    mockFetchOnce({ ok: true, status: 200, body: VALID_PLAYER_BODY });
    await getPlayerDetail("2014-15", "curryst01", "historical_benchmark");
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://test.local/seasons/2014-15/players/curryst01?contribution_provider=historical_benchmark",
    );
  });

  it("returns a validated response matching the body", async () => {
    mockFetchOnce({ ok: true, status: 200, body: VALID_PLAYER_BODY });
    const result = await getPlayerDetail("2014-15", "curryst01", "historical_benchmark");
    expect(result).toEqual(VALID_PLAYER_BODY);
  });

  it("supports multiple team stints for a mid-season-traded player", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      body: {
        ...VALID_PLAYER_BODY,
        player_id: "afflaar01",
        team_stints: [
          { team_id: "DEN", minutes: 1750, possessions: 3516 },
          { team_id: "POR", minutes: 752, possessions: 1490 },
        ],
      },
    });
    const result = await getPlayerDetail("2014-15", "afflaar01", "historical_benchmark");
    expect(result.team_stints).toEqual([
      { team_id: "DEN", minutes: 1750, possessions: 3516 },
      { team_id: "POR", minutes: 752, possessions: 1490 },
    ]);
  });

  it("rejects a malformed response instead of trusting an unsafe cast", async () => {
    const withoutMinutes: Record<string, unknown> = { ...VALID_PLAYER_BODY };
    delete withoutMinutes.minutes;
    mockFetchOnce({ ok: true, status: 200, body: withoutMinutes });
    await expect(getPlayerDetail("2014-15", "curryst01", "historical_benchmark")).rejects.toMatchObject({
      code: INVALID_RESPONSE_SHAPE_CODE,
    });
  });

  it("normalizes a PLAYER_NOT_FOUND domain error", async () => {
    mockFetchOnce({ ok: false, status: 404, body: { code: "PLAYER_NOT_FOUND", message: "internal" } });
    await expect(getPlayerDetail("2014-15", "nobody01", "historical_benchmark")).rejects.toMatchObject({
      status: 404,
      code: "PLAYER_NOT_FOUND",
    });
  });
});

describe("getTeamDetail", () => {
  it("requests the correct URL, with no provider query param", async () => {
    mockFetchOnce({ ok: true, status: 200, body: VALID_TEAM_BODY });
    await getTeamDetail("2014-15", "GSW");
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe("http://test.local/seasons/2014-15/teams/GSW");
  });

  it("returns a validated response, including an empty players list", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      body: { ...VALID_TEAM_BODY, players: [], roster_size: 0, total_roster_minutes: 0 },
    });
    const result = await getTeamDetail("2014-15", "GSW");
    expect(result.players).toEqual([]);
  });

  it("rejects a malformed player entry instead of trusting an unsafe cast", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      body: { ...VALID_TEAM_BODY, players: [{ player_id: "curryst01" /* missing name/minutes */ }] },
    });
    await expect(getTeamDetail("2014-15", "GSW")).rejects.toMatchObject({
      code: INVALID_RESPONSE_SHAPE_CODE,
    });
  });

  it("normalizes a TEAM_NOT_FOUND domain error", async () => {
    mockFetchOnce({ ok: false, status: 404, body: { code: "TEAM_NOT_FOUND", message: "internal" } });
    await expect(getTeamDetail("2014-15", "ZZZ")).rejects.toMatchObject({
      status: 404,
      code: "TEAM_NOT_FOUND",
    });
  });
});
