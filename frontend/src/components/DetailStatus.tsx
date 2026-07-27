"use client";

import { useEffect, useRef } from "react";
import type { ScenarioApiError } from "@/lib/api/errors";
import styles from "./ScenarioForm.module.css";

export interface DetailStatusProps {
  id: string;
  loading: boolean;
  error: ScenarioApiError | null;
  loadingLabel: string;
}

/**
 * Shared accessible status region for the player/team detail pages —
 * factored out of `PlayerDetailView`/`TeamDetailView` (both need the
 * identical live-region + focus-on-error behavior already established by
 * `ScenarioStatus.tsx`, which this mirrors but can't reuse directly since
 * its prop type is the scenario-form-specific `SubmissionState` union).
 */
export function DetailStatus({ id, loading, error, loadingLabel }: DetailStatusProps) {
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (loading) {
    return (
      <div id={id} role="status" className={`${styles.status} ${styles.statusLoading}`}>
        {loadingLabel}
      </div>
    );
  }

  if (error) {
    return (
      <div
        id={id}
        ref={errorRef}
        role="alert"
        tabIndex={-1}
        className={`${styles.status} ${styles.statusError}`}
      >
        {error.message}
      </div>
    );
  }

  return <div id={id} role="status" className={styles.srOnly} />;
}
