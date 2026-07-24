"use client";

/**
 * Thin Next.js router binding over the pure functions in url-state.ts.
 * Deliberately minimal: all parsing/serialization/cleanup logic (the part
 * worth unit testing) lives in url-state.ts; this hook only wires it to
 * `next/navigation`. Not unit-tested directly for that reason — component-
 * level testing infrastructure (jsdom, a router harness) isn't justified
 * until an actual component consumes this hook (UI-002).
 */
import { useCallback, useMemo } from "react";
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
    (state: ScenarioSelectionState, mode: "push" | "replace") => {
      const query = serializeScenarioSelection(state).toString();
      const href = query ? `${pathname}?${query}` : pathname;
      router[mode](href, { scroll: false });
    },
    [pathname, router],
  );

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
    navigate(currentSelection(), "push");
  }, [currentSelection, navigate]);

  return { selection, updateSelection, commitSelection };
}
