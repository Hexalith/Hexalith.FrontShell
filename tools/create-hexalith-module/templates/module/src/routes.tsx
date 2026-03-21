import { lazy, Suspense } from "react";

import { Skeleton } from "@hexalith/ui";

// Code-split each page so the module only loads what the user navigates to
const ExampleListPage = lazy(() =>
  import("./pages/ExampleListPage.js").then((m) => ({
    default: m.ExampleListPage,
  })),
);

const ExampleDetailPage = lazy(() =>
  import("./pages/ExampleDetailPage.js").then((m) => ({
    default: m.ExampleDetailPage,
  })),
);

const ExampleCreatePage = lazy(() =>
  import("./pages/ExampleCreatePage.js").then((m) => ({
    default: m.ExampleCreatePage,
  })),
);

function ExampleSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Skeleton variant="card" />}>{children}</Suspense>
  );
}

/** Module root — renders the list page at the index route */
export function ExampleRootPage() {
  return (
    <ExampleSuspense>
      <ExampleListPage />
    </ExampleSuspense>
  );
}

export const routes = [
  {
    path: "/",
    element: (
      <ExampleSuspense>
        <ExampleListPage />
      </ExampleSuspense>
    ),
  },
  {
    path: "/:id",
    element: (
      <ExampleSuspense>
        <ExampleDetailPage />
      </ExampleSuspense>
    ),
  },
  {
    path: "/create",
    element: (
      <ExampleSuspense>
        <ExampleCreatePage />
      </ExampleSuspense>
    ),
  },
];
