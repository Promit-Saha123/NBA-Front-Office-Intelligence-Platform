import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePlayerProjection } from "./use-player-projection";
import * as projectionApi from "@/lib/api/projection";

const CURRY_PROJECTION: projectionApi.PlayerProjectionResponse = {
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePlayerProjection", () => {
  it("returns data once the request resolves", async () => {
    vi.spyOn(projectionApi, "getPlayerProjection").mockResolvedValue(CURRY_PROJECTION);
    const { result } = renderHook(() => usePlayerProjection("2014-15", "curryst01"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(CURRY_PROJECTION);
  });

  // Same shape as every other model-not-trained-in-this-environment surface:
  // propagated as a normal error, not thrown/unhandled, so the page can show
  // a quiet "not available" note instead of crashing (decision 0013's
  // deferred-API-exposure consequence).
  it("propagates a normalized MODEL_ARTIFACT_NOT_FOUND error, not a raw rejection", async () => {
    const { ScenarioApiError, messageForErrorCode } = await import("@/lib/api/errors");
    vi.spyOn(projectionApi, "getPlayerProjection").mockRejectedValue(
      new ScenarioApiError({
        status: 503,
        code: "MODEL_ARTIFACT_NOT_FOUND",
        message: messageForErrorCode("MODEL_ARTIFACT_NOT_FOUND"),
      }),
    );
    const { result } = renderHook(() => usePlayerProjection("2014-15", "curryst01"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(ScenarioApiError);
    expect(result.current.error?.code).toBe("MODEL_ARTIFACT_NOT_FOUND");
    expect(result.current.data).toBeNull();
  });
});
