/**
 * Thin, reshape-only view-model boundary for the player/team detail pages —
 * same rule as `view-model.ts` (decision 0008): rename/group fields for
 * presentation, never calculate or fabricate a value that isn't already in
 * the (already-validated — see src/lib/api/detail.ts) response.
 */
import type { PlayerDetailResponse, TeamDetailResponse } from "@/lib/api/detail";

export interface PlayerDetailTeamStint {
  teamId: string;
  minutes: number;
  possessions: number;
}

export interface PlayerDetailViewModel {
  playerId: string;
  name: string;
  season: string;
  minutes: number;
  possessions: number;
  teamStints: PlayerDetailTeamStint[];
  contributionValue: number;
  offensiveImpact: number;
  defensiveImpact: number;
  providerType: PlayerDetailResponse["provider_type"];
  providerVersion: string;
  dataVersion: string;
  contributionEpistemicType: string;
  attribution: string[];
}

export interface TeamDetailPlayerRow {
  playerId: string;
  name: string;
  minutes: number;
}

export interface TeamDetailViewModel {
  teamId: string;
  season: string;
  players: TeamDetailPlayerRow[];
  rosterSize: number;
  totalRosterMinutes: number;
}

export function toPlayerDetailViewModel(response: PlayerDetailResponse): PlayerDetailViewModel {
  return {
    playerId: response.player_id,
    name: response.name,
    season: response.season,
    minutes: response.minutes,
    possessions: response.possessions,
    teamStints: response.team_stints.map((stint) => ({
      teamId: stint.team_id,
      minutes: stint.minutes,
      possessions: stint.possessions,
    })),
    contributionValue: response.contribution_value,
    offensiveImpact: response.offensive_impact,
    defensiveImpact: response.defensive_impact,
    providerType: response.provider_type,
    providerVersion: response.provider_version,
    dataVersion: response.data_version,
    contributionEpistemicType: response.contribution_epistemic_type,
    attribution: response.attribution,
  };
}

export function toTeamDetailViewModel(response: TeamDetailResponse): TeamDetailViewModel {
  return {
    teamId: response.team_id,
    season: response.season,
    players: response.players.map((player) => ({
      playerId: player.player_id,
      name: player.name,
      minutes: player.minutes,
    })),
    rosterSize: response.roster_size,
    totalRosterMinutes: response.total_roster_minutes,
  };
}
