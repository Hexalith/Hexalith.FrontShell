import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

import type { ModuleManifest } from "@hexalith/shell-api";
import { Skeleton } from "@hexalith/ui";

const TenantsPlaceholderPage = lazy(() =>
  import("../pages/TenantsPlaceholderPage").then((m) => ({
    default: m.TenantsPlaceholderPage,
  })),
);

function PlaceholderModuleSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Skeleton variant="card" />}>{children}</Suspense>;
}

export interface RegisteredPlaceholderModule {
  basePath: string;
  manifest: ModuleManifest;
}

export const placeholderModules: RegisteredPlaceholderModule[] = [
  {
    basePath: "tenants",
    manifest: {
      manifestVersion: 1,
      name: "tenants",
      displayName: "Tenants",
      version: "0.1.0",
      routes: [{ path: "/" }],
      navigation: [
        {
          label: "Tenants",
          path: "/",
          icon: "users",
          category: "Modules",
        },
      ],
    },
  },
];

export interface SidebarNavigationItem {
  label: string;
  to: string;
  icon?: string;
  category: string;
}

export function getSidebarNavigationItems(): SidebarNavigationItem[] {
  return placeholderModules.flatMap((module) =>
    module.manifest.navigation.map((item) => ({
      label: item.label,
      to: item.path === "/" ? `/${module.basePath}` : `/${module.basePath}${item.path}`,
      icon: item.icon,
      category: item.category ?? "Modules",
    })),
  );
}

export function getModuleRoutes() {
  return placeholderModules.flatMap((module) =>
    module.manifest.routes.map((route) => ({
      path:
        route.path === "/"
          ? module.basePath
          : `${module.basePath}${route.path}`,
      element: (
        <PlaceholderModuleSuspense>
          <TenantsPlaceholderPage />
        </PlaceholderModuleSuspense>
      ),
    })),
  );
}