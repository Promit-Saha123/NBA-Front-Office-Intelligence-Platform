import type { RotationComparisonRow } from "@/lib/view-model";
import styles from "./ScenarioForm.module.css";

export interface RotationComparisonTableProps {
  rows: RotationComparisonRow[];
  outgoingPlayerId: string;
  incomingPlayerId: string;
  /** Resolves a player_id to a display name from lookup data already loaded by the form. */
  playerLabel: (playerId: string) => string;
}

function formatMinutes(minutes: number | null): string {
  return minutes === null ? "—" : minutes.toFixed(1);
}

/**
 * The 240-minute total shown here is a display sum of the already-fetched
 * per-player minutes (scenario-rules: "minutes total exactly 240" must be
 * visible) — arithmetic on data already in the response, not a new domain
 * metric, the same category as the `.toFixed()` display rounding already
 * used elsewhere in this component tree.
 */
export function RotationComparisonTable({
  rows,
  outgoingPlayerId,
  incomingPlayerId,
  playerLabel,
}: RotationComparisonTableProps) {
  const baselineTotal = rows.reduce((sum, row) => sum + (row.baselineMinutes ?? 0), 0);
  const scenarioTotal = rows.reduce((sum, row) => sum + (row.scenarioMinutes ?? 0), 0);

  return (
    <div>
      {/* CSS-only, shown below a breakpoint (ScenarioForm.module.css) — the table below always
       *  scrolls horizontally rather than clipping data (.tableWrap), but on a narrow viewport
       *  that scrollability has no visual affordance otherwise; confirmed via a real mobile
       *  browser screenshot during the local smoke test that columns are cut off with no hint
       *  more content exists. */}
      <p className={`${styles.help} ${styles.scrollHint}`}>Scroll sideways to see every column →</p>
      <div className={styles.tableWrap}>
        <table className={styles.rotationTable}>
          <caption className={styles.help}>
            Deterministic calculation from the heuristic 240-minute rotation — not a prediction of
            real playing time.
          </caption>
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col">Status</th>
              <th scope="col">Baseline</th>
              <th scope="col">Scenario</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isOutgoing = row.playerId === outgoingPlayerId;
              const isIncoming = row.playerId === incomingPlayerId;
              return (
                // Incoming rows deliberately get no background tint (only the "Added" text
                // label below) — a tinted row here read as an AI-generated-UI "side-tab"
                // pattern per decision 0008's UI-003 review; text-only carries the distinction
                // just as accessibly since color is never the sole signal either way.
                <tr key={row.playerId} className={isOutgoing ? styles.rowOutgoing : undefined}>
                  <th scope="row">{playerLabel(row.playerId)}</th>
                  <td className={isOutgoing || isIncoming ? styles.statusTag : undefined}>
                    {isOutgoing ? "Removed" : isIncoming ? "Added" : ""}
                  </td>
                  <td>{formatMinutes(row.baselineMinutes)}</td>
                  <td>{formatMinutes(row.scenarioMinutes)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td />
              <td>{baselineTotal.toFixed(1)}</td>
              <td>{scenarioTotal.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
