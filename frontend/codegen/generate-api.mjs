#!/usr/bin/env node
/**
 * Regenerates the frontend's API contract from the backend's OpenAPI schema.
 *
 * Chain (docs/decisions/0008-roster-lab-frontend-architecture.md, clarification 1):
 *   backend/api/app.py (Pydantic models)
 *     -> backend/api/openapi.json            (backend script, no running server)
 *     -> frontend/src/generated/openapi.json (copied verbatim, committed)
 *     -> frontend/src/generated/api-types.ts (openapi-typescript, committed)
 *
 * Both files under src/generated/ are generated — never hand-edit them.
 * `--check` regenerates in memory and diffs against the committed files
 * instead of writing, for CI/staleness detection.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");
const BACKEND_SCHEMA_PATH = path.join(REPO_ROOT, "backend", "api", "openapi.json");
const GENERATED_DIR = path.join(FRONTEND_ROOT, "src", "generated");
const GENERATED_SCHEMA_PATH = path.join(GENERATED_DIR, "openapi.json");
const GENERATED_TYPES_PATH = path.join(GENERATED_DIR, "api-types.ts");

const TYPES_BANNER = `/**
 * GENERATED FILE - DO NOT EDIT.
 * Source: backend/api/openapi.json (backend/api/app.py's Pydantic models).
 * Regenerate with: pnpm run generate:api
 */
`;

/** Runs the backend's deterministic OpenAPI export (no server, no network); returns its text. */
export function exportBackendSchema() {
  execFileSync("uv", ["run", "python", "scripts/export_openapi_schema.py"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  return readFileSync(BACKEND_SCHEMA_PATH, "utf-8");
}

/** Converts OpenAPI schema text into the generated .ts text, via openapi-typescript's JS API
 * (not its CLI) — the CLI shells out to a file-based resolver that mishandles paths containing
 * spaces (this repo's own directory name), and passing the parsed object in-process sidesteps
 * that entirely since there are no external $refs to resolve. */
export async function generateTypesText(schemaText) {
  const ast = await openapiTS(JSON.parse(schemaText));
  return TYPES_BANNER + astToString(ast);
}

/** Regenerates both committed files from a fresh backend export. Writes to disk. */
export async function runFullGeneration() {
  const schemaText = exportBackendSchema();
  writeFileSync(GENERATED_SCHEMA_PATH, schemaText, "utf-8");
  const typesText = await generateTypesText(schemaText);
  writeFileSync(GENERATED_TYPES_PATH, typesText, "utf-8");
  return { schemaText, typesText };
}

/**
 * Regenerates in memory and diffs against the committed files (or, for tests,
 * against caller-supplied paths — never mutates the real committed files
 * itself; a caller wanting to simulate staleness must write to a path of its
 * own, e.g. a temp file, and pass it in here).
 * Returns { fresh, diffs } — never writes.
 */
export async function checkFresh({
  schemaPath = GENERATED_SCHEMA_PATH,
  typesPath = GENERATED_TYPES_PATH,
} = {}) {
  const schemaText = exportBackendSchema();
  const typesText = await generateTypesText(schemaText);

  const diffs = [];
  const committedSchema = existsSync(schemaPath) ? readFileSync(schemaPath, "utf-8") : null;
  if (committedSchema !== schemaText) {
    diffs.push(`${path.relative(REPO_ROOT, schemaPath)} is stale`);
  }
  const committedTypes = existsSync(typesPath) ? readFileSync(typesPath, "utf-8") : null;
  if (committedTypes !== typesText) {
    diffs.push(`${path.relative(REPO_ROOT, typesPath)} is stale`);
  }
  return { fresh: diffs.length === 0, diffs };
}

async function main() {
  const check = process.argv.includes("--check");
  if (check) {
    const { fresh, diffs } = await checkFresh();
    if (!fresh) {
      console.error("Generated API contract is stale:");
      for (const diff of diffs) console.error(`  - ${diff}`);
      console.error("Regenerate with: pnpm run generate:api");
      process.exitCode = 1;
      return;
    }
    console.log("Generated API contract is up to date.");
    return;
  }
  await runFullGeneration();
  console.log(`Wrote ${path.relative(REPO_ROOT, GENERATED_SCHEMA_PATH)}`);
  console.log(`Wrote ${path.relative(REPO_ROOT, GENERATED_TYPES_PATH)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
