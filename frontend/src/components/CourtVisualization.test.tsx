import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { CourtVisualization } from "./CourtVisualization";

const FIVE_PLAYERS = [
  { playerId: "curryst01", name: "Stephen Curry" },
  { playerId: "thompkl01", name: "Klay Thompson" },
  { playerId: "greendr01", name: "Draymond Green" },
  { playerId: "iguodan01", name: "Andre Iguodala" },
  { playerId: "acyqu01", name: "Quincy Acy" },
];

describe("CourtVisualization", () => {
  it("renders all five players' names in the accessible legend", () => {
    render(<CourtVisualization players={FIVE_PLAYERS} />);
    const legend = screen.getByRole("list");
    for (const player of FIVE_PLAYERS) {
      expect(within(legend).getByText(player.name)).toBeInTheDocument();
    }
  });

  it("draws one marker and one name label per player on the court diagram", () => {
    const { container } = render(<CourtVisualization players={FIVE_PLAYERS} />);
    // Court decoration draws two circles (circleMark, rim) before the five
    // player markers, always in that document order.
    const allCircles = container.querySelectorAll("svg circle");
    const markers = Array.from(allCircles).slice(-FIVE_PLAYERS.length);
    expect(markers.length).toBe(FIVE_PLAYERS.length);
    const labels = Array.from(container.querySelectorAll("svg text")).map((el) => el.textContent);
    expect(labels).toEqual(FIVE_PLAYERS.map((p) => p.name));
  });

  it("discloses that placement is for visualization only, not a verified position", () => {
    render(<CourtVisualization players={FIVE_PLAYERS} />);
    expect(
      screen.getByText(
        "Starting lineup shown below. Player placement on the court is for visualization only and does not represent verified on-court positions.",
      ),
    ).toBeInTheDocument();
  });

  it("never labels a marker with a position (PG/SG/SF/PF/C or similar)", () => {
    render(<CourtVisualization players={FIVE_PLAYERS} />);
    expect(screen.queryByText(/point guard|shooting guard|small forward|power forward|center/i)).not.toBeInTheDocument();
  });

  it("exposes the diagram as a labeled, non-interactive region and hides the decorative SVG from assistive tech", () => {
    const { container } = render(<CourtVisualization players={FIVE_PLAYERS} />);
    expect(screen.getByRole("group", { name: /starting lineup/i })).toBeInTheDocument();
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("shows a clear empty state instead of a partial court when fewer than five players are given", () => {
    render(<CourtVisualization players={FIVE_PLAYERS.slice(0, 3)} />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /starting lineup/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows the same empty state when no players are given at all", () => {
    render(<CourtVisualization players={[]} />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });

  it("shows the empty state rather than silently dropping extras when given more than five players", () => {
    render(<CourtVisualization players={[...FIVE_PLAYERS, { playerId: "extra01", name: "Extra Player" }]} />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });
});
