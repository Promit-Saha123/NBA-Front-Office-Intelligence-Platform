"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useScenarioSelection } from "@/lib/use-scenario-selection";
import { useSeasonPlayers, useTeamRoster, useTeams } from "@/lib/use-roster-lookups";
import { postScenario, type ScenarioRequest } from "@/lib/api/scenarios";
import { ScenarioApiError, UNKNOWN_ERROR_CODE, messageForErrorCode } from "@/lib/api/errors";
import {
  CONTRIBUTION_PROVIDER_CHOICES,
  isCompleteSelection,
  SUPPORTED_SEASONS,
  type ContributionProviderChoice,
} from "@/lib/url-state";
import { deriveScenarioFormState } from "@/lib/scenario-form-validation";
import { ScenarioField, type ScenarioFieldOption } from "./ScenarioField";
import { teamDisplayName } from "@/lib/nba-teams";
import { ScenarioStatus } from "./ScenarioStatus";
import { ScenarioSuccessPreview } from "./ScenarioSuccessPreview";
import type { SubmissionState } from "./scenario-submission-state";
import { toScenarioViewModel } from "@/lib/view-model";
import styles from "./ScenarioForm.module.css";

const SEASON = SUPPORTED_SEASONS[0];

// Keyed by the request enum (ContributionProviderChoice), not the response enum
// (ProviderType) ScenarioDisclosuresPanel's PROVIDER_BADGE_TEXT uses — two distinct
// backend enums for "which provider," each map typed against its own source of truth.
const PROVIDER_LABELS: Record<ContributionProviderChoice, string> = {
  historical_benchmark: "Historical RAPTOR benchmark",
  synthetic: "Synthetic estimate (demo values)",
};

const STATUS_REGION_ID = "scenario-status";

/**
 * A native <select> can't visually reflect a controlled `value` that has no
 * matching <option> — which would otherwise happen for a selection that
 * came from a direct URL edit (a hand-typed or stale shared link) rather
 * than the dropdown itself, since the normal filtering rules exclude it.
 * Rather than let the select silently blank out while state stays "invalid"
 * for a reason the user can't see, this keeps the selected id visible (with
 * whatever name is known, or the raw id) so the field's error text is
 * legible against what's actually showing.
 */
function withSelectedOptionVisible(
  options: ScenarioFieldOption[],
  selectedId: string | null,
  knownNames: readonly { player_id: string; name: string }[],
): ScenarioFieldOption[] {
  if (selectedId === null || options.some((option) => option.value === selectedId)) {
    return options;
  }
  const known = knownNames.find((p) => p.player_id === selectedId);
  return [...options, { value: selectedId, label: known?.name ?? selectedId }];
}

