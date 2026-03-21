import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["templates/**", "node_modules/**"],
    passWithNoTests: true,
  },
});
