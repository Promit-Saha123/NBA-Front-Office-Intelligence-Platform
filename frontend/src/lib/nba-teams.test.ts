import { describe, expect, it } from "vitest";
import { teamDisplayName } from "./nba-teams";

describe("teamDisplayName", () => {
  it("resolves a stable code the same way regardless of season", () => {
    expect(teamDisplayName("GSW", "1976-77")).toBe("Golden State Warriors");
    expect(teamDisplayName("GSW", "2021-22")).toBe("Golden State Warriors");
  });

  it("disambiguates CHA by season — Bobcats before the 2014-15 rename, Hornets after", () => {
    expect(teamDisplayName("CHA", "2010-11")).toBe("Charlotte Bobcats");
    expect(teamDisplayName("CHA", "2015-16")).toBe("Charlotte Hornets");
  });

  it("resolves a relocated franchise's earlier code correctly", () => {
    expect(teamDisplayName("SEA", "2007-08")).toBe("Seattle SuperSonics");
    expect(teamDisplayName("OKC", "2008-09")).toBe("Oklahoma City Thunder");
  });

  it("resolves the Katrina-era New Orleans/Oklahoma City Hornets name", () => {
    expect(teamDisplayName("NOK", "2005-06")).toBe("New Orleans/Oklahoma City Hornets");
    expect(teamDisplayName("NOH", "2003-04")).toBe("New Orleans Hornets");
    expect(teamDisplayName("NOH", "2010-11")).toBe("New Orleans Hornets");
  });

  it("falls back to the raw code for an unrecognized code", () => {
    expect(teamDisplayName("ZZZ", "2014-15")).toBe("ZZZ");
  });

  it("falls back to the raw code when a code is recognized but the season is outside every era", () => {
    expect(teamDisplayName("OKC", "1990-91")).toBe("OKC");
  });

  it("falls back to the code's most recent era when season is omitted", () => {
    expect(teamDisplayName("CHA")).toBe("Charlotte Hornets");
  });
});
