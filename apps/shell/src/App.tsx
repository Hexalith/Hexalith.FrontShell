import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

import { AuthGate } from "./auth/AuthGate";
import { ShellLayout } from "./layout/ShellLayout";
import { NotFoundPage } from "./pages/NotFoundPage";
import { TenantsPlaceholderPage } from "./pages/TenantsPlaceholderPage";
import { WelcomePage } from "./pages/WelcomePage";
import { ShellProviders } from "./providers/ShellProviders";

import type { RuntimeConfig } from "./config/types";

function createAppRouter() {
  return createBrowserRouter([
    {
      path: "/",
      element: <ShellLayout />,
      children: [
        {
          index: true,
          element: <WelcomePage />,
        },
        {
          path: "tenants",
          element: <TenantsPlaceholderPage />,
        },
        {
          path: "*",
          element: <NotFoundPage />,
        },
      ],
    },
  ]);
}

interface AppProps {
  config: RuntimeConfig;
}

export default function App({ config }: AppProps): React.JSX.Element {
  const router = React.useMemo(() => createAppRouter(), []);

  const oidcConfig = React.useMemo(
    () => ({
      authority: config.oidcAuthority,
      client_id: config.oidcClientId,
      redirect_uri: config.oidcRedirectUri ?? window.location.origin,
      post_logout_redirect_uri:
        config.oidcPostLogoutRedirectUri ?? window.location.origin,
      scope: config.oidcScope ?? "openid profile email",
    }),
    [config],
  );

  return (
    <ShellProviders
      oidcConfig={oidcConfig}
      backendUrl={config.commandApiBaseUrl}
      tenantClaimName={config.tenantClaimName}
    >
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
    </ShellProviders>
  );
}
