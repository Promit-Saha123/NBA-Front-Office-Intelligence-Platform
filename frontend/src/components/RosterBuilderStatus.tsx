"use client";

import { useEffect, useRef } from "react";
import type { RosterBuilderSubmissionState } from "./roster-builder-submission-state";
import styles from "./ScenarioForm.module.css";

export interface RosterBuilderStatusProps {
  id: string;
  state: RosterBuilderSubmissionState;
}

/**
 * The one accessible feedback region for the builder page — same shape and
 * reasoning as ScenarioStatus (a busy announcement while loading, a brief
 * success confirmation, or the actionable error message), duplicated rather
 * than generalized since the two submission-state unions carry different
 * response types (same precedent as TeamProfilePanel duplicating a small
 * constant rather than importing across an unrelated component).
 */
export function RosterBuilderStatus({ id, state }: RosterBuilderStatusProps) {
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error") {
      errorRef.current?.focus();
    }
  }, [state]);

  if (state.status === "loading") {
    return (
      <div id={id} role="status" className={`${styles.status} ${styles.statusLoading}`}>
        Calculating projection…
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div id={id} role="status" className={`${styles.status} ${styles.statusSuccess}`}>
        Projection completed successfully.
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        id={id}
        ref={errorRef}
        role="alert"
        tabIndex={-1}
        className={`${styles.status} ${styles.statusError}`}
      >
        {state.error.message}
      </div>
    );
  }

  return <div id={id} role="status" className={styles.srOnly} />;
}
