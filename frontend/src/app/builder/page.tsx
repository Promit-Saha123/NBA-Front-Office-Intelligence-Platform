import Link from "next/link";
import { RosterBuilderView } from "@/components/RosterBuilderView";
import { SUPPORTED_SEASONS } from "@/lib/url-state";

export default function RosterBuilderPage() {
  return (
    <main>
      <header style={{ marginBottom: "var(--space-5)" }}>
        <span
          className="badge"
          style={{ display: "block", width: "fit-content", marginBottom: "var(--space-2)" }}
        >
          Historical data only — {SUPPORTED_SEASONS.join(" / ")} seasons
        </span>
        <h1 style={{ fontSize: "2.25rem", marginBottom: "var(--space-1)" }}>Roster Builder</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "1.05rem", maxWidth: "40rem" }}>
          Assemble a from-scratch 12-player roster from any team in a historical season and
          project its aggregate contribution under transparent, versioned assumptions. This is a
          heuristic, descriptive estimate — not a predicted win total or record.
        </p>
        <p style={{ marginTop: "var(--space-2)" }}>
          <Link href="/scenario-lab">Prefer a one-player swap instead? Try the Scenario Lab →</Link>
        </p>
      </header>
      <RosterBuilderView />
    </main>
  );
}
