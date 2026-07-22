/**
 * Compiles runtime validators directly from the generated OpenAPI document
 * (src/generated/openapi.json) — not a hand-written duplicate schema.
 *
 * Because both src/generated/openapi.json and src/generated/api-types.ts are
 * regenerated from the same backend/api/openapi.json in one step
 * (pnpm run generate:api), this is the only place the response shape is
 * checked, and it can never drift from the compile-time types on its own
 * (see docs/decisions/0008-roster-lab-frontend-architecture.md, clarification 2).
 */
import Ajv2020 from "ajv/dist/2020";
import type { ErrorObject, ValidateFunction } from "ajv";
import openapiDocument from "@/generated/openapi.json";

interface OpenApiDocument {
  components: { schemas: Record<string, object> };
}

const ajv = new Ajv2020({ strict: false, allErrors: true });

let schemasRegistered = false;

function schemaRef(name: string): string {
  return `#/components/schemas/${name}`;
}

function ensureSchemasRegistered(): void {
  if (schemasRegistered) return;
  const { schemas } = (openapiDocument as OpenApiDocument).components;
  for (const [name, schema] of Object.entries(schemas)) {
    ajv.addSchema(schema, schemaRef(name));
  }
  schemasRegistered = true;
}

/** Returns a compiled ajv validator for a named schema in components.schemas. */
export function getValidator(schemaName: string): ValidateFunction {
  ensureSchemasRegistered();
  const validate = ajv.getSchema(schemaRef(schemaName));
  if (!validate) {
    throw new Error(
      `No compiled validator for schema "${schemaName}" — is src/generated/openapi.json stale? Run: pnpm run generate:api`,
    );
  }
  return validate;
}

/** Renders ajv errors as one human-readable line, for developer diagnostics only. */
export function describeValidationErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors || errors.length === 0) return "unknown validation error";
  return errors.map((e) => `${e.instancePath || "<root>"} ${e.message ?? ""}`.trim()).join("; ");
}
