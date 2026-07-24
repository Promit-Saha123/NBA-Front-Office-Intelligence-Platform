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
