import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Test runner for the supervised-factory safety net.
// Pure-logic and presentational low-risk surfaces are tested here; anything
// touching auth, data, AI, or money stays human-gated and is out of scope.
//
// Default environment is node (fast). Component tests opt into jsdom per-file
// with a `// @vitest-environment jsdom` docblock at the top.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolve the "@/*" -> "./*" alias from tsconfig.json natively.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
  },
});
