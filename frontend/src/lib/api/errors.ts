/**
 * Normalized API error shape + the domain-error-code -> user-message map
 * (backend/api/errors.py is the source of the codes; kept in sync by hand
 * since it's a small, stable, documented list — see
 * docs/scenario-engine.md §31 for the authoritative table).
 */

export interface ScenarioApiErrorShape {
  status: number;
  code: string;
  message: string;
}

/** Thrown by the API client for every non-2xx response and every network failure. */
export class ScenarioApiError extends Error implements ScenarioApiErrorShape {
  readonly status: number;
  readonly code: string;
  /** Extra diagnostic detail for developer consoles/logs only — never render to end users. */
  readonly devDetail?: unknown;

  constructor(params: { status: number; code: string; message: string; devDetail?: unknown }) {
    super(params.message);
    this.name = "ScenarioApiError";
    this.status = params.status;
    this.code = params.code;
    this.devDetail = params.devDetail;
  }
}

/** A response reached the browser but didn't parse as JSON, or the request never got a response. */
export const NETWORK_ERROR_CODE = "NETWORK_ERROR";
/** FastAPI's own request-validation failure shape ({"detail": [...]}), not a backend.domain.errors.DomainError. */
export const FASTAPI_VALIDATION_ERROR_CODE = "FASTAPI_VALIDATION_ERROR";
/** A 2xx response whose body didn't match ScenarioResponse's generated schema. */
export const INVALID_RESPONSE_SHAPE_CODE = "INVALID_RESPONSE_SHAPE";
/** A non-2xx response whose body matched neither the domain-error nor the FastAPI-validation shape. */
export const UNKNOWN_ERROR_CODE = "UNKNOWN_ERROR";
/** The client is misconfigured (e.g. NEXT_PUBLIC_API_URL unset) — never reached the network. */
export const CLIENT_CONFIGURATION_ERROR_CODE = "CLIENT_CONFIGURATION_ERROR";

const KNOWN_ERROR_MESSAGES: Record<string, string> = {
  UNSUPPORTED_SEASON: "This season isn't available in the historical dataset yet.",
  TEAM_NOT_FOUND: "That team wasn't found for the selected season.",
  PLAYER_NOT_FOUND: "That player has no record in the selected season.",
  PLAYER_NOT_ON_ROSTER: "The outgoing player isn't on this team's roster for this season.",
  PLAYER_ALREADY_ON_ROSTER: "The incoming player is already on this team's roster.",
  SAME_PLAYER_SWAP: "Choose two different players to swap.",
  MISSING_CONTRIBUTION: "No contribution value is available for one of the selected players.",
  INVALID_ROTATION: "This roster change can't produce a valid 240-minute rotation.",
  INVALID_MANUAL_MINUTES: "Those minutes aren't valid — check the total and each player's value.",
  [FASTAPI_VALIDATION_ERROR_CODE]: "Check your selections and try again.",
  [NETWORK_ERROR_CODE]: "Could not reach the server. Check your connection and try again.",
  [INVALID_RESPONSE_SHAPE_CODE]: "The server returned an unexpected response.",
  [UNKNOWN_ERROR_CODE]: "Something went wrong on our end. Please try again.",
  [CLIENT_CONFIGURATION_ERROR_CODE]: "This app isn't configured correctly. Please try again later.",
};

const GENERIC_FALLBACK_MESSAGE = "Something went wrong on our end. Please try again.";

/** Actionable, user-facing text for a backend error code. Never the raw HTTP status text. */
export function messageForErrorCode(code: string): string {
  return KNOWN_ERROR_MESSAGES[code] ?? GENERIC_FALLBACK_MESSAGE;
}
