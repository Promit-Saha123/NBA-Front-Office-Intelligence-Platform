import type { ScenarioViewModel } from "@/lib/view-model";
import { humanizeSnakeCase } from "@/lib/format";
import styles from "./ScenarioForm.module.css";

export interface ExplanationFactorsListProps {
  factors: ScenarioViewModel["explanationFactors"];
}

const DIRECTION_LABEL: Record<string, string> = {
  increase: "Increased",
  decrease: "Decreased",
  no_change: "No change",
};

/**
 * Every row here is a calculated factor straight from the response
 * (scenario-rules: "every explanation must be traceable to calculated
 * values") — no narrative is generated, only baseline/scenario/change/
 * direction already computed by the backend.
 */
export function ExplanationFactorsList({ factors }: ExplanationFactorsListProps) {
  if (factors.length === 0) {
    return <p className={styles.help}>No explanation factors were generated for this scenario.</p>;
  }

  return (
    <>
      <ul className={styles.factorList}>
        {factors.map((factor) => (
          <li key={factor.metric} className={styles.factorItem}>
            <span className={styles.factorMetric}>{humanizeSnakeCase(factor.metric)}</span>
            <span>
              {factor.baseline_value.toFixed(3)} → {factor.scenario_value.toFixed(3)} (
              {DIRECTION_LABEL[factor.direction] ?? factor.direction}
              {", "}
              {factor.change >= 0 ? "+" : ""}
              {factor.change.toFixed(3)})
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.help}>
        Heuristic scenario profile, not a validated causal fit model.
      </p>
    </>
  );
}
