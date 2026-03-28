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

// When running under Aspire, proxy API requests to avoid CORS issues.
const eventStoreUrl = process.env.services__eventstore__http__0;

export default defineConfig({
  server: eventStoreUrl
    ? {
        proxy: {
          "/hubs": { target: eventStoreUrl, changeOrigin: true, ws: true },
          "/api": { target: eventStoreUrl, changeOrigin: true },
          "/health": { target: eventStoreUrl, changeOrigin: true },
        },
      }
    : undefined,
  plugins: [
    manifestValidationPlugin(),
    react(),
    {
      name: "hexalith-shell-version",
      transformIndexHtml(html) {
        return html.replaceAll("%VITE_APP_VERSION%", appVersion);
      },
    },
    {
      name: "aspire-runtime-config",
      configureServer(server) {
        // When running under Aspire, generate /config.json from injected env vars.
        // Falls through to the static public/config.json when env vars are absent.
        server.middlewares.use((req, res, next) => {
          if (req.url !== "/config.json") return next();

          const apiUrl = process.env.services__eventstore__http__0;
          if (!apiUrl) return next();

          const config = {
            oidcAuthority: process.env.OIDC_AUTHORITY ?? "http://localhost:8180/realms/hexalith",
            oidcClientId: process.env.OIDC_CLIENT_ID ?? "hexalith-frontshell",
            commandApiBaseUrl: "/",
            tenantClaimName: "eventstore:tenant",
          };
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(config, null, 2));
        });
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
