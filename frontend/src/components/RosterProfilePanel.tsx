import type { RosterBuilderViewModel } from "@/lib/roster-builder-view-model";
import { humanizeSnakeCase } from "@/lib/format";
import styles from "./ScenarioForm.module.css";

export interface RosterProfilePanelProps {
  categories: RosterBuilderViewModel["teamProfile"];
}

/**
 * Descriptive offense/defense profile for a from-scratch custom roster
 * (decision 0014) — the single-aggregate counterpart to TeamProfilePanel.
 * Unlike a swap scenario, there is no baseline roster to compare against, so
 * each category renders one minutes-weighted value, not a before/after pair.
 * Every value is read straight from the response (scenario-rules: "every
 * explanation must be traceable to calculated values") — nothing here is
 * generated narrative.
 */
export function RosterProfilePanel({ categories }: RosterProfilePanelProps) {
  if (categories.length === 0) {
    return <p className={styles.help}>No team profile data was generated for this roster.</p>;
  }

  return (
    <>
      <ul className={styles.factorList}>
        {categories.map((c) => (
          <li key={c.category} className={styles.factorItem}>
            <span className={styles.factorMetric}>{humanizeSnakeCase(c.category)}</span>
            <span>{c.value.toFixed(3)}</span>
          </li>
        ))}
      </ul>
      <p className={styles.help}>Heuristic scenario profile, not a validated causal fit model.</p>
    </>
  );
}
