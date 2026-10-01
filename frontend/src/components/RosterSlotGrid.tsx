"use client";

import formStyles from "./ScenarioForm.module.css";
import styles from "./RosterBuilder.module.css";

/** 5 starting positions + 7 bench slots — matches CUSTOM_ROSTER_SIZE (12) on the
 *  backend (backend/scenario/service.py). Bench slots carry no position label:
 *  position is a browsing aid, never a hard constraint (see PlayerBrowser). */
export const SLOT_LABELS = [
  "PG",
  "SG",
  "SF",
  "PF",
  "C",
  "Bench 1",
  "Bench 2",
  "Bench 3",
  "Bench 4",
  "Bench 5",
  "Bench 6",
  "Bench 7",
] as const;

export interface RosterSlotGridProps {
  /** Length 12, aligned index-for-index with SLOT_LABELS; `null` means empty. */
  slots: (string | null)[];
  playerLabel: (playerId: string) => string;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

/**
 * The 12-slot roster grid (decision 0014, reference: CraftedNBA's "Roster
 * Workshop"). Click-to-assign only — filling happens via PlayerBrowser's
 * "Add to roster" button (which assigns to the next empty slot); this
 * component only renders the current assignment and lets a filled slot be
 * cleared. No drag-and-drop: none exists anywhere in this codebase, and
 * decision 0008's no-new-dependency philosophy argues against adding one for
 * a first slice.
 */
export function RosterSlotGrid({ slots, playerLabel, onRemove, disabled = false }: RosterSlotGridProps) {
  return (
    <ul className={styles.slotGrid}>
      {SLOT_LABELS.map((label, index) => {
        const playerId = slots[index];
        return (
          <li key={label} className={styles.slotCard}>
            <span className={styles.slotLabel}>{label}</span>
            {playerId ? (
              <>
                <span className={styles.slotPlayer}>{playerLabel(playerId)}</span>
                <button
                  type="button"
                  className={formStyles.secondaryButton}
                  onClick={() => onRemove(index)}
                  disabled={disabled}
                >
                  Remove
                </button>
              </>
            ) : (
              <span className={styles.slotEmpty}>Empty slot</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
