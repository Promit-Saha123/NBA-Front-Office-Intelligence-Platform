"use client";

import { useState } from "react";
import type { ScenarioViewModel } from "@/lib/view-model";
import { toScenarioViewModel } from "@/lib/view-model";
import { postScenario, type ScenarioRequest } from "@/lib/api/scenarios";
import { ScenarioApiError, UNKNOWN_ERROR_CODE, messageForErrorCode } from "@/lib/api/errors";
import type { ContributionProviderChoice } from "@/lib/url-state";
import { RotationComparisonTable } from "./RotationComparisonTable";
import { ExplanationFactorsList } from "./ExplanationFactorsList";
import type { SubmissionState } from "./scenario-submission-state";
import styles from "./ScenarioForm.module.css";

export interface EditableScenarioMinutesProps {
  /** The already-fetched default result — never refetched, only read from. */
  viewModel: ScenarioViewModel;
  /** Not derivable from viewModel.disclosures.providerType: that's the response's
   *  ProviderType enum, a distinct backend enum from the request's
   *  ContributionProviderChoice (see ScenarioForm.tsx's PROVIDER_LABELS comment). */
  contributionProvider: ContributionProviderChoice;
  playerLabel: (playerId: string) => string;
}

// Small display-only slack for the total-minutes gate, matching the same
// .toFixed(1) precision the rotation table already rounds to for display —
// not a relaxation of the backend's own exact-240 validation.
const DRAFT_TOTAL_TOLERANCE = 0.05;

/** Every scenario-roster player except the outgoing one (who can never receive
 *  scenario minutes) — derivable from the already-fetched rotation comparison,
 *  no new data needed (scenario_ids = baseline players ∪ incoming − outgoing). */
function scenarioPlayerIds(viewModel: ScenarioViewModel): string[] {
  return viewModel.rotationComparison
    .map((row) => row.playerId)
    .filter((playerId) => playerId !== viewModel.playerOutId);
}

function defaultDraft(viewModel: ScenarioViewModel): Record<string, number> {
  const minutesByPlayer = new Map(
    viewModel.rotationComparison.map((row) => [row.playerId, row.scenarioMinutes ?? 0]),
  );
  const draft: Record<string, number> = {};
  for (const playerId of scenarioPlayerIds(viewModel)) {
    // Rounded to the same one-decimal precision the read-only table already
    // displays (design-review finding: seeding at full float precision, e.g.
    // "34.668" under a table showing "34.7" for the same player, read as a
    // bug). This is a display-precision choice, not a scenario calculation.
    const raw = minutesByPlayer.get(playerId) ?? 0;
    draft[playerId] = Math.round(raw * 10) / 10;
  }
  return draft;
}

/**
 * scenario-engine.md §15/§25: lets the user manually override the scenario
 * (never baseline) rotation's minutes, see the running total, get validation
 * feedback without any auto-rebalance, reset to the default, and compare the
 * default and edited results side by side. All arithmetic here is display-only
 * summation of already-fetched or already-submitted numbers — every real
 * calculation still happens server-side (POST /scenarios' manual_minutes path).
 *
 * Owns the *only* rotation-comparison table on the results page (design-review
 * finding: a separate read-only table plus this component's own editable one
 * duplicated the same rows/columns back to back). Editing toggles the single
 * table's Scenario column between text and inputs rather than rendering two.
 */
