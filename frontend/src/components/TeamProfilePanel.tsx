import type { ScenarioViewModel } from "@/lib/view-model";
import { humanizeSnakeCase } from "@/lib/format";
import styles from "./ScenarioForm.module.css";

export interface TeamProfilePanelProps {
  categories: ScenarioViewModel["teamProfile"];
}

// Duplicated from ExplanationFactorsList.tsx rather than imported — three
// literal strings, and importing another component's internal constant is
// worse coupling than repeating them.
const DIRECTION_LABEL: Record<string, string> = {
  increase: "Increased",
  decrease: "Decreased",
  no_change: "No change",
};

/**
 * Team-profile interpretation (decision 0010): offensive/defensive impact,
 * minutes-weighted from RAPTOR's own offense/defense split, reported as raw
 * values with no league normalization. Every row here is read straight from
 * the response (scenario-rules: "every explanation must be traceable to
 * calculated values") — no narrative is generated. Descriptive only, never
 * feeds contribution_change or any win-related number.
 */
export function TeamProfilePanel({ categories }: TeamProfilePanelProps) {
  if (categories.length === 0) {
    return <p className={styles.help}>No team profile data was generated for this scenario.</p>;
  }

  return (
    <>
      <ul className={styles.factorList}>
        {categories.map((c) => (
          <li key={c.category} className={styles.factorItem}>
            <span className={styles.factorMetric}>{humanizeSnakeCase(c.category)}</span>
            <span>
              {c.baseline_value.toFixed(3)} → {c.scenario_value.toFixed(3)} (
              {DIRECTION_LABEL[c.direction] ?? c.direction}
              {", "}
              {c.change >= 0 ? "+" : ""}
              {c.change.toFixed(3)})
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.help}>Heuristic scenario profile, not a validated causal fit model.</p>
    </>
  );
}
