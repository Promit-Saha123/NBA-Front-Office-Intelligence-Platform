/**
 * Presentation-only string reshaping (e.g. "team_contribution" -> "Team
 * contribution") — relabels a value already present in a validated response,
 * never fabricates one. Kept out of view-model.ts, which decision 0008
 * restricts to reshape-only mapping with no formatting.
 */
export function humanizeSnakeCase(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
