"use client";

/**
 * Two small hooks over `@/lib/api/detail`, one per detail page — same
 * derived-loading-from-key + cleanup-clears-on-abandon pattern as
 * `use-roster-lookups.ts` (see that file's module comment for the full
 * rationale). Shared boilerplate (`isAbortError`, `toScenarioApiError`,
 * `CompletedRequest`, `deriveAsyncRequestState`) lives in
 * `use-async-request.ts`, imported by both hook files rather than
 * duplicated.
 */
import { useEffect, useState } from "react";
import {
  deriveAsyncRequestState,
  isAbortError,
  toScenarioApiError,
  type AsyncRequestState,
  type CompletedRequest,
} from "@/lib/use-async-request";
import {
  getPlayerDetail,
  getTeamDetail,
  type ContributionProviderChoice,
  type PlayerDetailResponse,
  type TeamDetailResponse,
} from "@/lib/api/detail";

export function usePlayerDetail(
  season: string,
  playerId: string,
  provider: ContributionProviderChoice,
): AsyncRequestState<PlayerDetailResponse> {
  const [result, setResult] = useState<CompletedRequest<PlayerDetailResponse> | null>(null);

  useEffect(() => {
    const key = `${season}:${playerId}:${provider}`;
    let settled = false;
    const controller = new AbortController();
    getPlayerDetail(season, playerId, provider, { signal: controller.signal })
      .then((data) => {
        settled = true;
        setResult({ key, data, error: null });
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        settled = true;
        setResult({ key, data: null, error: toScenarioApiError(err) });
      });
    return () => {
      controller.abort();
      if (!settled) setResult(null);
    };
  }, [season, playerId, provider]);

  return deriveAsyncRequestState(result, `${season}:${playerId}:${provider}`);
}

export function useTeamDetail(
  season: string,
  teamId: string,
): AsyncRequestState<TeamDetailResponse> {
  const [result, setResult] = useState<CompletedRequest<TeamDetailResponse> | null>(null);

  useEffect(() => {
    const key = `${season}:${teamId}`;
    let settled = false;
    const controller = new AbortController();
    getTeamDetail(season, teamId, { signal: controller.signal })
      .then((data) => {
        settled = true;
        setResult({ key, data, error: null });
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        settled = true;
        setResult({ key, data: null, error: toScenarioApiError(err) });
      });
    return () => {
      controller.abort();
      if (!settled) setResult(null);
    };
  }, [season, teamId]);

  return deriveAsyncRequestState(result, `${season}:${teamId}`);
}
