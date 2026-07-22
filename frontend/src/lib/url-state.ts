/**
 * Pure, framework-agnostic parsing/serialization for the 5 URL-driven
 * scenario inputs (decision 0008: "URL-state behavior" — the URL is the
 * canonical *input* state; the API result is never stored here).
 *
 * Framework-agnostic on purpose: takes/returns plain objects and a minimal
 * `{get(name)}` interface (satisfied by both `URLSearchParams` and Next's
 * `ReadonlyURLSearchParams`), so it needs no DOM/router to unit test and no
 * behavior changes between server and client hydration.
 */

export const SUPPORTED_SEASONS = ["2014-15"] as const;
export type SupportedSeason = (typeof SUPPORTED_SEASONS)[number];

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

const PARAM_KEYS = {
  season: "season",
  teamId: "team_id",
  playerOutId: "player_out_id",
  playerInId: "player_in_id",
  contributionProvider: "contribution_provider",
} as const satisfies Record<keyof ScenarioSelectionState, string>;

export interface SearchParamsLike {
  get(name: string): string | null;
}

function normalizeSeason(value: string | null): SupportedSeason | null {
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

/** Parses the 5 scenario-input params. Missing or invalid values normalize to `null` — never throws. */
export function parseScenarioSelection(searchParams: SearchParamsLike): ScenarioSelectionState {
  return {
    season: normalizeSeason(searchParams.get(PARAM_KEYS.season)),
    teamId: normalizeFreeTextId(searchParams.get(PARAM_KEYS.teamId)),
    playerOutId: normalizeFreeTextId(searchParams.get(PARAM_KEYS.playerOutId)),
    playerInId: normalizeFreeTextId(searchParams.get(PARAM_KEYS.playerInId)),
    contributionProvider: normalizeProvider(searchParams.get(PARAM_KEYS.contributionProvider)),
  };
}

/** Serializes a selection back into URLSearchParams. A `null` field is omitted entirely
 *  (an absent param, not an empty-string one) so a partial selection round-trips cleanly.
 *  Never includes anything beyond these 5 input fields — no API result data. */
export function serializeScenarioSelection(state: ScenarioSelectionState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.season !== null) params.set(PARAM_KEYS.season, state.season);
  if (state.teamId !== null) params.set(PARAM_KEYS.teamId, state.teamId);
  if (state.playerOutId !== null) params.set(PARAM_KEYS.playerOutId, state.playerOutId);
  if (state.playerInId !== null) params.set(PARAM_KEYS.playerInId, state.playerInId);
  if (state.contributionProvider !== null) {
    params.set(PARAM_KEYS.contributionProvider, state.contributionProvider);
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
 *   player's validity are exactly as season-scoped as they are team-scoped.
 *   Currently unreachable in practice (SUPPORTED_SEASONS has one value, so
 *   season never actually changes) — kept so this rule already exists the
 *   moment a second season ships, rather than being a gap discovered then.
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
