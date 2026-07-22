import type { ScenarioApiError } from "@/lib/api/errors";
import type { ScenarioResponse } from "@/lib/api/scenarios";

/** Ephemeral, form-local submission state — never persisted to the URL (decision 0008). */
export type SubmissionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; response: ScenarioResponse }
  | { status: "error"; error: ScenarioApiError };
