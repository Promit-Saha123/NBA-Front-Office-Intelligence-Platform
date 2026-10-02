/**
 * Pure, framework-agnostic parsing/serialization for the 5 URL-driven
 * scenario inputs (decision 0008: "URL-state behavior" — the URL is the
 * canonical *input* state; the API result is never stored here).
 *
 * Framework-agnostic on purpose: takes/returns plain objects and a minimal
 * `{get(name)}` interface (satisfied by both `URLSearchParams` and Next's
 * `ReadonlyURLSearchParams`), so it needs no DOM/router to unit test and no
 * behavior changes between server and client hydration.
 *
 * `parseScenarioSelection`/`serializeScenarioSelection` take an optional
 * `paramKeys` map (default: unprefixed `PARAM_KEYS`) so the same 5-field
 * shape can back two independent, URL-coexisting selections on the
 * comparison view (decision 0012) via `makePrefixedParamKeys`.
 */

// Every RS season with complete team/player rows in the pinned RAPTOR
// snapshot (decision 0015) — must match backend.fixtures.historical_loader
// .SUPPORTED_SEASON_LABELS exactly (mirrored by hand since this project has
// no shared-codegen step for plain constants, only for the OpenAPI schema).
export const SUPPORTED_SEASONS = [
  "1976-77", "1977-78", "1978-79", "1979-80", "1980-81", "1981-82",
  "1982-83", "1983-84", "1984-85", "1985-86", "1986-87", "1987-88",
  "1988-89", "1989-90", "1990-91", "1991-92", "1992-93", "1993-94",
  "1994-95", "1995-96", "1996-97", "1997-98", "1998-99", "1999-00",
  "2000-01", "2001-02", "2002-03", "2003-04", "2004-05", "2005-06",
  "2006-07", "2007-08", "2008-09", "2009-10", "2010-11", "2011-12",
  "2012-13", "2013-14", "2014-15", "2015-16", "2016-17", "2017-18",
  "2018-19", "2019-20", "2020-21", "2021-22",
] as const; // fmt: skip
export type SupportedSeason = (typeof SUPPORTED_SEASONS)[number];

/**
 * The season every page defaults to before a user (or the URL) picks one.
 * The *most recent* supported season, not array position 0 — with
 * SUPPORTED_SEASONS now spanning 1976-77 through 2021-22 (decision 0015),
 * defaulting to the oldest season would be a poor first impression for a
 * default landing experience. Centralized here (previously redeclared as
 * `SUPPORTED_SEASONS[0]` independently in four components) since it's now a
 * real product choice, not an incidental array-position pick.
 */
export const DEFAULT_SEASON: SupportedSeason = SUPPORTED_SEASONS[SUPPORTED_SEASONS.length - 1];

/**
 * Buckets a season into its decade (e.g. "1999-00" -> "1990s") for grouping
 * a 46-entry season `<select>` into native `<optgroup>`s (decision 0015) —
 * the same chunking approach ScenarioField already uses for the ~570-player
 * "Player to add" list, not a new UI pattern. Pure/framework-agnostic like
 * the rest of this module; callers attach it as `group` on their own
 * `{value, label, group}` select-option objects.
 */
export function seasonDecadeGroup(season: SupportedSeason): string {
  const startYear = Number(season.slice(0, 4));
  return `${Math.floor(startYear / 10) * 10}s`;
}

export const CONTRIBUTION_PROVIDER_CHOICES = ["historical_benchmark", "synthetic"] as const;
export type ContributionProviderChoice = (typeof CONTRIBUTION_PROVIDER_CHOICES)[number];

export interface ScenarioSelectionState {
  season: SupportedSeason | null;
  teamId: string | null;
  playerOutId: string | null;
  playerInId: string | null;
  contributionProvider: ContributionProviderChoice | null;
}

export const EMPTY_SCENARIO_SELECTION: ScenarioSelectionState = {
  season: null,
  teamId: null,
  playerOutId: null,
  playerInId: null,
  contributionProvider: null,
};

export type ParamKeys = Record<keyof ScenarioSelectionState, string>;

export const PARAM_KEYS = {
  season: "season",
  teamId: "team_id",
  playerOutId: "player_out_id",
  playerInId: "player_in_id",
  contributionProvider: "contribution_provider",
} as const satisfies ParamKeys;

/**
 * Builds a side-prefixed param-key map for the scenario comparison view
 * (decision 0012), e.g. `makePrefixedParamKeys("a")` → `{ season: "a_season",
 * team_id: "a_team_id", ... }`. Two independent `ParamKeys` maps let two
 * scenario selections coexist on one URL without colliding.
 */
