import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
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
