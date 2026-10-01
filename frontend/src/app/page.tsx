import { redirect } from "next/navigation";

// The roster builder replaces the one-player swap Scenario Lab as the
// default landing experience (decision 0014) — the old page moved to
// /scenario-lab rather than being deleted.
export default function Home() {
  redirect("/builder");
}
