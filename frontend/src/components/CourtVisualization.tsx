import styles from "./CourtVisualization.module.css";

export type CourtPosition = "PG" | "SG" | "SF" | "PF" | "C";

const POSITION_LABELS: Record<CourtPosition, string> = {
  PG: "Point Guard",
  SG: "Shooting Guard",
  SF: "Small Forward",
  PF: "Power Forward",
  C: "Center",
};

const POSITIONS: CourtPosition[] = ["PG", "SG", "SF", "PF", "C"];

// Illustrative half-court spots for each position, not derived from any
// real play-calling or tracking data — purely so the two players render at
// visually distinct, recognizable areas of the court.
const POSITION_COORDS: Record<CourtPosition, { x: number; y: number }> = {
  PG: { x: 50, y: 28 },
  SG: { x: 85, y: 55 },
  SF: { x: 15, y: 55 },
  PF: { x: 68, y: 78 },
  C: { x: 50, y: 88 },
};

export interface CourtVisualizationPlayer {
  playerId: string;
  name: string;
  /** Caller-supplied real position, if known. When omitted, this component
   *  assigns a deterministic placeholder slot (hashed from playerId) purely
   *  so the two players render at different court spots — this project's
   *  data has no position field (see backend/minutes/allocator.py), so any
   *  position shown here is always an assumption, never a verified fact. */
  position?: CourtPosition;
}

export interface CourtVisualizationProps {
  outgoing: CourtVisualizationPlayer;
  incoming: CourtVisualizationPlayer;
}

// Deterministic and presentational only — not a real position inference
// model. The same playerId always maps to the same slot so re-renders (and
// re-visits of the same scenario) don't jitter.
function assumePosition(playerId: string): CourtPosition {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 31 + playerId.charCodeAt(i)) | 0;
  }
  return POSITIONS[Math.abs(hash) % POSITIONS.length];
}

function resolvePosition(player: CourtVisualizationPlayer): {
  position: CourtPosition;
  isAssumed: boolean;
} {
  if (player.position) {
    return { position: player.position, isAssumed: false };
  }
  return { position: assumePosition(player.playerId), isAssumed: true };
}

// The diagram is decorative (aria-hidden) — the legend list is the sole
// carrier of player names and the "Removed"/"Added" text labels, so those
// strings deliberately aren't duplicated here as SVG text.
function PlayerMarker({
  player,
  markerClassName,
  offsetX,
}: {
  player: CourtVisualizationPlayer;
  markerClassName: string;
  offsetX: number;
}) {
  const { position } = resolvePosition(player);
  const coord = POSITION_COORDS[position];
  return <circle cx={coord.x + offsetX} cy={coord.y} r="4.5" className={markerClassName} />;
}

/**
 * Standalone, props-driven half-court diagram showing where a roster
 * scenario's outgoing and incoming player are positioned. Position
 * placement is always an assumption (real position when the caller has it,
 * otherwise a deterministic placeholder) and is labeled as such everywhere
 * it appears — this project's underlying data has no position field, so
 * nothing here is presented as a verified fact (CLAUDE.md's heuristic-vs-
 * fact labeling rule).
 *
 * The diagram itself is decorative (`aria-hidden`); the legend list below
 * it is the real accessible content, so screen readers and keyboard users
 * get full text equivalents without any custom widget behavior to manage.
 */
export function CourtVisualization({ outgoing, incoming }: CourtVisualizationProps) {
  const out = resolvePosition(outgoing);
  const inc = resolvePosition(incoming);

  return (
    <div className={styles.wrap} role="group" aria-label="Court placement for this roster scenario">
      <p className={styles.help}>
        Court placement below is an assumed position for visualization only, not a verified or
        real position — this dataset has no player position field.
      </p>

      <svg viewBox="0 0 100 100" className={styles.court} aria-hidden="true" focusable="false">
        <rect x="4" y="4" width="92" height="92" rx="2" className={styles.outline} />
        <rect x="35" y="64" width="30" height="30" className={styles.paint} />
        <circle cx="50" cy="64" r="10" className={styles.circleMark} />
        <path d="M 6 94 A 44 44 0 0 1 94 94" className={styles.arc} />
        <circle cx="50" cy="93" r="1.3" className={styles.rim} />

        <PlayerMarker player={outgoing} markerClassName={styles.markerOut} offsetX={-5} />
        <PlayerMarker player={incoming} markerClassName={styles.markerIn} offsetX={5} />
      </svg>

      <ul className={styles.legend}>
        <li>
          <span className={styles.tag}>Removed</span> {outgoing.name} — assumed{" "}
          {POSITION_LABELS[out.position]}
          {out.isAssumed ? " (placeholder, position unknown)" : ""}
        </li>
        <li>
          <span className={styles.tag}>Added</span> {incoming.name} — assumed{" "}
          {POSITION_LABELS[inc.position]}
          {inc.isAssumed ? " (placeholder, position unknown)" : ""}
        </li>
      </ul>
    </div>
  );
}
