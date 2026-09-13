"use client";

import { useEffect, useRef, useState } from "react";
import { useSeasonPlayers } from "@/lib/use-roster-lookups";
import { postCustomRoster, type RosterBuilderRequest } from "@/lib/api/roster-builder";
import { ScenarioApiError, UNKNOWN_ERROR_CODE, messageForErrorCode } from "@/lib/api/errors";
import {
  CONTRIBUTION_PROVIDER_CHOICES,
  DEFAULT_SEASON,
  seasonDecadeGroup,
  SUPPORTED_SEASONS,
  type ContributionProviderChoice,
  type SupportedSeason,
} from "@/lib/url-state";
import { PROVIDER_LABELS } from "@/lib/provider-labels";
import type { PlayerPosition } from "@/lib/player-positions";
import { toRosterBuilderViewModel } from "@/lib/roster-builder-view-model";
import { ScenarioField } from "./ScenarioField";
import { PlayerBrowser } from "./PlayerBrowser";
import { RosterSlotGrid, SLOT_LABELS } from "./RosterSlotGrid";
import { RosterBuilderStatus } from "./RosterBuilderStatus";
import { RosterBuilderResult } from "./RosterBuilderResult";
import type { RosterBuilderSubmissionState } from "./roster-builder-submission-state";
import styles from "./ScenarioForm.module.css";

const EMPTY_SLOTS: (string | null)[] = new Array(SLOT_LABELS.length).fill(null);
const STATUS_REGION_ID = "roster-builder-status";

export function RosterBuilderView() {
  const [season, setSeason] = useState<SupportedSeason>(DEFAULT_SEASON);
  const [provider, setProvider] = useState<ContributionProviderChoice | null>(null);
  const [slots, setSlots] = useState<(string | null)[]>(EMPTY_SLOTS);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<PlayerPosition | "ALL">("ALL");
  const [submission, setSubmission] = useState<RosterBuilderSubmissionState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const seasonPlayers = useSeasonPlayers(season);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const allPlayers = seasonPlayers.data?.players ?? [];
  const playerNameById = new Map(allPlayers.map((p) => [p.player_id, p.name]));
  const playerLabel = (playerId: string) => playerNameById.get(playerId) ?? playerId;

  const assignedIds = new Set(slots.filter((id): id is string => id !== null));
  const availablePlayers = allPlayers.filter((p) => !assignedIds.has(p.player_id));

  const filledCount = assignedIds.size;
  const allSlotsFilled = filledCount === SLOT_LABELS.length;
  const loading = submission.status === "loading";
  const submitDisabled = !allSlotsFilled || provider === null || loading;

  function handleSeasonChange(value: string) {
    setSeason(value as SupportedSeason);
    // A player valid for one season has no guaranteed record in another —
    // clearing on season change avoids silently submitting a stale roster.
    setSlots(EMPTY_SLOTS);
    setSubmission({ status: "idle" });
  }

  function assignToNextEmptySlot(playerId: string) {
    setSlots((current) => {
      const index = current.indexOf(null);
      if (index === -1) return current;
      const next = [...current];
      next[index] = playerId;
      return next;
    });
  }

  function removeFromSlot(index: number) {
    setSlots((current) => {
      const next = [...current];
      next[index] = null;
      return next;
    });
  }

  function handleStartOver() {
    setSlots(EMPTY_SLOTS);
    setSearch("");
    setPositionFilter("ALL");
    abortRef.current?.abort();
    setSubmission({ status: "idle" });
  }

  async function handleRunProjection() {
    if (submitDisabled) return;
    const playerIds = slots.filter((id): id is string => id !== null);
    if (playerIds.length !== SLOT_LABELS.length || provider === null) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSubmission({ status: "loading" });

    const request: RosterBuilderRequest = {
      season,
      player_ids: playerIds,
      contribution_provider: provider,
    };

    try {
      const response = await postCustomRoster(request, { signal: controller.signal });
      setSubmission({ status: "success", response });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
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

  const successViewModel =
    submission.status === "success" ? toRosterBuilderViewModel(submission.response) : null;

  return (
    <div className={styles.form} aria-describedby={STATUS_REGION_ID}>
      <div className={styles.grid}>
        <ScenarioField
          id="builder-season"
          label="Season"
          value={season}
          onChange={handleSeasonChange}
          options={SUPPORTED_SEASONS.map((label) => ({
            value: label,
            label,
            group: seasonDecadeGroup(label),
          }))}
          disabled={loading}
          helpText="Historical seasons only — no current-season or live data."
          required
        />
        <ScenarioField
          id="builder-provider"
          label="Contribution provider"
          value={provider}
          onChange={(value) => setProvider(value as ContributionProviderChoice)}
          options={CONTRIBUTION_PROVIDER_CHOICES.map((choice) => ({
            value: choice,
            label: PROVIDER_LABELS[choice],
          }))}
          disabled={loading}
          placeholder="Select a provider"
          helpText="No default — an explicit choice is always required."
          required
        />
      </div>

      <section className={styles.resultSection} aria-labelledby="builder-slots-heading">
        <h2 id="builder-slots-heading">Roster ({filledCount}/{SLOT_LABELS.length})</h2>
        <RosterSlotGrid
          slots={slots}
          playerLabel={playerLabel}
          onRemove={removeFromSlot}
          disabled={loading}
        />
      </section>

      <section className={styles.resultSection} aria-labelledby="builder-browser-heading">
        <h2 id="builder-browser-heading">Player browser</h2>
        <PlayerBrowser
          players={availablePlayers}
          search={search}
          onSearchChange={setSearch}
          positionFilter={positionFilter}
          onPositionFilterChange={setPositionFilter}
          onSelect={assignToNextEmptySlot}
          disabled={loading || allSlotsFilled || seasonPlayers.loading}
        />
        {seasonPlayers.error ? (
          <p className={styles.fieldError} role="alert">
            {seasonPlayers.error.message}
          </p>
        ) : null}
      </section>

      <div className={styles.editActions}>
        <button
          type="button"
          className={styles.submit}
          onClick={handleRunProjection}
          disabled={submitDisabled}
          aria-busy={loading}
        >
          {loading ? "Calculating…" : "Run projection"}
        </button>
        <button
          type="button"
          onClick={handleStartOver}
          disabled={loading || (filledCount === 0 && submission.status === "idle")}
          className={styles.secondaryButton}
        >
          Start over
        </button>
      </div>

      <RosterBuilderStatus id={STATUS_REGION_ID} state={submission} />

      {successViewModel ? (
        <RosterBuilderResult viewModel={successViewModel} playerLabel={playerLabel} />
      ) : null}
    </div>
  );
}
