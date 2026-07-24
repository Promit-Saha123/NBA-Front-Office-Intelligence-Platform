import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A minimal next/navigation mock whose push/replace update window.location
 * via the real History API — matching what real Next.js does under the
 * hood, and what use-scenario-selection.ts's fix specifically relies on.
 */
const routerMocks = vi.hoisted(() => ({
  push: vi.fn((href: string) => window.history.pushState(null, "", href)),
  replace: vi.fn((href: string) => window.history.replaceState(null, "", href)),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerMocks.push, replace: routerMocks.replace }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

import { useScenarioSelection } from "./use-scenario-selection";
import { parseScenarioSelection } from "./url-state";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  routerMocks.push.mockClear();
  routerMocks.replace.mockClear();
});

describe("useScenarioSelection — URL state-sync race (design-review finding, 2026-07-24)", () => {
  it("does not drop an earlier update when two updateSelection calls fire before a re-render", () => {
    const { result } = renderHook(() => useScenarioSelection());

    // Both calls happen inside one `act()` callback (synchronous, not a
    // promise) — React defers processing/re-rendering until the callback
    // returns, so no re-render (and thus no fresh `selection` from
    // useMemo/searchParams) happens between them. This is exactly the
    // real-world race: two onChange handlers firing before the first
    // navigation's re-render lands. Before the fix, the second call read
    // the same stale, pre-first-update `selection` closure and its
    // applySelectionUpdate() silently dropped the first call's change.
    act(() => {
      result.current.updateSelection({ teamId: "GSW" });
      result.current.updateSelection({ contributionProvider: "historical_benchmark" });
    });

    const lastHref = routerMocks.replace.mock.calls.at(-1)?.[0] as string;
    expect(lastHref).toContain("team_id=GSW");
    expect(lastHref).toContain("contribution_provider=historical_benchmark");
  });

  it("commitSelection reads the latest navigated-to state, not a stale render", () => {
    const { result } = renderHook(() => useScenarioSelection());

    act(() => {
      result.current.updateSelection({ teamId: "GSW" });
      result.current.commitSelection();
    });

    const lastPushHref = routerMocks.push.mock.calls.at(-1)?.[0] as string;
    expect(lastPushHref).toContain("team_id=GSW");
  });
});

describe("useScenarioSelection — commitSelection history-entry bug (ADR 0008)", () => {
  // Root cause (confirmed by reading Next.js's own app-router.js): its
  // HistoryUpdater silently downgrades a push() to a replaceState() whenever
  // the push target is byte-identical to window.location. Every
  // updateSelection() during editing already replace()s the URL to match the
  // in-progress selection, so a same-valued push() target is exactly the
  // real-world failure condition — this is what previously left
  // history.length flat across submissions. The fix appends a monotonic hash
  // fragment so the push target always differs from the current URL.
  it("gives commitSelection's push href a hash that differs from the current URL", () => {
    const { result } = renderHook(() => useScenarioSelection());

    act(() => {
      result.current.updateSelection({ teamId: "GSW" });
    });
    const urlBeforeCommit = window.location.href;

    act(() => {
      result.current.commitSelection();
    });

    const pushHref = routerMocks.push.mock.calls.at(-1)?.[0] as string;
    expect(new URL(pushHref, window.location.origin).href).not.toBe(urlBeforeCommit);
  });

  it("gives two consecutive commits of the same selection two different push hrefs", () => {
    const { result } = renderHook(() => useScenarioSelection());

    act(() => {
      result.current.updateSelection({ teamId: "GSW" });
      result.current.commitSelection();
    });
    const firstPushHref = routerMocks.push.mock.calls.at(-1)?.[0] as string;

    // No field changes in between — resubmitting the identical selection is
    // exactly the case the original bug never handled correctly.
    act(() => {
      result.current.commitSelection();
    });
    const secondPushHref = routerMocks.push.mock.calls.at(-1)?.[0] as string;

    expect(secondPushHref).not.toBe(firstPushHref);
    expect(secondPushHref).toContain("team_id=GSW");
  });

  it("does not leak the commit hash into parsed selection state", () => {
    const { result } = renderHook(() => useScenarioSelection());

    act(() => {
      result.current.updateSelection({ teamId: "GSW" });
      result.current.commitSelection();
    });

    expect(window.location.hash).toMatch(/^#committed-\d+$/);
    // useSearchParams() (and thus parseScenarioSelection) never sees the hash —
    // the query string alone still parses correctly.
    expect(parseScenarioSelection(new URLSearchParams(window.location.search)).teamId).toBe(
      "GSW",
    );
  });
});
