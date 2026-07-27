import { humanizeSnakeCase } from "@/lib/format";
import styles from "./ScenarioForm.module.css";

export interface DetailProviderInfo {
  providerType: string;
  providerVersion: string;
  dataVersion: string;
  contributionEpistemicType: string;
  attribution: string[];
}

export interface DetailDisclosuresPanelProps {
  season: string;
  /** Omitted for pages that show no provider-derived value (team detail —
   *  no ContributionProvider call happens there, so there is nothing to
   *  label). Present for player detail, which does show contribution/
   *  offense/defense values sourced from a provider. */
  providerInfo?: DetailProviderInfo;
}

/** Decision 0007 §8, verbatim — same required footer text as
 *  `ScenarioDisclosuresPanel.tsx`. Duplicated rather than imported: that
 *  component's constant is private, and importing another component's
 *  internals is worse coupling than repeating one short string (the same
 *  reasoning `TeamProfilePanel.tsx` already applies to `DIRECTION_LABEL`). */
const ATTRIBUTION_FOOTER =
  "Player benchmark data: RAPTOR by FiveThirtyEight (CC BY 4.0). Team game data: NBA Elo by " +
  "FiveThirtyEight (CC BY 4.0). Data modified for this application. Not affiliated with or " +
  "endorsed by FiveThirtyEight, ABC News, or the NBA.";

/** Keyed by the real `provider_type` values in backend/domain/models.py's ProviderType — a
 *  future third provider fails to compile here, same as ScenarioDisclosuresPanel. */
const PROVIDER_BADGE_TEXT: Record<string, string> = {
  historical_raptor_benchmark:
    "Historical RAPTOR benchmark — player value from FiveThirtyEight's RAPTOR dataset (CC BY 4.0).",
  synthetic: "Synthetic contribution estimate — generated demo value, not derived from real player data.",
};

/**
 * Shared disclosures footer for the player/team detail pages — same content
 * shape as `ScenarioDisclosuresPanel.tsx` (decision 0007 §8's required
 * banner/badge/attribution set) but rendered as a page-level `<h2>` section
 * rather than nested `<h3>`, since these pages have no results-panel `<h2>`
 * above them the way `ScenarioSuccessPreview` does.
 *
 * The historical-prototype banner and the static attribution footer are
 * unconditional (decision 0005: the historical cutoff must always be
 * visible; both pages show data sourced from the licensed RAPTOR CSV even
 * when no ContributionProvider is involved). The provider badge/version/
 * data-version/epistemic-type block and the response's own `attribution`
 * only render when `providerInfo` is supplied.
 */
export function DetailDisclosuresPanel({ season, providerInfo }: DetailDisclosuresPanelProps) {
  return (
    <section className={styles.disclosures} aria-labelledby="detail-disclosures-heading">
      <h2 id="detail-disclosures-heading">Assumptions and disclosures</h2>

      <p className={`${styles.disclosureBanner} badge`}>
        Historical prototype — this app describes the {season} NBA season using licensed
        historical data. It is not current and not predictive.
      </p>

      {providerInfo ? (
        <>
          <p className={`${styles.disclosureBanner} badge`}>
            {PROVIDER_BADGE_TEXT[providerInfo.providerType] ?? providerInfo.providerType}
          </p>

          <dl className={styles.disclosuresGrid}>
            <div>
              <dt>Provider version</dt>
              <dd>{providerInfo.providerVersion}</dd>
            </div>
            <div>
              <dt>Data version</dt>
              <dd>{providerInfo.dataVersion}</dd>
            </div>
            <div>
              <dt>Contribution basis</dt>
              <dd>{humanizeSnakeCase(providerInfo.contributionEpistemicType)}</dd>
            </div>
          </dl>

          <p className={styles.help}>
            Descriptive detail computed from versioned historical benchmark values — not a prediction
            of current or future performance.
          </p>
        </>
      ) : null}

      <p className={styles.attribution}>{ATTRIBUTION_FOOTER}</p>
      {providerInfo ? <p className={styles.attribution}>{providerInfo.attribution.join(" · ")}</p> : null}
    </section>
  );
}
