/**
 * Isolated API-client module for POST /custom-rosters (decision 0014). Same
 * isolation rule as scenarios.ts/lookups.ts: only this file and its siblings
 * under src/lib/api/ import generated `components["schemas"]` directly.
 * Transport/error-normalization plumbing lives in ./http.ts, shared with the
 * other client modules.
 */
import type { components } from "@/generated/api-types";
import { getValidator } from "./validate";
import { fetchValidatedJson } from "./http";

export type RosterBuilderRequest = components["schemas"]["RosterBuilderRequest"];
export type RosterBuilderResponse = components["schemas"]["RosterBuilderResponse"];

const responseValidator = getValidator("RosterBuilderResponse");

/**
 * POSTs a from-scratch 12-player roster and returns a validated, typed
 * RosterBuilderResponse. Throws ScenarioApiError for every non-2xx response
 * and every network failure — never returns a partially-valid result.
 *
 * `signal` supports stale-response handling, same convention as
 * postScenario: pass an AbortController's signal so a superseded request can
 * be cancelled; an aborted call rejects with a DOMException named
 * "AbortError" that callers should discard silently.
 */
export async function postCustomRoster(
  request: RosterBuilderRequest,
  options?: { signal?: AbortSignal },
): Promise<RosterBuilderResponse> {
  return fetchValidatedJson<RosterBuilderResponse>(
    "/custom-rosters",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: options?.signal,
    },
    responseValidator,
  );
}
