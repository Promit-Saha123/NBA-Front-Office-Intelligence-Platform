import { describe, expect, it } from "vitest";
import { describeValidationErrors, getValidator } from "./validate";

describe("getValidator", () => {
  it("compiles a validator for a schema that exists in the generated document", () => {
    const validate = getValidator("ScenarioResponse");
    expect(typeof validate).toBe("function");
  });

  it("throws a clear error for an unknown schema name instead of returning undefined", () => {
    expect(() => getValidator("NotARealSchema")).toThrow(/generate:api/);
  });
});

describe("describeValidationErrors", () => {
  it("renders a readable summary from ajv error objects", () => {
    const message = describeValidationErrors([
      // Minimal shape compatible with ajv's ErrorObject for this formatter.
      { instancePath: "/model_version", message: "must be string,null" } as never,
    ]);
    expect(message).toContain("/model_version");
    expect(message).toContain("must be string,null");
  });

  it("handles an empty or missing error list without throwing", () => {
    expect(describeValidationErrors(null)).toBe("unknown validation error");
    expect(describeValidationErrors([])).toBe("unknown validation error");
  });
});
