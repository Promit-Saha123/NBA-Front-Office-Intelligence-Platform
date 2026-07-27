"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useTeamDetail } from "@/lib/use-player-team-detail";
import { toTeamDetailViewModel } from "@/lib/detail-view-model";
import { SUPPORTED_SEASONS, normalizeSeason } from "@/lib/url-state";
import { teamDisplayName } from "@/lib/nba-teams";
import { DetailStatus } from "./DetailStatus";
import { DetailDisclosuresPanel } from "./DetailDisclosuresPanel";
import styles from "./ScenarioForm.module.css";

const DEFAULT_SEASON = SUPPORTED_SEASONS[0];

const STATUS_REGION_ID = "team-detail-status";

/**
 * Team detail page content (route: /teams/[teamId]). Fetches from
 * GET /seasons/{season}/teams/{teamId} via @/lib/api/detail. No contribution
 * provider is involved — that route exposes no provider-derived value (see
 * backend/api/lookups.py's get_team_detail), so there is no provider
 * selector on this page, unlike PlayerDetailView. Reads `?season=` the same
 * way every cross-link into this page writes it (RotationComparisonTable.tsx,
 * ScenarioSuccessPreview.tsx, PlayerDetailView.tsx) — an unset or unsupported
 * value falls back to the one supported season rather than erroring.
 */
export function TeamDetailView() {
  const params = useParams<{ teamId: string }>();
  const teamId = String(params.teamId ?? "");
  const searchParams = useSearchParams();
  const season = normalizeSeason(searchParams.get("season")) ?? DEFAULT_SEASON;

  const detail = useTeamDetail(season, teamId);
  const viewModel = detail.data ? toTeamDetailViewModel(detail.data) : null;

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
          {teamDisplayName(teamId)}
        </h1>
      </header>

      <DetailStatus
        id={STATUS_REGION_ID}
        loading={detail.loading}
        error={detail.error}
        loadingLabel="Loading team…"
      />

      {viewModel ? (
        <>
          <section aria-labelledby="team-roster-heading" className={styles.resultSection}>
            <h2 id="team-roster-heading">Roster</h2>
            <dl className={styles.successGrid}>
              <div>
                <dt>Roster size</dt>
                <dd>{viewModel.rosterSize}</dd>
              </div>
              <div>
                <dt>Total roster minutes</dt>
                <dd>{viewModel.totalRosterMinutes.toFixed(1)}</dd>
              </div>
            </dl>

            {viewModel.players.length === 0 ? (
              <p className={styles.help}>No roster data was found for this team.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.rotationTable}>
                  <caption className={styles.help}>
                    Deterministic historical values — not a prediction of real playing time.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Player</th>
                      <th scope="col">Minutes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewModel.players.map((row) => (
                      <tr key={row.playerId}>
                        <th scope="row">
                          <Link href={`/players/${encodeURIComponent(row.playerId)}?season=${season}`}>
                            {row.name}
                          </Link>
                        </th>
                        <td>{row.minutes.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <DetailDisclosuresPanel season={viewModel.season} />
        </>
      ) : null}
    </>
  );
}
