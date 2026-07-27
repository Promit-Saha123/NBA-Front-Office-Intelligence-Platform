import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayerHeadshot } from "./PlayerHeadshot";

describe("PlayerHeadshot", () => {
  it("renders initials and full-name alt text", () => {
    render(<PlayerHeadshot playerId="curryst01" name="Stephen Curry" />);
    expect(screen.getByRole("img", { name: "Stephen Curry headshot" })).toBeInTheDocument();
    expect(screen.getByText("SC")).toBeInTheDocument();
  });

  it("gives the same player the same fallback color every time", () => {
    const { unmount } = render(<PlayerHeadshot playerId="curryst01" name="Stephen Curry" />);
    const firstColor = screen.getByText("SC").style.backgroundColor;
    unmount();
    render(<PlayerHeadshot playerId="curryst01" name="Stephen Curry" />);
    expect(screen.getByText("SC").style.backgroundColor).toBe(firstColor);
  });

  it("gives different players different fallback colors (not a constant)", () => {
    render(<PlayerHeadshot playerId="curryst01" name="Stephen Curry" />);
    render(<PlayerHeadshot playerId="jamesle01" name="LeBron James" />);
    const curryColor = screen.getByText("SC").style.backgroundColor;
    const jamesColor = screen.getByText("LJ").style.backgroundColor;
    expect(curryColor).not.toBe(jamesColor);
  });
});
