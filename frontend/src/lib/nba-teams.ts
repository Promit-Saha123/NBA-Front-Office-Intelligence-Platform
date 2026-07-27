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

/**
 * Approximate primary brand colors per team — used only as a background
 * tint for TeamLogo.tsx's generated placeholder badge, never to reproduce
 * an actual team logo mark. A color alone isn't the trademarked asset (the
 * logo artwork is); this carries the same "public fact, no data-rules
 * implication" status as the team names above.
 */
export const NBA_TEAM_COLORS_2014_15: Record<string, string> = {
  ATL: "#E03A3E",
  BOS: "#007A33",
  BRK: "#000000",
  CHA: "#1D1160",
  CHI: "#CE1141",
  CLE: "#860038",
  DAL: "#00538C",
  DEN: "#0E2240",
  DET: "#C8102E",
  GSW: "#1D428A",
  HOU: "#CE1141",
  IND: "#002D62",
  LAC: "#C8102E",
  LAL: "#552583",
  MEM: "#5D76A9",
  MIA: "#98002E",
  MIL: "#00471B",
  MIN: "#0C2340",
  NOP: "#0C2340",
  NYK: "#006BB6",
  OKC: "#007AC1",
  ORL: "#0077C0",
  PHI: "#006BB6",
  PHO: "#E56020",
  POR: "#E03A3E",
  SAC: "#5A2D81",
  SAS: "#8A8D8F",
  TOR: "#CE1141",
  UTA: "#002B5C",
  WAS: "#002B5C",
};

/** Falls back to a neutral gray for any code not in the table. */
export function teamAccentColor(teamId: string): string {
  return NBA_TEAM_COLORS_2014_15[teamId] ?? "#5c5c5c";
}
