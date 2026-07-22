/**
 * Isolated API-client module for the read-only season/team/player lookup
 * routes (backend/api/lookups.py) — GET /seasons/{season}/teams,
 * GET /seasons/{season}/teams/{team_id}/roster,
 * GET /seasons/{season}/players. Same isolation rule as scenarios.ts: only
 * this file and scenarios.ts import generated `components["schemas"]`
 * directly; presentation code imports the aliases re-exported here.
 * Transport/error-normalization plumbing lives in ./http.ts, shared with
 * ./scenarios.ts.
 */
import type { components } from "@/generated/api-types";
import { getValidator } from "./validate";
import { fetchValidatedJson } from "./http";

export type TeamsResponse = components["schemas"]["TeamsResponse"];
export type TeamRosterResponse = components["schemas"]["TeamRosterResponse"];
export type RosterPlayerResponse = components["schemas"]["RosterPlayerResponse"];
export type SeasonPlayersResponse = components["schemas"]["SeasonPlayersResponse"];
export type PlayerSummaryResponse = components["schemas"]["PlayerSummaryResponse"];

const teamsValidator = getValidator("TeamsResponse");
const teamRosterValidator = getValidator("TeamRosterResponse");
const seasonPlayersValidator = getValidator("SeasonPlayersResponse");

export async function listTeams(
  season: string,
  options?: { signal?: AbortSignal },
): Promise<TeamsResponse> {
  return fetchValidatedJson<TeamsResponse>(
    `/seasons/${encodeURIComponent(season)}/teams`,
    { signal: options?.signal },
    teamsValidator,
  );
}

export async function getTeamRoster(
  season: string,
  teamId: string,
  options?: { signal?: AbortSignal },
): Promise<TeamRosterResponse> {
  return fetchValidatedJson<TeamRosterResponse>(
    `/seasons/${encodeURIComponent(season)}/teams/${encodeURIComponent(teamId)}/roster`,
    { signal: options?.signal },
    teamRosterValidator,
  );
}

export async function listSeasonPlayers(
  season: string,
  options?: { signal?: AbortSignal },
): Promise<SeasonPlayersResponse> {
  return fetchValidatedJson<SeasonPlayersResponse>(
    `/seasons/${encodeURIComponent(season)}/players`,
    { signal: options?.signal },
    seasonPlayersValidator,
  );
}
