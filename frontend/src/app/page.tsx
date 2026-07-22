import { Suspense } from "react";
import { ScenarioForm } from "@/components/ScenarioForm";

export default function Home() {
  return (
    <main>
      <header style={{ marginBottom: "var(--space-5)" }}>
        <span
          className="badge"
          style={{ display: "block", width: "fit-content", marginBottom: "var(--space-2)" }}
        >
          Historical data only — 2014-15 season
        </span>
        <h1 style={{ fontSize: "2.25rem", marginBottom: "var(--space-1)" }}>Roster Lab</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "1.05rem", maxWidth: "40rem" }}>
          Explore how a one-player roster swap could have changed a historical team&apos;s
          projected contribution, under transparent, versioned assumptions.
        </p>
      </header>
      <Suspense fallback={<p style={{ color: "var(--color-text-muted)" }}>Loading…</p>}>
        <ScenarioForm />
      </Suspense>
    </main>
  );
}
