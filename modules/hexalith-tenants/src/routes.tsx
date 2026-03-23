import { lazy, Suspense } from "react";

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

function TenantSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Skeleton variant="card" />}>{children}</Suspense>
  );
}

/** Module root — renders the list page at the index route */
export function TenantRootPage() {
  return (
    <TenantSuspense>
      <TenantListPage />
    </TenantSuspense>
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
];
