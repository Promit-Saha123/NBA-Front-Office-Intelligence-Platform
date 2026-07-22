/**
 * Shared fetch + error-normalization core for every module under
 * src/lib/api/. Factored out in UI-002 once a second endpoint family
 * (lookups.ts, alongside scenarios.ts) needed the identical normalization
 * behavior — this is not a general-purpose HTTP client, it exists because
 * there are now two concrete call sites needing the same four outcomes
 * (validated success / domain error / FastAPI validation error / network
 * failure) normalized identically. Never imports generated OpenAPI types
 * itself — callers supply their own compiled ajv validator and type
 * parameter, so this file has no transport-type coupling of its own.
 */
import type { ValidateFunction } from "ajv";
import { describeValidationErrors } from "./validate";
import {
  ScenarioApiError,
  NETWORK_ERROR_CODE,
  FASTAPI_VALIDATION_ERROR_CODE,
  INVALID_RESPONSE_SHAPE_CODE,
  UNKNOWN_ERROR_CODE,
  CLIENT_CONFIGURATION_ERROR_CODE,
  messageForErrorCode,
} from "./errors";

export function apiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new ScenarioApiError({
      status: 0,
      code: CLIENT_CONFIGURATION_ERROR_CODE,
      message: messageForErrorCode(CLIENT_CONFIGURATION_ERROR_CODE),
      devDetail: "NEXT_PUBLIC_API_URL is not set — see frontend/.env.example",
    });
  }
  return url;
}

interface DomainErrorBody {
  code: string;
  message: string;
}

function isDomainErrorBody(value: unknown): value is DomainErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).code === "string" &&
    typeof (value as Record<string, unknown>).message === "string"
  );
}

interface FastApiValidationBody {
  detail: unknown[];
}

function isFastApiValidationBody(value: unknown): value is FastApiValidationBody {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Record<string, unknown>).detail)
  );
}

function isAbortError(value: unknown): value is DOMException {
  return value instanceof DOMException && value.name === "AbortError";
}

/**
 * Fetches `path` under NEXT_PUBLIC_API_URL, parses JSON, and validates the
 * result against `validator` (a schema compiled by getValidator()). Throws
 * ScenarioApiError for every non-2xx response, network failure, or invalid
 * response shape — never returns a partially-valid or unvalidated result.
 *
 * A deliberate abort (init.signal aborted by the caller — see
 * scenarios.ts's stale-response handling) is rethrown as-is, not wrapped as
 * a NETWORK_ERROR: an intentional supersession is not a failure, and the
 * caller is expected to check `error.name === "AbortError"` and discard it
 * silently rather than display it.
 */
export async function fetchValidatedJson<T>(
  path: string,
  init: RequestInit | undefined,
  validator: ValidateFunction,
): Promise<T> {
  const endpoint = `${apiBaseUrl()}${path}`;

  let response: Response;
  try {
    response = await fetch(endpoint, init);
  } catch (cause) {
    if (isAbortError(cause)) throw cause;
    throw new ScenarioApiError({
      status: 0,
      code: NETWORK_ERROR_CODE,
      message: messageForErrorCode(NETWORK_ERROR_CODE),
      devDetail: cause,
    });
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    if (isAbortError(cause)) throw cause;
    throw new ScenarioApiError({
      status: response.status,
      code: NETWORK_ERROR_CODE,
      message: messageForErrorCode(NETWORK_ERROR_CODE),
      devDetail: cause,
    });
  }

  if (!response.ok) {
    if (isDomainErrorBody(body)) {
      throw new ScenarioApiError({
        status: response.status,
        code: body.code,
        message: messageForErrorCode(body.code),
        devDetail: body.message,
      });
    }
    if (isFastApiValidationBody(body)) {
      throw new ScenarioApiError({
        status: response.status,
        code: FASTAPI_VALIDATION_ERROR_CODE,
        message: messageForErrorCode(FASTAPI_VALIDATION_ERROR_CODE),
        devDetail: body.detail,
      });
    }
    throw new ScenarioApiError({
      status: response.status,
      code: UNKNOWN_ERROR_CODE,
      message: messageForErrorCode(UNKNOWN_ERROR_CODE),
      devDetail: body,
    });
  }

  if (!validator(body)) {
    throw new ScenarioApiError({
      status: response.status,
      code: INVALID_RESPONSE_SHAPE_CODE,
      message: messageForErrorCode(INVALID_RESPONSE_SHAPE_CODE),
      devDetail: describeValidationErrors(validator.errors),
    });
  }

  return body as T;
}
