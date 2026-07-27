import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeamLogo } from "./TeamLogo";

describe("TeamLogo", () => {
  it("renders the team code and full-name alt text for a known team", () => {
    render(<TeamLogo teamId="GSW" />);
    expect(screen.getByRole("img", { name: "Golden State Warriors logo" })).toBeInTheDocument();
    expect(screen.getByText("GSW")).toBeInTheDocument();
  });

  it("still renders for an unknown team code, falling back to the raw code as its name", () => {
    render(<TeamLogo teamId="ZZZ" />);
    expect(screen.getByRole("img", { name: "ZZZ logo" })).toBeInTheDocument();
    expect(screen.getByText("ZZZ")).toBeInTheDocument();
  });

  it("gives the same team the same fallback color every time", () => {
    const { unmount } = render(<TeamLogo teamId="BOS" />);
    const firstColor = screen.getByText("BOS").style.backgroundColor;
    unmount();
    render(<TeamLogo teamId="BOS" />);
    expect(screen.getByText("BOS").style.backgroundColor).toBe(firstColor);
  });
});
