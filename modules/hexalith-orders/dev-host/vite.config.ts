import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const devHostRoot = fileURLToPath(new URL(".", import.meta.url));
const moduleRoot = resolve(devHostRoot, "..");
const workspacePackagesDir = [
  resolve(moduleRoot, "..", "..", "packages"),
  resolve(moduleRoot, "..", "..", "..", "..", "packages"),
].find((candidate) => existsSync(candidate));

// More specific aliases must come first — "@hexalith/ui/tokens.css" before
// "@hexalith/ui" — otherwise Vite prefix-matches the shorter key and resolves
// "tokens.css" as a path under "index.ts".
const workspaceAliases: Array<{ find: string; replacement: string }> =
  workspacePackagesDir
    ? [
        {
          find: "@hexalith/ui/tokens.css",
          replacement: resolve(
            workspacePackagesDir,
            "ui",
            "src",
            "tokens",
            "index.css",
          ),
        },
        {
          find: "@hexalith/shell-api",
          replacement: resolve(
            workspacePackagesDir,
            "shell-api",
            "src",
            "index.ts",
          ),
        },
        {
          find: "@hexalith/cqrs-client",
          replacement: resolve(
            workspacePackagesDir,
            "cqrs-client",
            "src",
            "index.ts",
          ),
        },
        {
          find: "@hexalith/ui",
          replacement: resolve(workspacePackagesDir, "ui", "src", "index.ts"),
        },
      ]
    : [];

export default defineConfig({
  root: devHostRoot,
  plugins: [react()],
  resolve: {
    alias: workspaceAliases,
  },
  build: {
    target: "es2022",
  },
  server: {
    port: 5174,
    strictPort: false,
    open: true,
  },
});
