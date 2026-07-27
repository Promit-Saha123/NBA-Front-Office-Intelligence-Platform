import { describe, expect, it } from "vitest";
import { initials, stringToHslColor } from "./avatar-color";

describe("initials", () => {
  it("takes the first letter of the first and last word for a multi-word name", () => {
    expect(initials("Stephen Curry")).toBe("SC");
  });

  it("handles a hyphenated/multi-part last name by still using the last word", () => {
    expect(initials("Giannis Antetokounmpo")).toBe("GA");
  });

  it("falls back to the first two characters of a single-word name", () => {
    expect(initials("Zion")).toBe("ZI");
  });

  it("collapses extra internal whitespace", () => {
    expect(initials("  Stephen   Curry  ")).toBe("SC");
  });

  it("returns a placeholder for an empty name rather than throwing", () => {
    expect(initials("")).toBe("?");
  });
});

describe("stringToHslColor", () => {
  it("is deterministic for the same input", () => {
    expect(stringToHslColor("curryst01")).toBe(stringToHslColor("curryst01"));
  });

  it("returns a valid hsl() string", () => {
    expect(stringToHslColor("curryst01")).toMatch(/^hsl\(\d+, 45%, 38%\)$/);
  });

  it("differs for different inputs (not a constant)", () => {
    expect(stringToHslColor("curryst01")).not.toBe(stringToHslColor("jamesle01"));
  });
});
