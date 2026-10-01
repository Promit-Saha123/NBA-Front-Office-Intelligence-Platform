import { describe, expect, it } from "vitest";
import { playerPosition } from "./player-positions";

describe("playerPosition", () => {
  it("returns the listed position for a known player", () => {
    expect(playerPosition("curryst01")).toBe("PG");
    expect(playerPosition("duncati01")).toBe("PF");
  });

  it("returns null (never throws) for an unlisted or unknown player_id", () => {
    expect(playerPosition("nobody")).toBeNull();
  });
});
