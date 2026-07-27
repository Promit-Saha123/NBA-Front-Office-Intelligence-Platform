/**
 * Deterministic, dependency-free helpers for the generated placeholder
 * badges TeamLogo/PlayerHeadshot fall back to when no real image is
 * available (decision 0007: real player photos aren't freely licensable,
 * so this project never fetches or ships real headshots).
 */

/** "Stephen Curry" -> "SC"; a single-word name falls back to its first
 *  two characters ("Zion" -> "ZI") so every player still gets two glyphs. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** A small, non-cryptographic string hash (FNV-1a) — deterministic and
 *  stable across runs/sessions, which is all a display color needs. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Maps any string (e.g. a player_id) to one of a fixed set of hues, so the
 *  same id always renders the same color. Saturation/lightness are fixed
 *  at values that keep white foreground text readable on the result. */
export function stringToHslColor(value: string): string {
  const hue = hashString(value) % 360;
  return `hsl(${hue}, 45%, 38%)`;
}
