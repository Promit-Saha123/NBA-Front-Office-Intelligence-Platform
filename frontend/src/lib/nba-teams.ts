/**
 * Season-aware franchise names for every team code the pinned RAPTOR
 * snapshot uses, 1976-77 through 2021-22 (decision 0015). Presentational
 * only: team names are public, stable historical facts, not derived from
 * the licensed RAPTOR/Elo data, so this lookup carries no data-rules/
 * licensing implication.
 *
 * Season-aware because a handful of codes are genuinely ambiguous without
 * it — most importantly **"CHA"**, which names two different franchise
 * identities across its one continuous 2004-05–2021-22 run: the expansion
 * "Charlotte Bobcats" (2004-05–2013-14) before they bought back the
 * "Hornets" name and history in 2014-15. A flat code→name map (this
 * project's original 2014-15-only design) cannot represent that — it would
 * either show "Bobcats" for 2015-16 or "Hornets" for 2010-11, silently
 * wrong either way. Every other code maps to exactly one franchise identity
 * for its entire run (relocations get a *different* code, e.g. SEA→OKC),
 * so most entries below cover one contiguous range each.
 *
 * Ranges and exact season boundaries verified directly against
 * historical_RAPTOR_by_team.csv's own season/team columns (RS rows only),
 * not assumed from general franchise-history knowledge.
 */

interface TeamNameEra {
  /** Inclusive season-label bounds, e.g. "2004-05". */
  startSeason: string;
  endSeason: string;
  name: string;
}

