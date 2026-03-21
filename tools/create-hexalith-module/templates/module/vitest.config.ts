import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["**/*.spec.ts", "**/*.spec.tsx"],
    passWithNoTests: true,
  },
});
