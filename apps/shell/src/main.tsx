import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./styles/global.css";
import App from "./App";
import { loadRuntimeConfig } from "./config/loadRuntimeConfig";

const config = await loadRuntimeConfig();

if (config) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App config={config} />
    </StrictMode>,
  );
}
