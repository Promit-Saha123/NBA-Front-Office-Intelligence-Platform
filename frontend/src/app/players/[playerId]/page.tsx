import { Suspense } from "react";
import { PlayerDetailView } from "@/components/PlayerDetailView";

export default function PlayerDetailPage() {
  return (
    <main>
      <Suspense fallback={<p style={{ color: "var(--color-text-muted)" }}>Loading…</p>}>
        <PlayerDetailView />
      </Suspense>
    </main>
  );
}
