/**
 * Shared plumbing for the "derived-loading-from-key + cleanup-clears-on-
 * abandon" hook pattern used by both `use-roster-lookups.ts` and
 * `use-player-team-detail.ts` — extracted once a second file needed the
 * identical helpers verbatim (frontend-architect review finding). The
 * pattern itself (why a ref-based counter or an effect-body `setState` both
 * fail this project's eslint `react-hooks` rules) is documented in
 * `use-roster-lookups.ts`'s own module comment; that reasoning isn't
 * repeated here since it explains a *shape* each concrete hook still
 * implements individually, not shared code.
 */
import { ScenarioApiError, UNKNOWN_ERROR_CODE, messageForErrorCode } from "@/lib/api/errors";

export interface AsyncRequestState<T> {
  data: T | null;
  error: ScenarioApiError | null;
  loading: boolean;
}

export interface CompletedRequest<T> {
  key: string;
  data: T | null;
  error: ScenarioApiError | null;
}

export function isAbortError(value: unknown): value is DOMException {
  return value instanceof DOMException && value.name === "AbortError";
}

export function toScenarioApiError(err: unknown): ScenarioApiError {
  if (err instanceof ScenarioApiError) return err;
  return new ScenarioApiError({
    status: 0,
    code: UNKNOWN_ERROR_CODE,
    message: messageForErrorCode(UNKNOWN_ERROR_CODE),
    devDetail: err,
  });
}

export function deriveAsyncRequestState<T>(
  result: CompletedRequest<T> | null,
  key: string,
): AsyncRequestState<T> {
  if (result === null || result.key !== key) {
    return { data: null, error: null, loading: true };
  }
  return { data: result.data, error: result.error, loading: false };
}
