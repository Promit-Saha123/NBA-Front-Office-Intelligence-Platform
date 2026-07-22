/**
 * Isolated API-client module for POST /scenarios. No presentation logic, no
 * invented metrics, no provider fallback — `contribution_provider` is
 * required by the generated `ScenarioRequest` type, so there is no default
 * to accidentally supply. Transport/error-normalization plumbing lives in
 * ./http.ts, shared with ./lookups.ts.
 */
import type { components } from "@/generated/api-types";
import { getValidator } from "./validate";
import { fetchValidatedJson } from "./http";

export type ScenarioRequest = components["schemas"]["ScenarioRequest"];
export type ScenarioResponse = components["schemas"]["ScenarioResponse"];
export type ContributionProviderChoice = components["schemas"]["ContributionProviderChoice"];

const responseValidator = getValidator("ScenarioResponse");

/**
 * POSTs a scenario request and returns a validated, typed ScenarioResponse.
 * Throws ScenarioApiError for every non-2xx response and every network
 * failure — never returns a partially-valid or unvalidated result.
 *
 * `signal` supports stale-response handling: pass an AbortController's
 * signal so a superseded request (the user changed selections and
 * resubmitted before the first call resolved) can be cancelled. An aborted
 * call rejects with a DOMException named "AbortError" — callers should
 * check for that and discard it silently rather than treat it as a failure.
 */
export async function postScenario(
  request: ScenarioRequest,
  options?: { signal?: AbortSignal },
): Promise<ScenarioResponse> {
  return fetchValidatedJson<ScenarioResponse>(
    "/scenarios",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: options?.signal,
    },
    responseValidator,
  );
}
