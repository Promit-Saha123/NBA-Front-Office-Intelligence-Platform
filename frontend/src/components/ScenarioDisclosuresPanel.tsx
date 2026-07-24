import type { ScenarioDisclosures } from "@/lib/view-model";
import { humanizeSnakeCase } from "@/lib/format";
import styles from "./ScenarioForm.module.css";

/** Decision 0007 §8, verbatim — the app-wide attribution/non-affiliation footer covering every
 *  pinned, licensed source this product is built from, not only whichever provider a given
 *  scenario happened to use. `disclosures.attribution` (rendered separately below) adds the
 *  scenario's own provider-specific citation on top of this, it doesn't replace it. */
const ATTRIBUTION_FOOTER =
  "Player benchmark data: RAPTOR by FiveThirtyEight (CC BY 4.0). Team game data: NBA Elo by " +
  "FiveThirtyEight (CC BY 4.0). Data modified for this application. Not affiliated with or " +
  "endorsed by FiveThirtyEight, ABC News, or the NBA.";

export interface ScenarioDisclosuresPanelProps {
  disclosures: ScenarioDisclosures;
  season: string;
}

/** Exact required wording, decision 0007 §8 — keyed by the same provider_type literal union
 *  ScenarioForm already switches on, so a future third provider fails to compile here too. */
const PROVIDER_BADGE_TEXT: Record<ScenarioDisclosures["providerType"], string> = {
  historical_raptor_benchmark:
    "Historical RAPTOR benchmark — player value from FiveThirtyEight's RAPTOR dataset (CC BY 4.0).",
  synthetic: "Synthetic contribution estimate — generated demo value, not derived from real player data.",
};

function formatAssumptionValue(value: number | boolean | string): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function ScenarioDisclosuresPanel({ disclosures, season }: ScenarioDisclosuresPanelProps) {
  return (
    <section className={styles.disclosures} aria-labelledby="disclosures-heading">
      <h3 id="disclosures-heading">Assumptions and disclosures</h3>

      {disclosures.historicalOnly ? (
        <p className={`${styles.disclosureBanner} badge`}>
          Historical prototype — this app simulates roster scenarios from the {season} NBA season
          using licensed historical data. It is not current and not predictive.
        </p>
      ) : null}

      <p className={`${styles.disclosureBanner} badge`}>{PROVIDER_BADGE_TEXT[disclosures.providerType]}</p>

      <dl className={styles.disclosuresGrid}>
        <div>
          <dt>Provider version</dt>
          <dd>{disclosures.providerVersion}</dd>
        </div>
        <div>
          <dt>Data version</dt>
          <dd>{disclosures.dataVersion}</dd>
        </div>
        <div>
          <dt>Contribution basis</dt>
          <dd>{humanizeSnakeCase(disclosures.contributionEpistemicType)}</dd>
        </div>
        <div>
          <dt>Minutes method</dt>
          <dd>{disclosures.minutesMethod}</dd>
        </div>
        <div>
          <dt>Model version</dt>
          {/* Always null in this MVP (decision 0007: no trained model ships) — rendered
              explicitly, never hidden, so a future non-null value is visible too. */}
          <dd>{disclosures.modelVersion ?? "Not applicable — this MVP ships no trained model."}</dd>
        </div>
      </dl>

      <div>
        <p className={styles.help}>Minutes assumptions:</p>
        <ul className={styles.assumptionsList}>
          {Object.entries(disclosures.minutesAssumptions).map(([key, value]) => (
            <li key={key}>
              {humanizeSnakeCase(key)}: {formatAssumptionValue(value)}
            </li>
          ))}
        </ul>
      </div>

      <p className={styles.help}>
        {/* The "heuristic scenario profile" label itself is already stated once per
         *  factor/profile list (ExplanationFactorsList, TeamProfilePanel) — not repeated
         *  here too, to avoid the same sentence appearing three times on one page. */}
        Scenario results combine historical benchmark values, heuristic rotation assumptions, and
        deterministic calculations.
      </p>
      <p className={styles.help}>
        Supported seasons: 2014-15. Player benchmarks end with the 2021-22 season; team game
        outcomes end with 2014-15.
      </p>
      <p className={styles.help}>
        Scenario estimates describe a historical what-if under stated assumptions. They do not
        predict real-world outcomes, coaching decisions, or wins.
      </p>
      <p className={styles.attribution}>{ATTRIBUTION_FOOTER}</p>
      <p className={styles.attribution}>{disclosures.attribution.join(" · ")}</p>
    </section>
  );
}
