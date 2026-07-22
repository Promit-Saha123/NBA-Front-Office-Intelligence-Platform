import { afterEach, describe, expect, it, vi } from "vitest";
import { postScenario, type ScenarioRequest, type ScenarioResponse } from "./scenarios";
import {
  CLIENT_CONFIGURATION_ERROR_CODE,
  FASTAPI_VALIDATION_ERROR_CODE,
  INVALID_RESPONSE_SHAPE_CODE,
  NETWORK_ERROR_CODE,
  ScenarioApiError,
} from "./errors";

const VALID_REQUEST: ScenarioRequest = {
  team_id: "GSW",
  season: "2014-15",
  player_out_id: "barbole01",
  player_in_id: "acyqu01",
  contribution_provider: "historical_benchmark",
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

describe("postScenario", () => {
  it("returns a validated, typed response on success", async () => {
    mockFetchOnce({ ok: true, status: 200, body: VALID_RESPONSE });
    const result = await postScenario(VALID_REQUEST);
    expect(result).toEqual(VALID_RESPONSE);
  });

  it("sends the request body and the resolved endpoint URL", async () => {
    mockFetchOnce({ ok: true, status: 200, body: VALID_RESPONSE });
    await postScenario(VALID_REQUEST);
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test.local/scenarios");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(VALID_REQUEST);
  });

  it("normalizes a known domain error into a ScenarioApiError with an actionable message", async () => {
    mockFetchOnce({
      ok: false,
      status: 404,
      body: { code: "TEAM_NOT_FOUND", message: "Team 'ZZZ' not found in season '2014-15'" },
    });
    await expect(postScenario(VALID_REQUEST)).rejects.toMatchObject({
      status: 404,
      code: "TEAM_NOT_FOUND",
      message: expect.stringContaining("team"),
    });
  });

  it("never shows raw HTTP status text for a known error", async () => {
    mockFetchOnce({
      ok: false,
      status: 422,
      body: { code: "PLAYER_NOT_ON_ROSTER", message: "internal detail" },
    });
    try {
      await postScenario(VALID_REQUEST);
      expect.fail("expected postScenario to throw");
    } catch (error) {
      const apiError = error as ScenarioApiError;
      expect(apiError.message).not.toMatch(/Unprocessable Entity/i);
      expect(apiError.message).not.toBe("internal detail");
    }
  });

  it("falls back to a generic message for an unrecognized (future) domain error code", async () => {
    mockFetchOnce({
      ok: false,
      status: 500,
      body: { code: "SOME_FUTURE_ERROR_CODE", message: "internal detail" },
    });
    await expect(postScenario(VALID_REQUEST)).rejects.toMatchObject({
      status: 500,
      code: "SOME_FUTURE_ERROR_CODE",
      message: expect.stringMatching(/something went wrong/i),
    });
  });

  it("normalizes FastAPI's own validation-error shape distinctly from a domain error", async () => {
    mockFetchOnce({
      ok: false,
      status: 422,
      body: { detail: [{ loc: ["body", "contribution_provider"], msg: "field required", type: "missing" }] },
    });
    await expect(postScenario(VALID_REQUEST)).rejects.toMatchObject({
      status: 422,
      code: FASTAPI_VALIDATION_ERROR_CODE,
    });
  });

  it("normalizes a missing NEXT_PUBLIC_API_URL as ScenarioApiError, not a raw Error", async () => {
    const original = process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    mockFetchOnce({ ok: true, status: 200, body: VALID_RESPONSE });
    try {
      await expect(postScenario(VALID_REQUEST)).rejects.toMatchObject({
        status: 0,
        code: CLIENT_CONFIGURATION_ERROR_CODE,
      });
      await expect(postScenario(VALID_REQUEST)).rejects.toBeInstanceOf(ScenarioApiError);
      // Must not have attempted a network call at all.
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      process.env.NEXT_PUBLIC_API_URL = original;
    }
  });

  it("normalizes a network failure (no response at all) with status 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );
    await expect(postScenario(VALID_REQUEST)).rejects.toMatchObject({
      status: 0,
      code: NETWORK_ERROR_CODE,
    });
  });

  it("rejects a malformed success payload instead of trusting an unsafe cast", async () => {
    const malformed = { ...VALID_RESPONSE } as Partial<ScenarioResponse>;
    delete malformed.model_version; // required field, even though nullable
    mockFetchOnce({ ok: true, status: 200, body: malformed });
    await expect(postScenario(VALID_REQUEST)).rejects.toMatchObject({
      code: INVALID_RESPONSE_SHAPE_CODE,
    });
  });

  it("rejects a success payload with a wrong-typed field", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      body: { ...VALID_RESPONSE, historical_only: "yes" },
    });
    await expect(postScenario(VALID_REQUEST)).rejects.toMatchObject({
      code: INVALID_RESPONSE_SHAPE_CODE,
    });
  });

  it("never retries with a different provider on its own", async () => {
    mockFetchOnce({
      ok: false,
      status: 422,
      body: { code: "MISSING_CONTRIBUTION", message: "no value" },
    });
    await expect(postScenario(VALID_REQUEST)).rejects.toBeInstanceOf(ScenarioApiError);
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("forwards the given AbortSignal to fetch", async () => {
    mockFetchOnce({ ok: true, status: 200, body: VALID_RESPONSE });
    const controller = new AbortController();
    await postScenario(VALID_REQUEST, { signal: controller.signal });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it("rethrows an aborted request as AbortError, not a wrapped ScenarioApiError", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));
    const controller = new AbortController();
    await expect(postScenario(VALID_REQUEST, { signal: controller.signal })).rejects.toBe(
      abortError,
    );
  });
});

// Compile-only assertion: contribution_provider must be a required field on ScenarioRequest.
// If a future generated contract makes it optional, this line stops type-checking under
// `pnpm run typecheck` because the `@ts-expect-error` directive becomes unused.
function _typeOnlyContributionProviderIsRequired(): void {
  // @ts-expect-error contribution_provider is required — omitting it must fail to typecheck.
  const _missingProvider: ScenarioRequest = {
    team_id: "GSW",
    season: "2014-15",
    player_out_id: "a",
    player_in_id: "b",
  };
  void _missingProvider;
}
void _typeOnlyContributionProviderIsRequired;
