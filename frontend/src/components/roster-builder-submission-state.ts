import type { ScenarioApiError } from "@/lib/api/errors";
import type { RosterBuilderResponse } from "@/lib/api/roster-builder";

/** Ephemeral, page-local submission state — never persisted (decision 0014, same
 *  local-state-only convention as the 12-slot roster assignment itself). */
export type RosterBuilderSubmissionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; response: RosterBuilderResponse }
  | { status: "error"; error: ScenarioApiError };
