import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// @testing-library/react's own auto-cleanup only registers itself when it
// detects a global `afterEach` — this project imports test functions
// explicitly per file (no `test.globals: true`), so it never fires on its
// own. Without this, DOM nodes from earlier tests in the same file stay
// mounted and later `getByRole`/`getByLabelText` queries match duplicates.
afterEach(() => {
  cleanup();
});
