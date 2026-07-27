import type { ContributionProviderChoice } from "@/lib/url-state";

/** Shared display labels for the two contribution providers — used by every
 *  provider `<select>` in the app (ScenarioForm, PlayerDetailView). */
export const PROVIDER_LABELS: Record<ContributionProviderChoice, string> = {
  historical_benchmark: "Historical RAPTOR benchmark",
  synthetic: "Synthetic estimate (demo values)",
};
