import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImageWithFallback } from "./ImageWithFallback";

describe("ImageWithFallback", () => {
  it("shows the fallback and renders no <img> when src is absent (missing-image state)", () => {
    render(<ImageWithFallback alt="Test" fallback={<span>FB</span>} />);
    expect(screen.getByText("FB")).toBeInTheDocument();
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
    expect(document.querySelector("img")).not.toBeInTheDocument();
  });

  it("keeps showing the fallback until the image finishes loading", () => {
    render(<ImageWithFallback src="/logo.png" alt="Test" fallback={<span>FB</span>} />);
    expect(screen.getByText("FB")).toBeInTheDocument();
    const img = document.querySelector("img");
    expect(img).toHaveStyle({ display: "none" });
  });

  it("hides the fallback and shows the image once it loads", () => {
    render(<ImageWithFallback src="/logo.png" alt="Test" fallback={<span>FB</span>} />);
    const img = document.querySelector("img")!;
    fireEvent.load(img);
    expect(screen.queryByText("FB")).not.toBeInTheDocument();
    expect(img).not.toHaveStyle({ display: "none" });
  });

  it("stays on the fallback if the image fails to load (broken-image state)", () => {
    render(<ImageWithFallback src="/broken.png" alt="Test" fallback={<span>FB</span>} />);
    const img = document.querySelector("img")!;
    fireEvent.error(img);
    expect(screen.getByText("FB")).toBeInTheDocument();
    expect(img).toHaveStyle({ display: "none" });
  });

  it("carries the accessible name on the wrapper and hides the inner <img> from assistive tech", () => {
    render(<ImageWithFallback src="/logo.png" alt="Golden State Warriors logo" fallback={<span>FB</span>} />);
    expect(screen.getByRole("img", { name: "Golden State Warriors logo" })).toBeInTheDocument();
    const img = document.querySelector("img")!;
    expect(img).toHaveAttribute("aria-hidden", "true");
    expect(img).toHaveAttribute("alt", "");
  });
});
