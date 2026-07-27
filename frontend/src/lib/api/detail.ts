/**
 * Isolated API-client module for the player/team detail routes
 * (backend/api/lookups.py's get_player_detail/get_team_detail, wired into
 * backend/api/app.py as GET /seasons/{season}/players/{player_id} and
 * GET /seasons/{season}/teams/{team_id}). Same isolation rule as
 * scenarios.ts/lookups.ts: only files under src/lib/api/ import generated
 * `components["schemas"]` directly; presentation code imports the aliases
 * re-exported here.
 *
 * team_stints is a list, not a single team_id, because a player can have
 * more than one stint in a season (mid-season trade). getTeamDetail has no
 * provider parameter — the team-detail route exposes no provider-derived
 * value, so there is nothing for a provider choice to affect.
 */
import type { components } from "@/generated/api-types";
import { getValidator } from "./validate";
import { fetchValidatedJson } from "./http";

export type PlayerDetailResponse = components["schemas"]["PlayerDetailResponse"];
export type TeamDetailResponse = components["schemas"]["TeamDetailResponse"];
export type TeamStintResponse = components["schemas"]["TeamStintResponse"];
// Re-exported from the generated schema, same as scenarios.ts's own
// ContributionProviderChoice alias — not the url-state.ts hand-written
// literal, so a future third provider is caught here at compile time
// instead of silently drifting (decision 0008's runtime-validation
// rationale, applied to a request param instead of a response shape).
export type ContributionProviderChoice = components["schemas"]["ContributionProviderChoice"];

const playerDetailValidator = getValidator("PlayerDetailResponse");
const teamDetailValidator = getValidator("TeamDetailResponse");

export async function getPlayerDetail(
  season: string,
  playerId: string,
  provider: ContributionProviderChoice,
  options?: { signal?: AbortSignal },
): Promise<PlayerDetailResponse> {
  return fetchValidatedJson<PlayerDetailResponse>(
    `/seasons/${encodeURIComponent(season)}/players/${encodeURIComponent(playerId)}` +
      `?contribution_provider=${encodeURIComponent(provider)}`,
    { signal: options?.signal },
    playerDetailValidator,
  );
}

export async function getTeamDetail(
  season: string,
  teamId: string,
  options?: { signal?: AbortSignal },
): Promise<TeamDetailResponse> {
  return fetchValidatedJson<TeamDetailResponse>(
    `/seasons/${encodeURIComponent(season)}/teams/${encodeURIComponent(teamId)}`,
    { signal: options?.signal },
    teamDetailValidator,
  );
}
