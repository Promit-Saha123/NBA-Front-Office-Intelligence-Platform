"use client";

import type { PlayerSummaryResponse } from "@/lib/api/lookups";
import { playerPosition, type PlayerPosition } from "@/lib/player-positions";
import formStyles from "./ScenarioForm.module.css";
import styles from "./RosterBuilder.module.css";

const POSITIONS: PlayerPosition[] = ["PG", "SG", "SF", "PF", "C"];

export interface PlayerBrowserProps {
  /** Already excludes players assigned to a slot — this component never
   *  computes that exclusion itself. */
  players: PlayerSummaryResponse[];
  search: string;
  onSearchChange: (value: string) => void;
  positionFilter: PlayerPosition | "ALL";
  onPositionFilterChange: (value: PlayerPosition | "ALL") => void;
  onSelect: (playerId: string) => void;
  disabled?: boolean;
}

/**
 * Client-side name search + position filter over the season's player pool
 * (decision 0014). Native `<input type="search">`/`<select>`, no combobox
 * library — same "native controls unless clearly justified" rule decision
 * 0008 already applies elsewhere. Position is a browsing aid only: an
 * unlisted player (playerPosition() === null) still appears under "All
 * positions" and can still be added to any slot.
 */
export function PlayerBrowser({
  players,
  search,
  onSearchChange,
  positionFilter,
  onPositionFilterChange,
  onSelect,
  disabled = false,
}: PlayerBrowserProps) {
  const trimmedSearch = search.trim().toLowerCase();
  const filtered = players.filter((p) => {
    if (trimmedSearch && !p.name.toLowerCase().includes(trimmedSearch)) return false;
    if (positionFilter !== "ALL" && playerPosition(p.player_id) !== positionFilter) return false;
    return true;
  });

  return (
    <div className={styles.browser}>
      <div className={formStyles.grid}>
        <div className={formStyles.field}>
          <label htmlFor="player-search" className={formStyles.label}>
            Search players
          </label>
          <input
            id="player-search"
            type="search"
            className={formStyles.select}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Player name…"
          />
        </div>
        <div className={formStyles.field}>
          <label htmlFor="position-filter" className={formStyles.label}>
            Position
          </label>
          <select
            id="position-filter"
            className={formStyles.select}
            value={positionFilter}
            onChange={(event) =>
              onPositionFilterChange(event.target.value as PlayerPosition | "ALL")
            }
          >
            <option value="ALL">All positions</option>
            {POSITIONS.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className={formStyles.help}>
        {filtered.length} of {players.length} available players shown. Position is a
        hand-maintained public listing, not every player is covered — filtering never blocks
        adding a player to any slot.
      </p>
      <ul className={styles.playerList}>
        {filtered.length === 0 ? (
          <li className={formStyles.help}>No players match this search.</li>
        ) : (
          filtered.map((p) => (
            <li key={p.player_id} className={styles.playerRow}>
              <span>{p.name}</span>
              <span className={styles.positionBadge}>{playerPosition(p.player_id) ?? "—"}</span>
              <button
                type="button"
                className={formStyles.secondaryButton}
                onClick={() => onSelect(p.player_id)}
                disabled={disabled}
              >
                Add to roster
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
