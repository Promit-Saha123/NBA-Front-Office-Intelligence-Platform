"use client";

import { useEffect, useRef } from "react";
import type { SubmissionState } from "./scenario-submission-state";
import styles from "./ScenarioForm.module.css";

export interface ScenarioStatusProps {
  id: string;
  state: SubmissionState;
}

/**
 * The one accessible feedback region for the form: a busy announcement while
 * loading, a brief confirmation on success (the fuller detail lives in the
 * separate, non-live ScenarioSuccessPreview panel — this line exists so a
 * screen-reader user actually hears that the request finished, rather than
 * needing to discover the new content below the button on their own), or
 * the actionable error message on failure — never a raw HTTP status, never
 * `devDetail`. Idle renders an empty, still-present live region so future
 * state changes keep being announced.
 */
export function ScenarioStatus({ id, state }: ScenarioStatusProps) {
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error") {
      errorRef.current?.focus();
    }
  }, [state]);

  if (state.status === "loading") {
    return (
      <div id={id} role="status" className={`${styles.status} ${styles.statusLoading}`}>
        Calculating scenario…
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div id={id} role="status" className={`${styles.status} ${styles.statusLoading}`}>
        Scenario completed successfully.
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
