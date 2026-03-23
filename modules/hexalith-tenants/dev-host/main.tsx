import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import { CqrsProvider } from "@hexalith/cqrs-client";
import { MockShellProvider } from "@hexalith/shell-api";
import { ToastProvider } from "@hexalith/ui";

import { routes } from "../src/routes.js";
import { mockCommandBus, mockQueryBus, mockSignalRHub } from "./mockSetup.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MockShellProvider>
      <CqrsProvider
        commandApiBaseUrl="http://localhost:mock"
        tokenGetter={async () => "dev-token"}
        signalRHub={mockSignalRHub}
        queryBus={mockQueryBus}
        commandBus={mockCommandBus}
      >
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {routes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={route.element}
                />
              ))}
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </CqrsProvider>
    </MockShellProvider>
  </StrictMode>,
);
