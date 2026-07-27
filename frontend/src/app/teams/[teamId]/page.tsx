import { Suspense } from "react";
import { TeamDetailView } from "@/components/TeamDetailView";

export default function TeamDetailPage() {
  return (
    <main>
      <Suspense fallback={<p style={{ color: "var(--color-text-muted)" }}>Loading…</p>}>
        <TeamDetailView />
      </Suspense>
    </main>
  );
}