const TEAM_NAME_ERAS: Record<string, TeamNameEra[]> = {
  // Stable for their entire 1976-77–2021-22 run — one era each.
  ATL: [{ startSeason: "1976-77", endSeason: "2021-22", name: "Atlanta Hawks" }],
  BOS: [{ startSeason: "1976-77", endSeason: "2021-22", name: "Boston Celtics" }],
  CHI: [{ startSeason: "1976-77", endSeason: "2021-22", name: "Chicago Bulls" }],
  CLE: [{ startSeason: "1976-77", endSeason: "2021-22", name: "Cleveland Cavaliers" }],
  DEN: [{ startSeason: "1976-77", endSeason: "2021-22", name: "Denver Nuggets" }],
  DET: [{ startSeason: "1976-77", endSeason: "2021-22", name: "Detroit Pistons" }],
  GSW: [{ startSeason: "1976-77", endSeason: "2021-22", name: "Golden State Warriors" }],
  HOU: [{ startSeason: "1976-77", endSeason: "2021-22", name: "Houston Rockets" }],
  IND: [{ startSeason: "1976-77", endSeason: "2021-22", name: "Indiana Pacers" }],
  LAL: [{ startSeason: "1976-77", endSeason: "2021-22", name: "Los Angeles Lakers" }],
  MIL: [{ startSeason: "1976-77", endSeason: "2021-22", name: "Milwaukee Bucks" }],
  NYK: [{ startSeason: "1976-77", endSeason: "2021-22", name: "New York Knicks" }],
  PHI: [{ startSeason: "1976-77", endSeason: "2021-22", name: "Philadelphia 76ers" }],
  PHO: [{ startSeason: "1976-77", endSeason: "2021-22", name: "Phoenix Suns" }],
  POR: [{ startSeason: "1976-77", endSeason: "2021-22", name: "Portland Trail Blazers" }],
  SAS: [{ startSeason: "1976-77", endSeason: "2021-22", name: "San Antonio Spurs" }],

  // Later expansion teams, stable once they exist.
  DAL: [{ startSeason: "1980-81", endSeason: "2021-22", name: "Dallas Mavericks" }],
  UTA: [{ startSeason: "1979-80", endSeason: "2021-22", name: "Utah Jazz" }],
  LAC: [{ startSeason: "1984-85", endSeason: "2021-22", name: "Los Angeles Clippers" }],
  SAC: [{ startSeason: "1985-86", endSeason: "2021-22", name: "Sacramento Kings" }],
  MIA: [{ startSeason: "1988-89", endSeason: "2021-22", name: "Miami Heat" }],
  MIN: [{ startSeason: "1989-90", endSeason: "2021-22", name: "Minnesota Timberwolves" }],
  ORL: [{ startSeason: "1989-90", endSeason: "2021-22", name: "Orlando Magic" }],
  TOR: [{ startSeason: "1995-96", endSeason: "2021-22", name: "Toronto Raptors" }],
  MEM: [{ startSeason: "2001-02", endSeason: "2021-22", name: "Memphis Grizzlies" }],
  WAS: [{ startSeason: "1997-98", endSeason: "2021-22", name: "Washington Wizards" }],
  BRK: [{ startSeason: "2012-13", endSeason: "2021-22", name: "Brooklyn Nets" }],
  OKC: [{ startSeason: "2008-09", endSeason: "2021-22", name: "Oklahoma City Thunder" }],
  NOP: [{ startSeason: "2013-14", endSeason: "2021-22", name: "New Orleans Pelicans" }],

  // Relocated/renamed franchises, one era each under their earlier code.
  BUF: [{ startSeason: "1976-77", endSeason: "1977-78", name: "Buffalo Braves" }],
  SDC: [{ startSeason: "1978-79", endSeason: "1983-84", name: "San Diego Clippers" }],
  KCK: [{ startSeason: "1976-77", endSeason: "1984-85", name: "Kansas City Kings" }],
  NOJ: [{ startSeason: "1976-77", endSeason: "1978-79", name: "New Orleans Jazz" }],
  NYN: [{ startSeason: "1976-77", endSeason: "1976-77", name: "New York Nets" }],
  NJN: [{ startSeason: "1977-78", endSeason: "2011-12", name: "New Jersey Nets" }],
  WSB: [{ startSeason: "1976-77", endSeason: "1996-97", name: "Washington Bullets" }],
  SEA: [{ startSeason: "1976-77", endSeason: "2007-08", name: "Seattle SuperSonics" }],
  VAN: [{ startSeason: "1995-96", endSeason: "2000-01", name: "Vancouver Grizzlies" }],
  CHH: [{ startSeason: "1988-89", endSeason: "2001-02", name: "Charlotte Hornets" }],

  // New Orleans' Hornets era: two non-contiguous runs (Katrina relocation
  // used a separate code, NOK, in between) but the same franchise identity
  // and name both times, so one entry per run is enough — no ambiguity to
  // resolve, unlike CHA below.
  NOH: [
    { startSeason: "2002-03", endSeason: "2004-05", name: "New Orleans Hornets" },
    { startSeason: "2007-08", endSeason: "2012-13", name: "New Orleans Hornets" },
  ],
  NOK: [
    {
      startSeason: "2005-06",
      endSeason: "2006-07",
      name: "New Orleans/Oklahoma City Hornets",
    },
  ],

  // The genuinely ambiguous case this module exists for: one continuous
  // code, two real identities.
  CHA: [
    { startSeason: "2004-05", endSeason: "2013-14", name: "Charlotte Bobcats" },
    { startSeason: "2014-15", endSeason: "2021-22", name: "Charlotte Hornets" },
  ],
};

/**
 * Resolves a team code's display name for a specific season. Falls back to
 * the raw code when the code is unrecognized, the season is outside the
 * matching era, or `season` is omitted — defensive, not expected to trigger
 * for any (code, season) pair this app's own SUPPORTED_SEASONS/loader
 * actually produces together.
 */
export function teamDisplayName(teamId: string, season?: string): string {
  const eras = TEAM_NAME_ERAS[teamId];
  if (!eras) return teamId;
  if (season === undefined) return eras[eras.length - 1]?.name ?? teamId;
  const match = eras.find((era) => season >= era.startSeason && season <= era.endSeason);
  return match?.name ?? teamId;
}
