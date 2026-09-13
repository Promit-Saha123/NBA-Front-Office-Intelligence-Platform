import { Suspense } from "react";
import Link from "next/link";
import { ScenarioForm } from "@/components/ScenarioForm";
import { SUPPORTED_SEASONS } from "@/lib/url-state";

// Archived, not deleted (decision 0014): the roster builder at /builder is
// now the default landing experience (/ redirects there), but the one-player
// swap engine and its full UI stay reachable here rather than being removed.
export default function ScenarioLabPage() {
  return (
    <main>
      <header style={{ marginBottom: "var(--space-5)" }}>
        <span
          className="badge"
          style={{ display: "block", width: "fit-content", marginBottom: "var(--space-2)" }}
        >
          Historical data only — {SUPPORTED_SEASONS.join(" / ")} seasons
        </span>
        <h1 style={{ fontSize: "2.25rem", marginBottom: "var(--space-1)" }}>Scenario Lab</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "1.05rem", maxWidth: "40rem" }}>
          Explore how a one-player roster swap could have changed a historical team&apos;s
          projected contribution, under transparent, versioned assumptions.
        </p>
        <p style={{ marginTop: "var(--space-2)" }}>
          <Link href="/compare">Compare two scenarios side by side →</Link>
        </p>
      </header>
      <Suspense fallback={<p style={{ color: "var(--color-text-muted)" }}>Loading…</p>}>
        <ScenarioForm />
      </Suspense>
    </main>
  );
}
