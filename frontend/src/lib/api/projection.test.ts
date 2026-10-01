import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlayerProjection } from "./projection";
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

const VALID_PROJECTION_BODY = {
  season: "2014-15",
  player_id: "curryst01",
  target_season: "2015-16",
  predicted_raptor_total: 5.123,
  model_version: "raptor-trend-xgb-v1",
  data_version: "fivethirtyeight-nba-raptor-2022-11-29",
  feature_schema_version: "raptor-trend-features-v1",
  contribution_epistemic_type: "model_prediction",
  prediction_timestamp: "2026-10-01T00:00:00+00:00",
};

describe("getPlayerProjection", () => {
  it("requests the correct URL", async () => {
    mockFetchOnce({ ok: true, status: 200, body: VALID_PROJECTION_BODY });
    await getPlayerProjection("2014-15", "curryst01");
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://test.local/seasons/2014-15/players/curryst01/projection",
    );
  });

  it("returns a validated response matching the body", async () => {
    mockFetchOnce({ ok: true, status: 200, body: VALID_PROJECTION_BODY });
    const result = await getPlayerProjection("2014-15", "curryst01");
    expect(result).toEqual(VALID_PROJECTION_BODY);
  });

  it("rejects a malformed response instead of trusting an unsafe cast", async () => {
    const withoutModelVersion: Record<string, unknown> = { ...VALID_PROJECTION_BODY };
    delete withoutModelVersion.model_version;
    mockFetchOnce({ ok: true, status: 200, body: withoutModelVersion });
    await expect(getPlayerProjection("2014-15", "curryst01")).rejects.toMatchObject({
      code: INVALID_RESPONSE_SHAPE_CODE,
    });
  });

  it("normalizes a MODEL_ARTIFACT_NOT_FOUND domain error (503)", async () => {
    mockFetchOnce({
      ok: false,
      status: 503,
      body: { code: "MODEL_ARTIFACT_NOT_FOUND", message: "internal" },
    });
    await expect(getPlayerProjection("2014-15", "curryst01")).rejects.toMatchObject({
      status: 503,
      code: "MODEL_ARTIFACT_NOT_FOUND",
    });
  });

  it("normalizes a PLAYER_PROJECTION_NOT_FOUND domain error (404)", async () => {
    mockFetchOnce({
      ok: false,
      status: 404,
      body: { code: "PLAYER_PROJECTION_NOT_FOUND", message: "internal" },
    });
    await expect(getPlayerProjection("2014-15", "nobody01")).rejects.toMatchObject({
      status: 404,
      code: "PLAYER_PROJECTION_NOT_FOUND",
    });
  });
});
