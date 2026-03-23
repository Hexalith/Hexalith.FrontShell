import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./styles/global.css";
import App from "./App";
import { loadRuntimeConfig } from "./config/loadRuntimeConfig";

// Example: Sentry integration
// import * as Sentry from "@sentry/browser";
// const onModuleError = (event: ModuleErrorEvent) => {
//   Sentry.captureException(new Error(event.errorMessage), {
//     level: event.severity === "warning" ? "warning" : "error",
//     tags: { module: event.moduleName, errorCode: event.errorCode, source: event.source },
//     extra: { ...event },
//   });
// };
//
// Example: Console logger (default behavior)
// const onModuleError = (event: ModuleErrorEvent) => {
//   console.warn("[ExternalMonitor]", JSON.stringify(event));
// };

const config = await loadRuntimeConfig();

if (config) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App config={config} />
    </StrictMode>,
  );
}
