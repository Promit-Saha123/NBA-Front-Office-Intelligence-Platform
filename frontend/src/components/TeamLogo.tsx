import { ImageWithFallback } from "./ImageWithFallback";
import { teamAccentColor, teamDisplayName } from "@/lib/nba-teams";
import styles from "./MediaBadge.module.css";

export interface TeamLogoProps {
  teamId: string;
  /** A real logo URL, once one exists — no caller passes this yet (decision
   *  0007: real team logo artwork isn't freely licensable). */
  src?: string;
  size?: "sm" | "md";
}

/**
 * A team's logo, or (today, always) a generated placeholder badge — the
 * team code on a background tinted with that team's approximate brand
 * color (`teamAccentColor`, a color fact, not the trademarked logo mark).
 */
export function TeamLogo({ teamId, src, size = "md" }: TeamLogoProps) {
  return (
    <ImageWithFallback
      src={src}
      alt={`${teamDisplayName(teamId)} logo`}
      className={`${styles.badge} ${styles[size]}`}
      fallback={
        <span
          className={styles.fallbackContent}
          style={{ backgroundColor: teamAccentColor(teamId) }}
          aria-hidden="true"
        >
          {teamId}
        </span>
      }
    />
  );
}
