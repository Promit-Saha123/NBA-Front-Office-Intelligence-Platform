import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { checkFresh } from "./generate-api.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REAL_COMMITTED_SCHEMA_PATH = path.join(HERE, "..", "src", "generated", "openapi.json");

// These exercise the real pipeline (a local `uv run python ...` subprocess,
// no network) — the same one `pnpm run check:api-fresh` and CI would run.
// Slower than a pure unit test; kept because "generation consistency" and
// "staleness detection" are meaningless without checking the real generator.
//
// Run via `pnpm run test:codegen`, not the default `pnpm test` (which only
// covers src/ and needs nothing beyond Node/pnpm) — this file is the one
// place the frontend test suite depends on the backend's `uv`/Python
// toolchain being present, so it's kept out of the hermetic default run.
//
// Never write to the committed frontend/src/generated/* files here — always
// pass checkFresh() a temp path override instead, so a killed/failed test
// run can never leave the real generated artifacts corrupted on disk.

let tempDir: string | undefined;

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("checkFresh", () => {
  it("reports the committed generated files as fresh right after generation", async () => {
    const { fresh, diffs } = await checkFresh();
    expect(diffs).toEqual([]);
    expect(fresh).toBe(true);
  }, 20_000);

  it("detects a stale schema without ever touching the committed file", async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "roster-lab-api-fresh-"));
    const staleSchemaPath = path.join(tempDir, "openapi.json");
    writeFileSync(staleSchemaPath, '{"deliberately": "wrong"}\n', "utf-8");

    const { fresh, diffs } = await checkFresh({ schemaPath: staleSchemaPath });
    expect(fresh).toBe(false);
    expect(diffs.some((d) => d.includes("openapi.json"))).toBe(true);
  }, 20_000);

  it("reports fresh when a temp path holds an exact copy of the real committed schema", async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "roster-lab-api-fresh-"));
    const copiedSchemaPath = path.join(tempDir, "openapi.json");

    // Generate once to get the real, current committed-equivalent content,
    // then prove a byte-identical copy at a different path also reads fresh.
    const first = await checkFresh();
    expect(first.fresh).toBe(true);
    const realContent = readFileSync(REAL_COMMITTED_SCHEMA_PATH, "utf-8");
    writeFileSync(copiedSchemaPath, realContent, "utf-8");

    const { fresh } = await checkFresh({ schemaPath: copiedSchemaPath });
    expect(fresh).toBe(true);
  }, 20_000);
});
