import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";

import { Skeleton } from "@hexalith/ui";

const TenantListPage = lazy(() =>
  import("./pages/TenantListPage.js").then((m) => ({
    default: m.TenantListPage,
  })),
);

const TenantDetailPage = lazy(() =>
  import("./pages/TenantDetailPage.js").then((m) => ({
    default: m.TenantDetailPage,
  })),
);

const TenantCreatePage = lazy(() =>
  import("./pages/TenantCreatePage.js").then((m) => ({
    default: m.TenantCreatePage,
  })),
);

const TenantEditPage = lazy(() =>
  import("./pages/TenantEditPage.js").then((m) => ({
    default: m.TenantEditPage,
  })),
);

function TenantSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Skeleton variant="card" />}>{children}</Suspense>
  );
}

let shouldTriggerModuleRecoveryEmptyRender = true;

function E2eModuleBoundaryRecoveryPage() {
  return (
    <TenantSuspense>
      <TenantListPage />
    </TenantSuspense>
  );
}

/** Module root — handles internal sub-routing for the tenants module */
export function TenantRootPage() {
  const normalizedPathname =
    typeof window !== "undefined"
      ? window.location.pathname.replace(/\/+$/, "")
      : "";

  if (
    normalizedPathname.endsWith("/__e2e-error") &&
    shouldTriggerModuleRecoveryEmptyRender
  ) {
    shouldTriggerModuleRecoveryEmptyRender = false;
    return <></>;
  }

  return (
    <Routes>
      <Route
        index
        element={
          <TenantSuspense>
            <TenantListPage />
          </TenantSuspense>
        }
      />
      <Route
        path="detail/:id"
        element={
          <TenantSuspense>
            <TenantDetailPage />
          </TenantSuspense>
        }
      />
      <Route
        path="create"
        element={
          <TenantSuspense>
            <TenantCreatePage />
          </TenantSuspense>
        }
      />
      <Route
        path="edit/:id"
        element={
          <TenantSuspense>
            <TenantEditPage />
          </TenantSuspense>
        }
      />
      <Route path="__e2e-error" element={<E2eModuleBoundaryRecoveryPage />} />
    </Routes>
  );
}

export const routes = [
  {
    path: "/",
    element: (
      <TenantSuspense>
        <TenantListPage />
      </TenantSuspense>
    ),
  },
  {
    path: "/detail/:id",
    element: (
      <TenantSuspense>
        <TenantDetailPage />
      </TenantSuspense>
    ),
  },
  {
    path: "/create",
    element: (
      <TenantSuspense>
        <TenantCreatePage />
      </TenantSuspense>
    ),
  },
  {
    path: "/edit/:id",
    element: (
      <TenantSuspense>
        <TenantEditPage />
      </TenantSuspense>
    ),
  },
];
