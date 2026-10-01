import { Suspense } from "react";
import Link from "next/link";
import { ScenarioForm } from "@/components/ScenarioForm";
import { makePrefixedParamKeys } from "@/lib/url-state";
import styles from "./compare.module.css";

// Stable across renders — makePrefixedParamKeys is pure, but defining these
// once at module scope (not inside the component body) avoids handing
// ScenarioForm a new object identity on every render for no reason.
const PARAM_KEYS_A = makePrefixedParamKeys("a");
const PARAM_KEYS_B = makePrefixedParamKeys("b");

export default function Compare() {
  return (
    <main>
      <header style={{ marginBottom: "var(--space-5)" }}>
        <h1 style={{ fontSize: "2.25rem", marginBottom: "var(--space-1)" }}>
          Compare Scenarios
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "1.05rem", maxWidth: "40rem" }}>
          Run two independent roster scenarios — any season, team, or provider on
          each side — and see their results side by side. The URL captures both,
          so a comparison is shareable just like a single scenario.
        </p>
        <p style={{ marginTop: "var(--space-2)" }}>
          <Link href="/">← Back to a single scenario</Link>
        </p>
      </header>
      <Suspense fallback={<p style={{ color: "var(--color-text-muted)" }}>Loading…</p>}>
        <div className={styles.grid}>
          <ScenarioForm paramKeys={PARAM_KEYS_A} hashPrefix="a" heading="Scenario A" />
          <ScenarioForm paramKeys={PARAM_KEYS_B} hashPrefix="b" heading="Scenario B" />
        </div>
      </Suspense>
    </main>
  );
}
