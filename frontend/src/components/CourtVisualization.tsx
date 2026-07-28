import styles from "./CourtVisualization.module.css";

export interface CourtVisualizationPlayer {
  playerId: string;
  name: string;
}

export interface CourtVisualizationProps {
  /** Expected to be exactly 5 (the team's scenario starting lineup, by
   *  minutes — see ScenarioSuccessPreview.tsx for how this is derived).
   *  Any other length renders the empty/error state instead of a partial
   *  or overfull court. */
  players: CourtVisualizationPlayer[];
}

const REQUIRED_PLAYER_COUNT = 5;

// Five fixed, evenly distributed half-court anchor points — purely a
// layout device so five names render at distinct, readable spots. Not
// tied to any real or assumed position (PG/SG/SF/PF/C); slots are filled
// in the order `players` is given (ScenarioSuccessPreview.tsx orders that
// by minutes, most to least), not by inferred role. Kept inside a modest
// horizontal margin (22-78, not the full 0-100 width) and always
// center-anchored so a long name grows symmetrically outward from its
// marker rather than running off one edge of the diagram.
const COURT_SLOTS: { x: number; y: number }[] = [
  { x: 50, y: 20 },
  { x: 78, y: 50 },
  { x: 22, y: 50 },
  { x: 66, y: 80 },
  { x: 34, y: 80 },
];

/**
 * Standalone, props-driven half-court diagram showing the scenario's
 * five-player starting lineup (by minutes — this project's data has no
 * real starting-lineup or position field, see decision 0007/CLAUDE.md's
 * "no box-score data" note). Marker placement is always a fixed layout
 * slot, never a real or assumed basketball position — nothing here claims
 * otherwise (CLAUDE.md's heuristic-vs-fact labeling rule).
 *
 * The diagram itself is decorative (`aria-hidden`) with each player's name
 * additionally drawn next to their marker for sighted users scanning the
 * court; the legend list below is the real accessible content, so screen
 * readers and keyboard users get the full lineup as plain text regardless.
 */
export function CourtVisualization({ players }: CourtVisualizationProps) {
  if (players.length !== REQUIRED_PLAYER_COUNT) {
    // Plain empty-state text, no aria-live role — same pattern as
    // TeamProfilePanel.tsx/ExplanationFactorsList.tsx's empty states.
    // This is static content resolved at render time, not a live
    // announcement, and a role="status" here would collide with the
    // page's own submission-status live region.
    return (
      <p className={styles.empty}>
        Starting lineup unavailable — this scenario doesn&apos;t have five rotation players to show.
      </p>
    );
  }

  return (
    <div className={styles.wrap} role="group" aria-label="Starting lineup for this roster scenario">
      <p className={styles.help}>
        Starting lineup shown below. Player placement on the court is for visualization only and
        does not represent verified on-court positions.
      </p>

      <svg viewBox="0 0 100 100" className={styles.court} aria-hidden="true" focusable="false">
        <rect x="4" y="4" width="92" height="92" rx="2" className={styles.outline} />
        <rect x="35" y="64" width="30" height="30" className={styles.paint} />
        <circle cx="50" cy="64" r="10" className={styles.circleMark} />
        <path d="M 6 94 A 44 44 0 0 1 94 94" className={styles.arc} />
        <circle cx="50" cy="93" r="1.3" className={styles.rim} />

        {players.map((player, index) => {
          const slot = COURT_SLOTS[index];
          return (
            <g key={player.playerId}>
              <circle cx={slot.x} cy={slot.y} r="4.5" className={styles.marker} />
              <text x={slot.x} y={slot.y + 8.5} textAnchor="middle" className={styles.nameLabel}>
                {player.name}
              </text>
            </g>
          );
        })}
      </svg>

      <ul className={styles.legend}>
        {players.map((player) => (
          <li key={player.playerId}>{player.name}</li>
        ))}
      </ul>
    </div>
  );
}
