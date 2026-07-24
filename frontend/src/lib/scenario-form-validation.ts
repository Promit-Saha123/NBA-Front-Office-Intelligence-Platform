/**
 * Pure validation/derivation logic for ScenarioForm.tsx (extracted from the
 * component — see HANDOFF.md's deferred-tech-debt note). Same pattern as
 * url-state.ts: plain data in, plain data out, no JSX/DOM, independently
 * unit-testable. Deliberately excludes the dropdown-option-list building
 * (teamOptions/playerOutOptions/playerInOptions) — that's presentational
 * (produces labeled ScenarioFieldOption[]) and stays in the component.
 */
import { isCompleteSelection, type ContributionProviderChoice, type ScenarioSelectionState } from "@/lib/url-state";

export interface ScenarioFormValidationInput {
  selection: ScenarioSelectionState;
  /** Team ids known to exist for the season (teams.data?.teams ?? []). */
  knownTeamIds: readonly string[];
  /** teams.data !== null — "not in the list yet" must not be conflated with "still loading." */
  teamsLoaded: boolean;
  /** teamRoster.data?.players ?? []. */
  rosterPlayers: readonly { player_id: string }[];
  /** teamRoster.data !== null — same not-loaded-yet distinction as teamsLoaded. */
  rosterLoaded: boolean;
  submissionStatus: "idle" | "loading" | "success" | "error";
  /** The team/player ids the currently-shown result actually came from, or null if none is shown. */
  successResult: { teamId: string; playerOutId: string; playerInId: string } | null;
  /** The provider actually submitted with successResult (see ScenarioForm's own comment on why
   *  this can't be read off the response directly). */
  submittedProvider: ContributionProviderChoice | null;
}

export interface ScenarioFormValidationResult {
  /** The selected team's roster, by id — also reused by the component for option filtering. */
  rosterPlayerIds: Set<string>;
  teamNotFoundInvalid: boolean;
  samePlayerInvalid: boolean;
  playerInAlreadyOnRosterInvalid: boolean;
  playerOutNotOnRosterInvalid: boolean;
  submitDisabled: boolean;
  hasAnythingToClear: boolean;
  resultStale: boolean;
}

export function deriveScenarioFormState(
  input: ScenarioFormValidationInput,
): ScenarioFormValidationResult {
  const { selection } = input;

  const rosterPlayerIds = new Set(input.rosterPlayers.map((p) => p.player_id));

  // Only assertable once the teams list has actually loaded — before that,
  // "not in the list yet" doesn't mean "invalid," just "not loaded yet."
  const teamNotFoundInvalid =
    selection.teamId !== null && input.teamsLoaded && !input.knownTeamIds.includes(selection.teamId);

  // Defense in depth for direct URL edits that bypass the dropdown filtering.
  // Each is only assertable once its supporting data has actually loaded.
  const samePlayerInvalid =
    selection.playerOutId !== null &&
    selection.playerInId !== null &&
    selection.playerOutId === selection.playerInId;
  const playerInAlreadyOnRosterInvalid =
    selection.playerInId !== null && rosterPlayerIds.has(selection.playerInId);
  const playerOutNotOnRosterInvalid =
    selection.playerOutId !== null && input.rosterLoaded && !rosterPlayerIds.has(selection.playerOutId);

  const loading = input.submissionStatus === "loading";
  const hasAnythingToClear =
    selection.teamId !== null ||
    selection.playerOutId !== null ||
    selection.playerInId !== null ||
    selection.contributionProvider !== null ||
    input.submissionStatus !== "idle";

  const submitDisabled =
    !isCompleteSelection(selection) ||
    loading ||
    teamNotFoundInvalid ||
    samePlayerInvalid ||
    playerInAlreadyOnRosterInvalid ||
    playerOutNotOnRosterInvalid;

  // Compares the current form selection against the values the shown result
  // actually came from, so editing a field after a result is shown marks it
  // as no-longer-matching-the-form.
  const resultStale =
    input.successResult !== null &&
    (selection.teamId !== input.successResult.teamId ||
      selection.playerOutId !== input.successResult.playerOutId ||
      selection.playerInId !== input.successResult.playerInId ||
      selection.contributionProvider !== input.submittedProvider);

  return {
    rosterPlayerIds,
    teamNotFoundInvalid,
    samePlayerInvalid,
    playerInAlreadyOnRosterInvalid,
    playerOutNotOnRosterInvalid,
    submitDisabled,
    hasAnythingToClear,
    resultStale,
  };
}
