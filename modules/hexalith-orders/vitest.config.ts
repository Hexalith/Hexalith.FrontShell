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
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/test-setup.ts",
        "src/css-modules.d.ts",
        "src/index.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
});