export function EditableScenarioMinutes({
  viewModel,
  contributionProvider,
  playerLabel,
}: EditableScenarioMinutesProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>(() => defaultDraft(viewModel));
  const [edited, setEdited] = useState<SubmissionState>({ status: "idle" });

  // Reseed only when a *new* default result arrives (a fresh scenario identity),
  // never on every render, and never fighting the user's own in-progress edits.
  // Adjusting state during render (React's own recommended pattern for "reset
  // state when a prop changes") rather than a useEffect — this project's
  // react-hooks/set-state-in-effect rule forbids the effect-body version; see
  // use-roster-lookups.ts's module comment for the same constraint elsewhere.
  const scenarioKey = `${viewModel.teamId}|${viewModel.season}|${viewModel.playerOutId}|${viewModel.playerInId}|${contributionProvider}`;
  const [seededKey, setSeededKey] = useState(scenarioKey);
  if (scenarioKey !== seededKey) {
    setSeededKey(scenarioKey);
    setDraft(defaultDraft(viewModel));
    setEdited({ status: "idle" });
    setEditing(false);
  }

  const totalMinutes = Number(viewModel.disclosures.minutesAssumptions.total_minutes);
  const draftTotal = Object.values(draft).reduce((sum, minutes) => sum + minutes, 0);
  const totalValid = Math.abs(draftTotal - totalMinutes) < DRAFT_TOTAL_TOLERANCE;
  const loading = edited.status === "loading";

  function handleMinutesChange(playerId: string, value: number) {
    setDraft((prev) => ({ ...prev, [playerId]: Number.isFinite(value) ? value : 0 }));
  }

  function handleReset() {
    setDraft(defaultDraft(viewModel));
    setEdited({ status: "idle" });
  }

  function handleCancelEditing() {
    handleReset();
    setEditing(false);
  }

  async function handleRecalculate() {
    if (!totalValid || loading) return;
    setEdited({ status: "loading" });
    const request: ScenarioRequest = {
      team_id: viewModel.teamId,
      season: viewModel.season,
      player_out_id: viewModel.playerOutId,
      player_in_id: viewModel.playerInId,
      contribution_provider: contributionProvider,
      manual_minutes: draft,
    };
    try {
      const response = await postScenario(request);
      setEdited({ status: "success", response });
    } catch (err) {
      if (err instanceof ScenarioApiError) {
        setEdited({ status: "error", error: err });
        return;
      }
      setEdited({
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

  const editedViewModel = edited.status === "success" ? toScenarioViewModel(edited.response) : null;

  return (
    <section className={styles.resultSection} aria-labelledby="rotation-heading">
      <h3 id="rotation-heading">Rotation comparison</h3>
      <RotationComparisonTable
        rows={viewModel.rotationComparison}
        outgoingPlayerId={viewModel.playerOutId}
        incomingPlayerId={viewModel.playerInId}
        playerLabel={playerLabel}
        editableScenario={editing}
        scenarioDraft={editing ? draft : undefined}
        onScenarioMinutesChange={editing ? handleMinutesChange : undefined}
      />
      {viewModel.allocationRepairs.length > 0 ? (
        <p className={styles.help}>Allocation adjustments: {viewModel.allocationRepairs.join("; ")}</p>
      ) : null}

      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={styles.secondaryButton}
        >
          Edit scenario minutes
        </button>
      ) : (
        <>
          <p className={styles.help}>
            Adjust any player&apos;s scenario minutes above — the baseline column stays fixed to
            real historical minutes. The total must equal exactly {totalMinutes.toFixed(1)} to
            recalculate; this app never rebalances your entries automatically.
          </p>
          {!totalValid ? (
            <p className={styles.fieldError} role="alert">
              Total is {draftTotal.toFixed(1)}, but must equal exactly {totalMinutes.toFixed(1)}.
            </p>
          ) : null}
          <div className={styles.editActions}>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className={styles.secondaryButton}
            >
              Reset to default
            </button>
            <button
              type="button"
              onClick={handleRecalculate}
              disabled={!totalValid || loading}
              aria-busy={loading}
              className={styles.submit}
            >
              {loading ? "Recalculating…" : "Recalculate with these minutes"}
            </button>
            <button
              type="button"
              onClick={handleCancelEditing}
              disabled={loading}
              className={styles.secondaryButton}
            >
              Cancel editing
            </button>
          </div>
        </>
      )}

      {edited.status === "error" ? (
        <p className={styles.fieldError} role="alert">
          {messageForErrorCode(edited.error.code)}
        </p>
      ) : null}

      {editedViewModel ? (
        <div className={styles.resultSection}>
          <h4>Edited result</h4>
          <dl className={styles.successGrid}>
            <div>
              <dt>Modified contribution (edited)</dt>
              <dd>{editedViewModel.scenarioContribution.toFixed(3)}</dd>
            </div>
            <div>
              <dt>Net contribution change (edited)</dt>
              <dd>{editedViewModel.contributionChange.toFixed(3)}</dd>
            </div>
            <div>
              <dt>Difference vs. default scenario</dt>
              <dd>
                {(editedViewModel.contributionChange - viewModel.contributionChange).toFixed(3)}
              </dd>
            </div>
          </dl>
          <ExplanationFactorsList factors={editedViewModel.explanationFactors} />
        </div>
      ) : null}
    </section>
  );
}