export function ScenarioForm() {
  const { selection, updateSelection, commitSelection } = useScenarioSelection();
  const teams = useTeams(SEASON);
  const seasonPlayers = useSeasonPlayers(SEASON);
  const teamRoster = useTeamRoster(SEASON, selection.teamId);

  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });
  // The provider actually submitted with the current successViewModel — snapshotted
  // separately since the response's provider_type is a different enum (see
  // EditableScenarioMinutes' own prop comment) and `selection` may keep changing
  // after submission while the prior result is still on screen.
  const [submittedProvider, setSubmittedProvider] = useState<ContributionProviderChoice | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);

  // Season is locked to its one supported value — normalize it into the URL
  // on first load if absent, so a shared link always shows it explicitly.
  // This is an edit (router.replace via updateSelection), not a submission.
  useEffect(() => {
    if (selection.season === null) {
      updateSelection({ season: SEASON });
    }
    // Intentionally only on mount: re-running this whenever `selection`
    // changes would fight the user's own edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cancel any in-flight request if the component unmounts mid-request.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Computed once here (not re-derived inside ScenarioSuccessPreview) so every
  // read of the response — including the label lookups just below — goes
  // through the same reshape-only view-model, never the raw DTO directly.
  const successViewModel =
    submission.status === "success" ? toScenarioViewModel(submission.response) : null;

  // Extracted to a pure module (scenario-form-validation.ts, matching the
  // url-state.ts pattern) — see its own doc comments for what each flag means.
  const {
    rosterPlayerIds,
    teamNotFoundInvalid,
    samePlayerInvalid,
    playerInAlreadyOnRosterInvalid,
    playerOutNotOnRosterInvalid,
    submitDisabled,
    hasAnythingToClear,
    resultStale,
  } = deriveScenarioFormState({
    selection,
    knownTeamIds: teams.data?.teams ?? [],
    teamsLoaded: teams.data !== null,
    rosterPlayers: teamRoster.data?.players ?? [],
    rosterLoaded: teamRoster.data !== null,
    submissionStatus: submission.status,
    successResult: successViewModel,
    submittedProvider,
  });

  const knownTeamIds = teams.data?.teams ?? [];
  const teamOptions = withSelectedOptionVisible(
    knownTeamIds.map((teamId) => ({ value: teamId, label: `${teamId} — ${teamDisplayName(teamId)}` })),
    selection.teamId,
    [],
  );

  const rosterPlayers = teamRoster.data?.players ?? [];
  const playerOutOptions = withSelectedOptionVisible(
    rosterPlayers.map((p) => ({ value: p.player_id, label: p.name })),
    selection.playerOutId,
    rosterPlayers,
  );
  // Anyone already on the selected team's roster is excluded — this also
  // structurally excludes the current player-out selection, since they are
  // by definition on the roster too (same rule covers both prevention cases).
  const seasonPlayerList = seasonPlayers.data?.players ?? [];
  const playerInOptions = withSelectedOptionVisible(
    seasonPlayerList
      .filter((p) => !rosterPlayerIds.has(p.player_id))
      // Grouped by first letter — a native <optgroup> chunking of what would
      // otherwise be one flat list of ~478 names (design-review finding:
      // a "wall of options" with no grouping aid).
      .map((p) => ({ value: p.player_id, label: p.name, group: p.name[0]?.toUpperCase() ?? "#" })),
    selection.playerInId,
    seasonPlayerList,
  );

  // One name resolver for every player_id shown in the result (team roster ∪
  // season players covers both the outgoing and incoming player either way).
  // Not memoized: rebuilt from a couple hundred entries at most, on renders
  // that are already re-rendering these same lists into <select> options.
  const playerNameById = new Map<string, string>();
  for (const p of seasonPlayerList) playerNameById.set(p.player_id, p.name);
  for (const p of rosterPlayers) playerNameById.set(p.player_id, p.name);
  const playerLabel = (playerId: string) => playerNameById.get(playerId) ?? playerId;

  const loading = submission.status === "loading";

  function handleStartOver() {
    // Season is left untouched — it's the one locked, always-set field, not
    // something "start over" clears (there's nowhere else for it to go).
    updateSelection({
      teamId: null,
      playerOutId: null,
      playerInId: null,
      contributionProvider: null,
    });
    abortRef.current?.abort();
    setSubmission({ status: "idle" });
    setSubmittedProvider(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitDisabled || !isCompleteSelection(selection)) return;

    // The submitted URL state is the meaningful, history-worthy event —
    // pushed before the call, independent of whether it succeeds.
    commitSelection();

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSubmission({ status: "loading" });

    const request: ScenarioRequest = {
      team_id: selection.teamId,
      season: selection.season,
      player_out_id: selection.playerOutId,
      player_in_id: selection.playerInId,
      contribution_provider: selection.contributionProvider,
    };

    setSubmittedProvider(request.contribution_provider);

    try {
      const response = await postScenario(request, { signal: controller.signal });
      setSubmission({ status: "success", response });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return; // superseded by a newer submission — discard silently, not an error
      }
      if (err instanceof ScenarioApiError) {
        setSubmission({ status: "error", error: err });
        return;
      }
      setSubmission({
        status: "error",
        error: new ScenarioApiError({
          status: 0,
          code: UNKNOWN_ERROR_CODE,
          message: messageForErrorCode(UNKNOWN_ERROR_CODE),
          devDetail: err,
        }),
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-describedby={STATUS_REGION_ID} className={styles.form}>
      <div className={styles.grid}>
        {/* Static text, not a disabled <select> with one option — a disabled
         *  select still looks clickable and invites a pointless click when
         *  (as in this MVP) there is only ever one possible value. */}
        <div className={styles.field}>
          <span id="season-label" className={styles.label}>
            Season
          </span>
          <p aria-labelledby="season-label" aria-describedby="season-help" className={styles.select}>
            {SEASON}
          </p>
          <p id="season-help" className={styles.help}>
            Only the 2014-15 season is available in this historical dataset.
          </p>
        </div>
        <ScenarioField
          id="team"
          label="Team"
          value={selection.teamId}
          onChange={(value) => updateSelection({ teamId: value })}
          options={teamOptions}
          disabled={loading || teams.loading}
          placeholder={teams.loading ? "Loading teams…" : "Select a team"}
          errorText={
            teamNotFoundInvalid
              ? "That team wasn't found for this season."
              : teams.error?.message
          }
          required
        />
        <ScenarioField
          id="player-out"
          label="Player to remove"
          value={selection.playerOutId}
          onChange={(value) => updateSelection({ playerOutId: value })}
          options={playerOutOptions}
          disabled={loading || selection.teamId === null || teamRoster.loading}
          placeholder={
            selection.teamId === null
              ? "Select a team first"
              : teamRoster.loading
                ? "Loading roster…"
                : "Select a player"
          }
          errorText={
            playerOutNotOnRosterInvalid
              ? "That player isn't on this team's roster."
              // A team-not-found roster fetch failure is already reported on the team
              // field itself (teamNotFoundInvalid, below) — showing it here too would
              // duplicate the same problem with inconsistent wording in two places.
              : teamNotFoundInvalid
                ? undefined
                : teamRoster.error?.message
          }
          required
        />
        <ScenarioField
          id="player-in"
          label="Player to add"
          value={selection.playerInId}
          onChange={(value) => updateSelection({ playerInId: value })}
          options={playerInOptions}
          disabled={loading || seasonPlayers.loading || (selection.teamId !== null && teamRoster.loading)}
          placeholder={
            selection.teamId !== null && teamRoster.loading
              ? "Loading roster…"
              : seasonPlayers.loading
                ? "Loading players…"
                : "Select a player"
          }
          helpText="Any 2014-15 player from any team, except this team's current roster."
          errorText={
            samePlayerInvalid
              ? "Choose a different player than the one being removed."
              : playerInAlreadyOnRosterInvalid
                ? "That player is already on this team's roster."
                : seasonPlayers.error?.message
          }
          required
        />
        <ScenarioField
          id="provider"
          label="Contribution provider"
          value={selection.contributionProvider}
          onChange={(value) =>
            updateSelection({ contributionProvider: value as ContributionProviderChoice })
          }
          options={CONTRIBUTION_PROVIDER_CHOICES.map((provider) => ({
            value: provider,
            label: PROVIDER_LABELS[provider],
          }))}
          disabled={loading}
          placeholder="Select a provider"
          helpText="No default — an explicit choice is always required."
          required
        />
      </div>

      <div className={styles.editActions}>
        <button type="submit" className={styles.submit} disabled={submitDisabled} aria-busy={loading}>
          {loading ? "Calculating…" : "Run scenario"}
        </button>
        <button
          type="button"
          onClick={handleStartOver}
          disabled={!hasAnythingToClear || loading}
          className={styles.secondaryButton}
        >
          Start over
        </button>
      </div>

      <ScenarioStatus id={STATUS_REGION_ID} state={submission} />

      {successViewModel && submittedProvider ? (
        <ScenarioSuccessPreview
          viewModel={successViewModel}
          teamLabel={selection.teamId ?? successViewModel.teamId}
          playerOutLabel={playerLabel(successViewModel.playerOutId)}
          playerInLabel={playerLabel(successViewModel.playerInId)}
          playerLabel={playerLabel}
          contributionProvider={submittedProvider}
          stale={resultStale}
        />
      ) : null}
    </form>
  );
}
