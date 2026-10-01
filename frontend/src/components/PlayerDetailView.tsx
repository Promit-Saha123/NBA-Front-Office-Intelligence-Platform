"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePlayerDetail } from "@/lib/use-player-team-detail";
import { usePlayerProjection } from "@/lib/use-player-projection";
import { toPlayerDetailViewModel } from "@/lib/detail-view-model";
import type { ContributionProviderChoice } from "@/lib/api/detail";
import {
  CONTRIBUTION_PROVIDER_CHOICES,
  DEFAULT_SEASON,
  normalizeSeason,
  type SearchParamsLike,
} from "@/lib/url-state";
import { PROVIDER_LABELS } from "@/lib/provider-labels";
import { humanizeSnakeCase } from "@/lib/format";
import { messageForErrorCode } from "@/lib/api/errors";
import { ScenarioField } from "./ScenarioField";
import { DetailStatus } from "./DetailStatus";
import { DetailDisclosuresPanel } from "./DetailDisclosuresPanel";
import styles from "./ScenarioForm.module.css";

// A page-level display default only — distinct from the scenario form's POST
// request, which decision 0008 requires an explicit, no-default provider
// choice for (a submitted calculation). This is a read-only page that must
// render something on first load; the selector below still lets a visitor
// switch providers explicitly.
const DEFAULT_PROVIDER: ContributionProviderChoice = "historical_benchmark";

const STATUS_REGION_ID = "player-detail-status";

function readProvider(searchParams: SearchParamsLike): ContributionProviderChoice {
  const value = searchParams.get("contribution_provider");
  return value !== null && (CONTRIBUTION_PROVIDER_CHOICES as readonly string[]).includes(value)
    ? (value as ContributionProviderChoice)
    : DEFAULT_PROVIDER;
}

/**
 * Player detail page content (route: /players/[playerId]). Fetches from
 * GET /seasons/{season}/players/{playerId} via @/lib/api/detail. Reads
 * `?season=` the same way every cross-link into this page writes it
 * (RotationComparisonTable.tsx, ScenarioSuccessPreview.tsx,
 * TeamDetailView.tsx) — an unset or unsupported value falls back to the one
 * supported season rather than erroring.
 */
export function PlayerDetailView() {
  const params = useParams<{ playerId: string }>();
  const playerId = String(params.playerId ?? "");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const season = normalizeSeason(searchParams.get("season")) ?? DEFAULT_SEASON;
  const provider = readProvider(searchParams);
  const detail = usePlayerDetail(season, playerId, provider);
  const viewModel = detail.data ? toPlayerDetailViewModel(detail.data) : null;
  const projection = usePlayerProjection(season, playerId);

  function handleProviderChange(next: string) {
    const query = new URLSearchParams(searchParams.toString());
    query.set("contribution_provider", next);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  }

  return (
    <>
      <p>
        <Link href="/">← Back to Roster Lab</Link>
      </p>

      <header style={{ marginBottom: "var(--space-3)" }}>
        <span
          className="badge"
          style={{ display: "block", width: "fit-content", marginBottom: "var(--space-2)" }}
        >
          Historical data only — {season} season
        </span>
        <h1 style={{ fontSize: "2rem", marginBottom: "var(--space-1)" }}>
          {viewModel?.name ?? playerId}
        </h1>
      </header>

      <div className={styles.field} style={{ maxWidth: "24rem", marginBottom: "var(--space-3)" }}>
        <ScenarioField
          id="player-detail-provider"
          label="Contribution provider"
          value={provider}
          onChange={handleProviderChange}
          options={CONTRIBUTION_PROVIDER_CHOICES.map((choice) => ({
            value: choice,
            label: PROVIDER_LABELS[choice],
          }))}
          required
        />
      </div>

      <DetailStatus
        id={STATUS_REGION_ID}
        loading={detail.loading}
        error={detail.error}
        loadingLabel="Loading player…"
      />

      {viewModel ? (
        <>
          <section aria-labelledby="player-stats-heading" className={styles.resultSection}>
            <h2 id="player-stats-heading">Season stats</h2>
            <dl className={styles.successGrid}>
              <div>
                <dt>{viewModel.teamStints.length === 1 ? "Team" : "Teams"}</dt>
                <dd>
                  {viewModel.teamStints.length === 0 ? (
                    "Not on a tracked roster this season"
                  ) : (
                    viewModel.teamStints.map((stint, index) => (
                      <span key={stint.teamId}>
                        {index > 0 ? ", " : null}
                        <Link href={`/teams/${encodeURIComponent(stint.teamId)}?season=${season}`}>
                          {stint.teamId}
                        </Link>{" "}
                        ({stint.minutes.toFixed(1)} min)
                      </span>
                    ))
                  )}
                </dd>
              </div>
              <div>
                <dt>Minutes</dt>
                <dd>{viewModel.minutes.toFixed(1)}</dd>
              </div>
              <div>
                <dt>Possessions</dt>
                <dd>{viewModel.possessions}</dd>
              </div>
              <div>
                <dt>Contribution value</dt>
                <dd>{viewModel.contributionValue.toFixed(3)}</dd>
              </div>
              <div>
                <dt>Offensive impact</dt>
                <dd>{viewModel.offensiveImpact.toFixed(3)}</dd>
              </div>
              <div>
                <dt>Defensive impact</dt>
                <dd>{viewModel.defensiveImpact.toFixed(3)}</dd>
              </div>
            </dl>
            <p className={styles.help}>
              Descriptive historical values only — not a projection of current ability.
            </p>
          </section>

          <section aria-labelledby="player-projection-heading" className={styles.resultSection}>
            <h2 id="player-projection-heading">Next-season projection</h2>
            {projection.loading ? (
              <p className={styles.help}>Loading next-season projection…</p>
            ) : projection.error ? (
              <p className={styles.help}>{messageForErrorCode(projection.error.code)}</p>
            ) : projection.data ? (
              <>
                <dl className={styles.successGrid}>
                  <div>
                    <dt>Target season</dt>
                    <dd>{projection.data.target_season}</dd>
                  </div>
                  <div>
                    <dt>Predicted RAPTOR total</dt>
                    <dd>{projection.data.predicted_raptor_total.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Basis</dt>
                    <dd>{humanizeSnakeCase(projection.data.contribution_epistemic_type)}</dd>
                  </div>
                  <div>
                    <dt>Model version</dt>
                    <dd>{projection.data.model_version}</dd>
                  </div>
                </dl>
                <p className={styles.help}>
                  An experimental model&apos;s forecast of this player&apos;s own next-season
                  RAPTOR value from their multi-season history (decision 0013) — not the
                  project&apos;s approved future PCE metric, not validated causally, and never
                  fed into any scenario or roster-builder calculation on this site.
                </p>
              </>
            ) : null}
          </section>

          <DetailDisclosuresPanel
            season={viewModel.season}
            providerInfo={{
              providerType: viewModel.providerType,
              providerVersion: viewModel.providerVersion,
              dataVersion: viewModel.dataVersion,
              contributionEpistemicType: viewModel.contributionEpistemicType,
              attribution: viewModel.attribution,
            }}
          />
        </>
      ) : null}
    </>
  );
}
