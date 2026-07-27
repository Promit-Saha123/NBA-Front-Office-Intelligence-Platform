import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourtVisualization } from "./CourtVisualization";

const OUTGOING = { playerId: "barbole01", name: "Leandro Barbosa" };
const INCOMING = { playerId: "acyqu01", name: "Quincy Acy" };

describe("CourtVisualization", () => {
  it("labels the outgoing and incoming players with text, not color alone", () => {
    render(<CourtVisualization outgoing={OUTGOING} incoming={INCOMING} />);

    expect(screen.getByText(/Removed/)).toBeInTheDocument();
    expect(screen.getByText(/Added/)).toBeInTheDocument();
    expect(screen.getByText(/Leandro Barbosa/)).toBeInTheDocument();
    expect(screen.getByText(/Quincy Acy/)).toBeInTheDocument();
  });

  it("discloses that placement is an assumption, not a verified position", () => {
    render(<CourtVisualization outgoing={OUTGOING} incoming={INCOMING} />);

    expect(screen.getByText(/assumed position/i)).toBeInTheDocument();
  });

  it("marks a placeholder position as a placeholder when no real position is supplied", () => {
    render(<CourtVisualization outgoing={OUTGOING} incoming={INCOMING} />);

    const items = screen.getAllByText(/placeholder, position unknown/);
    expect(items.length).toBe(2);
  });

  it("does not add a placeholder disclosure when the caller supplies a real position", () => {
    render(
      <CourtVisualization
        outgoing={{ ...OUTGOING, position: "PG" }}
        incoming={{ ...INCOMING, position: "C" }}
      />
    );

    expect(screen.queryByText(/placeholder, position unknown/)).not.toBeInTheDocument();
    expect(screen.getByText(/assumed Point Guard/)).toBeInTheDocument();
    expect(screen.getByText(/assumed Center/)).toBeInTheDocument();
  });

  it("assigns the same placeholder position deterministically across renders", () => {
    const { unmount } = render(<CourtVisualization outgoing={OUTGOING} incoming={INCOMING} />);
    const firstLegendText = screen.getByText(/Leandro Barbosa/).textContent;
    unmount();

    render(<CourtVisualization outgoing={OUTGOING} incoming={INCOMING} />);
    const secondLegendText = screen.getByText(/Leandro Barbosa/).textContent;

    expect(secondLegendText).toBe(firstLegendText);
  });

  it("visually distinguishes the removed and added markers by shape, not just position", () => {
    const { container } = render(<CourtVisualization outgoing={OUTGOING} incoming={INCOMING} />);
    const circles = container.querySelectorAll("svg circle");
    // Court decoration draws two circles (circleMark, rim) before the two
    // player markers — the markers are always the last two in document order.
    const [outMarker, inMarker] = Array.from(circles).slice(-2);
    expect(outMarker.getAttribute("class")).not.toBe(inMarker.getAttribute("class"));
  });

  it("exposes the diagram as a labeled, non-interactive region and hides the decorative SVG from assistive tech", () => {
    const { container } = render(<CourtVisualization outgoing={OUTGOING} incoming={INCOMING} />);

    expect(screen.getByRole("group", { name: /court placement/i })).toBeInTheDocument();
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
