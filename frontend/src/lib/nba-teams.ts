/**
 * Full franchise names for the 2014-15 season's team codes (the only season
 * this product supports — decision 0007). Presentational only: team names
 * are public, stable facts, not derived from the licensed RAPTOR/Elo data,
 * so this lookup carries no data-rules/licensing implication. Design-review
 * finding: the team selector showed only 3-letter codes ("GSW") with no
 * full name anywhere nearby.
 */
export const NBA_TEAM_NAMES_2014_15: Record<string, string> = {
  ATL: "Atlanta Hawks",
  BOS: "Boston Celtics",
  BRK: "Brooklyn Nets",
  CHA: "Charlotte Hornets",
  CHI: "Chicago Bulls",
  CLE: "Cleveland Cavaliers",
  DAL: "Dallas Mavericks",
  DEN: "Denver Nuggets",
  DET: "Detroit Pistons",
  GSW: "Golden State Warriors",
  HOU: "Houston Rockets",
  IND: "Indiana Pacers",
  LAC: "Los Angeles Clippers",
  LAL: "Los Angeles Lakers",
  MEM: "Memphis Grizzlies",
  MIA: "Miami Heat",
  MIL: "Milwaukee Bucks",
  MIN: "Minnesota Timberwolves",
  NOP: "New Orleans Pelicans",
  NYK: "New York Knicks",
  OKC: "Oklahoma City Thunder",
  ORL: "Orlando Magic",
  PHI: "Philadelphia 76ers",
  PHO: "Phoenix Suns",
  POR: "Portland Trail Blazers",
  SAC: "Sacramento Kings",
  SAS: "San Antonio Spurs",
  TOR: "Toronto Raptors",
  UTA: "Utah Jazz",
  WAS: "Washington Wizards",
};

/** Falls back to the raw code for any code not in the table (defensive, not
 *  expected to trigger against this product's fixed 2014-15 team set). */
export function teamDisplayName(teamId: string): string {
  return NBA_TEAM_NAMES_2014_15[teamId] ?? teamId;
}
