"use client";

/**
 * One small hook over `@/lib/api/projection` — same derived-loading-from-key
 * + cleanup-clears-on-abandon pattern as `use-player-team-detail.ts`/
 * `use-roster-lookups.ts` (see `use-roster-lookups.ts`'s module comment for
 * the full rationale). A dedicated file rather than added to
 * `use-player-team-detail.ts` since that file's own doc comment scopes it to
 * hooks "over @/lib/api/detail" — projection is its own endpoint family,
 * same 1-hook-file-per-API-module convention as every other hook here.
 */
import { useEffect, useState } from "react";
import {
  deriveAsyncRequestState,
  isAbortError,
  toScenarioApiError,
  type AsyncRequestState,
  type CompletedRequest,
} from "@/lib/use-async-request";
import { getPlayerProjection, type PlayerProjectionResponse } from "@/lib/api/projection";

export function usePlayerProjection(
  season: string,
  playerId: string,
): AsyncRequestState<PlayerProjectionResponse> {
  const [result, setResult] = useState<CompletedRequest<PlayerProjectionResponse> | null>(null);

  useEffect(() => {
    const key = `${season}:${playerId}`;
    let settled = false;
    const controller = new AbortController();
    getPlayerProjection(season, playerId, { signal: controller.signal })
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
  }, [season, playerId]);

  return deriveAsyncRequestState(result, `${season}:${playerId}`);
}
