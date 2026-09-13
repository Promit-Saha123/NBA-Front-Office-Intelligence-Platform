import Link from "next/link";
import type { RosterBuilderViewModel } from "@/lib/roster-builder-view-model";
import styles from "./ScenarioForm.module.css";

export interface RosterRotationTableProps {
  rotation: RosterBuilderViewModel["rotation"];
  allocationRepairs: string[];
  season: string;
  /** Resolves a player_id to a display name from lookup data already loaded by the page. */
  playerLabel: (playerId: string) => string;
}

/**
 * The single-rotation counterpart to RotationComparisonTable: a custom
 * roster has no baseline to compare against, so this shows one minutes
 * column, not a before/after pair. The 240-minute total shown here is a
 * display sum of the already-fetched per-player minutes (scenario-rules:
 * "minutes total exactly 240" must be visible), same reasoning as
 * RotationComparisonTable's own total row.
 *
 * A player cut by the rotation-size cap (backend/minutes/allocator.py) has
 * no entry in `rotation` at all, same behavior as the swap scenario's
 * baseline/scenario rotations — `allocationRepairs` already names them, so
 * that text is rendered directly below the table rather than a fabricated
 * zero-minute row.
 */
export function RosterRotationTable({
  rotation,
  allocationRepairs,
  season,
  playerLabel,
}: RosterRotationTableProps) {
  const total = rotation.reduce((sum, entry) => sum + entry.minutes, 0);

  return (
    <div>
      <p className={`${styles.help} ${styles.scrollHint}`}>Scroll sideways to see every column →</p>
      <div className={styles.tableWrap}>
        <table className={styles.rotationTable}>
          <caption className={styles.help}>
            Deterministic calculation from the heuristic 240-minute rotation, seeded by each
            player&apos;s real season-total minutes — not a prediction of real playing time.
          </caption>
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col">Minutes</th>
            </tr>
          </thead>
          <tbody>
            {rotation.map((entry) => (
              <tr key={entry.player_id}>
                <th scope="row">
                  <Link href={`/players/${encodeURIComponent(entry.player_id)}?season=${season}`}>
                    {playerLabel(entry.player_id)}
                  </Link>
                </th>
                <td>{entry.minutes.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{total.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {allocationRepairs.length > 0 ? (
        <p className={styles.help}>Allocation adjustments: {allocationRepairs.join("; ")}</p>
      ) : null}
    </div>
  );
}
