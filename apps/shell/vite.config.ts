import { readFileSync } from "node:fs";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { manifestValidationPlugin } from "./src/build/manifestValidationPlugin";

const shellPackage = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as {
  version?: string;
};

const appVersion = process.env.npm_package_version ?? shellPackage.version ?? "dev";

export default defineConfig({
  plugins: [
    manifestValidationPlugin(),
    react(),
    {
      name: "hexalith-shell-version",
      transformIndexHtml(html) {
        return html.replaceAll("%VITE_APP_VERSION%", appVersion);
      },
    },
  ],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");

          if (!normalizedId.includes("/node_modules/")) {
            return undefined;
          }

          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/react/jsx-runtime")
          ) {
            return "react-vendor";
          }

          if (normalizedId.includes("/node_modules/react-router/")) {
            return "router-vendor";
          }

          if (normalizedId.includes("/node_modules/@tanstack/react-query/")) {
            return "query-vendor";
          }

          if (normalizedId.includes("/node_modules/@radix-ui/")) {
            return "radix-vendor";
          }

          if (
            normalizedId.includes("/node_modules/@microsoft/signalr/")
          ) {
            return "signalr-vendor";
          }

          return undefined;
        },
      },
    },
  },
});
