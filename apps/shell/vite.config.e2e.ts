import { fileURLToPath } from "node:url";

import { defineConfig, mergeConfig } from "vite";

import type { Plugin } from "vite";

import baseConfig from "./vite.config";

/**
 * Vite plugin that swaps ShellProviders.tsx with ShellProviders.e2e.tsx
 * during the E2E build. More reliable than resolve.alias on Windows
 * (backslash mismatch in absolute paths).
 */
function e2eProviderSwapPlugin(): Plugin {
  return {
    name: "hexalith-e2e-provider-swap",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer) return null;

      // Normalize to forward slashes for comparison
      const normalized = source.replace(/\\/g, "/");

      // Match the specific import of ShellProviders (relative or absolute)
      if (
        normalized.endsWith("/providers/ShellProviders") ||
        normalized === "./providers/ShellProviders"
      ) {
        const e2ePath = fileURLToPath(
          new URL("src/providers/ShellProviders.e2e.tsx", import.meta.url),
        );
        return e2ePath;
      }

      return null;
    },
  };
}

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [e2eProviderSwapPlugin()],
  }),
);
