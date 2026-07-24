"use client";

/**
 * Thin Next.js router binding over the pure functions in url-state.ts.
 * Deliberately minimal: all parsing/serialization/cleanup logic (the part
 * worth unit testing) lives in url-state.ts; this hook only wires it to
 * `next/navigation`, plus the commit-vs-edit history-entry fix below (see
 * `commitCounterRef`'s comment) — unit-tested in use-scenario-selection.test.ts
 * against a next/navigation mock backed by the real History API.
 */
import { useCallback, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  applySelectionUpdate,
  parseScenarioSelection,
  serializeScenarioSelection,
  type ScenarioSelectionState,
} from "@/lib/url-state";

export interface UseScenarioSelectionResult {
  selection: ScenarioSelectionState;
  /** Updates one or more fields via `router.replace` (no new history entry) — use for
   *  every in-progress form edit, per decision 0008, so history isn't polluted by keystrokes. */
  updateSelection: (update: Partial<ScenarioSelectionState>) => void;
  /** Re-commits the current selection via `router.push` (adds a history entry) — call only
   *  when a scenario is actually submitted, so back/forward moves between submitted scenarios. */
  commitSelection: () => void;
}

export function useScenarioSelection(): UseScenarioSelectionResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selection = useMemo(() => parseScenarioSelection(searchParams), [searchParams]);

  const navigate = useCallback(
    (state: ScenarioSelectionState, mode: "push" | "replace", hash?: string) => {
      const query = serializeScenarioSelection(state).toString();
      const href = (query ? `${pathname}?${query}` : pathname) + (hash ?? "");
      router[mode](href, { scroll: false });
    },
    [pathname, router],
  );

  // Next.js's own App Router (app-router.js's HistoryUpdater) silently downgrades
  // a push() to a replaceState() whenever its target URL is byte-identical to
  // window.location — "mirrors browser behavior for normal navigation," per its
  // own comment — and that comparison includes the hash. Every updateSelection()
  // during editing already replace()s the URL to match the in-progress selection,
  // so by the time commitSelection() below fires, its push() target would
  // otherwise be identical to the current URL and get silently turned into a
  // replace, which is exactly why back/forward never worked between submitted
  // scenarios (confirmed via real-browser testing, see ADR 0008). A monotonic
  // per-commit hash fragment guarantees the push target always differs from
  // whatever's currently in the address bar, forcing a real pushState() — and
  // since useSearchParams() never sees the hash, it has no effect on parsing,
  // shareable links, or SSR. It clears itself on the next edit, since
  // updateSelection() always targets a hash-less href.
  //
  // The hash IS visible in the address bar right after a submission (e.g.
  // "...&contribution_provider=synthetic#committed-2") until the next edit.
  // A same-tick follow-up replace() to strip it was considered and rejected:
  // Next's action queue (app-router-instance.js's dispatchAction) discards a
  // still-pending navigate action when another navigate action is dispatched
  // before it resolves — so a push() immediately followed by a replace()
  // risks the push's own state (and thus its pushState() call) never being
  // applied at all, silently reproducing the exact bug this fix exists to
  // solve. Not worth that risk for a cosmetic, self-clearing artifact.
  const commitCounterRef = useRef(0);

  // Reads the *actual current browser URL* rather than the `selection` above,
  // which is derived from React's `searchParams` and lags behind reality:
  // router.replace()/push() update window.location synchronously (via the
  // History API), but React's re-render (and thus a fresh `selection`) lands
  // asynchronously. Two updateSelection() calls fired back-to-back — e.g. a
  // team pick immediately followed by a player pick, before the first
  // navigation's re-render has landed — would otherwise both read the same
  // stale `selection` closure, and the second call's applySelectionUpdate()
  // would silently drop the first call's change when it computes `next`.
  // Confirmed via a real repro (design-review evidence, 2026-07-24) before
  // this fix. Reading window.location.search directly sidesteps the race
  // entirely, independent of React's render timing.
  const currentSelection = useCallback(
    (): ScenarioSelectionState => parseScenarioSelection(new URLSearchParams(window.location.search)),
    [],
  );

  const updateSelection = useCallback(
    (update: Partial<ScenarioSelectionState>) => {
      navigate(applySelectionUpdate(currentSelection(), update), "replace");
    },
    [currentSelection, navigate],
  );

  const commitSelection = useCallback(() => {
    commitCounterRef.current += 1;
    navigate(currentSelection(), "push", `#committed-${commitCounterRef.current}`);
  }, [currentSelection, navigate]);

  return { selection, updateSelection, commitSelection };
}
