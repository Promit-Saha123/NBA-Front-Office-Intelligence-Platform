"use client";

/**
 * Three small React hooks over src/lib/api/lookups.ts, one per lookup
 * (teams / season players / one team's roster). Deliberately not a single
 * generic "useAsync(fetcher, deps)" wrapper: passing a caller-supplied deps
 * array through to useEffect breaks eslint's react-hooks/exhaustive-deps
 * static analysis (it requires a literal array) and risks stale closures —
 * three concrete hooks with their own literal dependency arrays are safer
 * and only mildly more code.
 *
 * Two eslint react-hooks rules shaped this design, both verified empirically
 * against this exact codebase's lint config, not assumed from memory:
 *
 * 1. `set-state-in-effect` disallows calling setState synchronously in an
 *    effect's *setup* body (only inside a resolved/rejected-promise
 *    callback, or inside the returned *cleanup* function, is allowed) — so
 *    there is no "reset to loading" setState call anywhere here.
 * 2. `refs` disallows reading `ref.current` during render at all (even via
 *    an intermediate local variable) when a hook's *render* body is doing
 *    the reading — so `loading` cannot be derived from a ref-based request
 *    counter read at render time, which an earlier version of this file did.
 *
 * Given both constraints, correctness against a *revisited* key (season A
 * resolves, then B starts but never resolves, then the user flips back to A
 * before B settles) comes from the effect's cleanup function, not a ref:
 * each effect tracks a plain closure-local `settled` flag; if its request
 * is torn down (aborted) before ever settling, cleanup unconditionally
 * clears `result` via `setResult(null)` (setState-in-cleanup is allowed).
 * Combined with the render-time `result.key !== key` check, this covers
 * both cases correctly: moving to a genuinely new key clears via the key
 * mismatch; revisiting a key while an intervening, still-unsettled request
 * is abandoned clears via the cleanup path, so no stale data can survive.
 * This is deliberately conservative (an abandoned request always clears,
 * even if a *different* still-fresh result would have remained valid) —
 * acceptable and consistent with decision 0008's "no caching" rule, since
 * there is nothing here designed to reuse a previous result anyway.
 *
 * Each effect cancels its in-flight request (AbortController) on unmount or
 * when its inputs change; an aborted request's callback is a no-op.
 */
import { useEffect, useState } from "react";
import { ScenarioApiError, UNKNOWN_ERROR_CODE, messageForErrorCode } from "@/lib/api/errors";
import {
  getTeamRoster,
  listSeasonPlayers,
  listTeams,
  type SeasonPlayersResponse,
  type TeamRosterResponse,
  type TeamsResponse,
} from "@/lib/api/lookups";

export interface LookupState<T> {
  data: T | null;
  error: ScenarioApiError | null;
  loading: boolean;
}

interface CompletedResult<T> {
  key: string;
  data: T | null;
  error: ScenarioApiError | null;
}

function isAbortError(value: unknown): value is DOMException {
  return value instanceof DOMException && value.name === "AbortError";
}

function toScenarioApiError(err: unknown): ScenarioApiError {
  if (err instanceof ScenarioApiError) return err;
  return new ScenarioApiError({
    status: 0,
    code: UNKNOWN_ERROR_CODE,
    message: messageForErrorCode(UNKNOWN_ERROR_CODE),
    devDetail: err,
  });
}

function deriveState<T>(result: CompletedResult<T> | null, key: string): LookupState<T> {
  if (result === null || result.key !== key) {
    return { data: null, error: null, loading: true };
  }
  return { data: result.data, error: result.error, loading: false };
}

export function useTeams(season: string): LookupState<TeamsResponse> {
  const [result, setResult] = useState<CompletedResult<TeamsResponse> | null>(null);

  useEffect(() => {
    let settled = false;
    const controller = new AbortController();
    listTeams(season, { signal: controller.signal })
      .then((data) => {
        settled = true;
        setResult({ key: season, data, error: null });
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        settled = true;
        setResult({ key: season, data: null, error: toScenarioApiError(err) });
      });
    return () => {
      controller.abort();
      if (!settled) setResult(null);
    };
  }, [season]);

  return deriveState(result, season);
}

export function useSeasonPlayers(season: string): LookupState<SeasonPlayersResponse> {
  const [result, setResult] = useState<CompletedResult<SeasonPlayersResponse> | null>(null);

  useEffect(() => {
    let settled = false;
    const controller = new AbortController();
    listSeasonPlayers(season, { signal: controller.signal })
      .then((data) => {
        settled = true;
        setResult({ key: season, data, error: null });
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        settled = true;
        setResult({ key: season, data: null, error: toScenarioApiError(err) });
      });
    return () => {
      controller.abort();
      if (!settled) setResult(null);
    };
  }, [season]);

  return deriveState(result, season);
}

/** `teamId: null` means "no team selected yet" — idle, not loading, no fetch. */
export function useTeamRoster(season: string, teamId: string | null): LookupState<TeamRosterResponse> {
  const [result, setResult] = useState<CompletedResult<TeamRosterResponse> | null>(null);

  useEffect(() => {
    if (teamId === null) return;
    let settled = false;
    const controller = new AbortController();
    const key = `${season}:${teamId}`;
    getTeamRoster(season, teamId, { signal: controller.signal })
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

  if (teamId === null) {
    return { data: null, error: null, loading: false };
  }
  return deriveState(result, `${season}:${teamId}`);
}