export function makePrefixedParamKeys(prefix: string): ParamKeys {
  return Object.fromEntries(
    Object.entries(PARAM_KEYS).map(([field, param]) => [field, `${prefix}_${param}`]),
  ) as ParamKeys;
}

export interface SearchParamsLike {
  get(name: string): string | null;
}

/** Exported for the player/team detail pages, which read `?season=` outside
 *  the 5-field scenario-selection shape this module otherwise owns. */
export function normalizeSeason(value: string | null): SupportedSeason | null {
  return value !== null && (SUPPORTED_SEASONS as readonly string[]).includes(value)
    ? (value as SupportedSeason)
    : null;
}

function normalizeProvider(value: string | null): ContributionProviderChoice | null {
  return value !== null && (CONTRIBUTION_PROVIDER_CHOICES as readonly string[]).includes(value)
    ? (value as ContributionProviderChoice)
    : null;
}

/** A free-text id param: missing, empty, or whitespace-only all normalize to `null`. */
function normalizeFreeTextId(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Parses the 5 scenario-input params (under the given `paramKeys` map, default
 *  unprefixed). Missing or invalid values normalize to `null` — never throws. */
export function parseScenarioSelection(
  searchParams: SearchParamsLike,
  paramKeys: ParamKeys = PARAM_KEYS,
): ScenarioSelectionState {
  return {
    season: normalizeSeason(searchParams.get(paramKeys.season)),
    teamId: normalizeFreeTextId(searchParams.get(paramKeys.teamId)),
    playerOutId: normalizeFreeTextId(searchParams.get(paramKeys.playerOutId)),
    playerInId: normalizeFreeTextId(searchParams.get(paramKeys.playerInId)),
    contributionProvider: normalizeProvider(searchParams.get(paramKeys.contributionProvider)),
  };
}

/** Serializes a selection into URLSearchParams (under the given `paramKeys` map,
 *  default unprefixed). A `null` field is omitted entirely (an absent param, not
 *  an empty-string one) so a partial selection round-trips cleanly. Never includes
 *  anything beyond these 5 input fields — no API result data. */
export function serializeScenarioSelection(
  state: ScenarioSelectionState,
  paramKeys: ParamKeys = PARAM_KEYS,
): URLSearchParams {
  const params = new URLSearchParams();
  if (state.season !== null) params.set(paramKeys.season, state.season);
  if (state.teamId !== null) params.set(paramKeys.teamId, state.teamId);
  if (state.playerOutId !== null) params.set(paramKeys.playerOutId, state.playerOutId);
  if (state.playerInId !== null) params.set(paramKeys.playerInId, state.playerInId);
  if (state.contributionProvider !== null) {
    params.set(paramKeys.contributionProvider, state.contributionProvider);
  }
  return params;
}

export type CompleteScenarioSelection = {
  [K in keyof ScenarioSelectionState]: NonNullable<ScenarioSelectionState[K]>;
};

export function isCompleteSelection(
  state: ScenarioSelectionState,
): state is CompleteScenarioSelection {
  return (
    state.season !== null &&
    state.teamId !== null &&
    state.playerOutId !== null &&
    state.playerInId !== null &&
    state.contributionProvider !== null
  );
}

/**
 * Applies a partial update and runs dependent-field cleanup:
 *
 * - Changing the team clears any previously-selected outgoing player, since
 *   it was only ever valid against the *previous* team's roster
 *   (backend/scenario/service.py requires the outgoing player to be on the
 *   selected team's roster). The incoming player has no team restriction in
 *   the backend, so it is left untouched — the backend remains the final
 *   authority if a specific combination turns out invalid.
 * - Changing the season clears team and both players, since a roster and a
 *   player's validity are exactly as season-scoped as they are team-scoped
 *   (decision 0011 — reachable now that SUPPORTED_SEASONS has two values).
 */
export function applySelectionUpdate(
  state: ScenarioSelectionState,
  update: Partial<ScenarioSelectionState>,
): ScenarioSelectionState {
  const next: ScenarioSelectionState = { ...state, ...update };
  if ("season" in update && update.season !== state.season) {
    next.teamId = null;
    next.playerOutId = null;
    next.playerInId = null;
    return next;
  }
  if ("teamId" in update && update.teamId !== state.teamId) {
    next.playerOutId = null;
  }
  return next;
}
