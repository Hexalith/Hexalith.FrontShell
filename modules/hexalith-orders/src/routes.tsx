import { lazy, Suspense } from "react";

import { Skeleton } from "@hexalith/ui";

const OrderListPage = lazy(() =>
  import("./pages/OrderListPage.js").then((m) => ({
    default: m.OrderListPage,
  })),
);

const OrderDetailPage = lazy(() =>
  import("./pages/OrderDetailPage.js").then((m) => ({
    default: m.OrderDetailPage,
  })),
);

const OrderCreatePage = lazy(() =>
  import("./pages/OrderCreatePage.js").then((m) => ({
    default: m.OrderCreatePage,
  })),
);

const OrderEditPage = lazy(() =>
  import("./pages/OrderEditPage.js").then((m) => ({
    default: m.OrderEditPage,
  })),
);

function OrderSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Skeleton variant="card" />}>{children}</Suspense>
  );
}

/** Module root — renders the list page at the index route */
export function OrderRootPage() {
  return (
    <OrderSuspense>
      <OrderListPage />
    </OrderSuspense>
  );
}

export const routes = [
  {
    path: "/",
    element: (
      <OrderSuspense>
        <OrderListPage />
      </OrderSuspense>
    ),
  },
  {
    path: "/detail/:id",
    element: (
      <OrderSuspense>
        <OrderDetailPage />
      </OrderSuspense>
    ),
  },
  {
    path: "/create",
    element: (
      <OrderSuspense>
        <OrderCreatePage />
      </OrderSuspense>
    ),
  },
  {
    path: "/edit/:id",
    element: (
      <OrderSuspense>
        <OrderEditPage />
      </OrderSuspense>
    ),
  },
];
