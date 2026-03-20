import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
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
