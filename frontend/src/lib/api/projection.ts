/**
 * Isolated API-client module for the player-projection route
 * (backend/api/app.py's GET /seasons/{season}/players/{player_id}/projection,
 * decision 0013's RAPTOR-trend model). Same isolation rule as
 * scenarios.ts/lookups.ts/detail.ts: only files under src/lib/api/ import
 * generated `components["schemas"]` directly.
 *
 * This is a standalone next-season forecast, never mixed into any
 * scenario/roster-builder response — see the response type's own comment in
 * backend/api/schemas.py for why.
 */
import type { components } from "@/generated/api-types";
import { getValidator } from "./validate";
import { fetchValidatedJson } from "./http";

export type PlayerProjectionResponse = components["schemas"]["PlayerProjectionResponse"];

const playerProjectionValidator = getValidator("PlayerProjectionResponse");

export async function getPlayerProjection(
  season: string,
  playerId: string,
  options?: { signal?: AbortSignal },
): Promise<PlayerProjectionResponse> {
  return fetchValidatedJson<PlayerProjectionResponse>(
    `/seasons/${encodeURIComponent(season)}/players/${encodeURIComponent(playerId)}/projection`,
    { signal: options?.signal },
    playerProjectionValidator,
  );
}
