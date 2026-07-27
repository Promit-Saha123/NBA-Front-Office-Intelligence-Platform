import { ImageWithFallback } from "./ImageWithFallback";
import { initials, stringToHslColor } from "@/lib/avatar-color";
import styles from "./MediaBadge.module.css";

export interface PlayerHeadshotProps {
  playerId: string;
  name: string;
  /** A real headshot URL, once one exists — no caller passes this yet
   *  (decision 0007: real player photos aren't freely licensable). */
  src?: string;
  size?: "sm" | "md";
}

/**
 * A player's headshot, or (today, always) a generated placeholder avatar —
 * initials on a color deterministically derived from `playerId`, so the
 * same player always renders the same color across the app.
 *
 * Deliberately plain and presentational, with no click handling of its
 * own: a future clickable ML player-profile affordance can wrap this in a
 * `<button>` later without any change here. That feature does not exist
 * yet and this component makes no claim that it does.
 */
export function PlayerHeadshot({ playerId, name, src, size = "md" }: PlayerHeadshotProps) {
  return (
    <ImageWithFallback
      src={src}
      alt={`${name} headshot`}
      className={`${styles.badge} ${styles[size]} ${styles.round}`}
      fallback={
        <span
          className={styles.fallbackContent}
          style={{ backgroundColor: stringToHslColor(playerId) }}
          aria-hidden="true"
        >
          {initials(name)}
        </span>
      }
    />
  );
}
