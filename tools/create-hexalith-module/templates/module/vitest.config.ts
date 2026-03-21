import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["**/*.spec.ts", "**/*.spec.tsx"],
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: "unit",
          include: ["**/*.test.ts"],
          setupFiles: ["./src/test-setup.ts"],
        },
      },
      {
        test: {
          name: "component",
          include: ["**/*.test.tsx"],
          environment: "jsdom",
          css: {
            modules: {
              classNameStrategy: "non-scoped",
            },
          },
          setupFiles: ["./src/test-setup.ts"],
        },
      },
    ],
  },
});
