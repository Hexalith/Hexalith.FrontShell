import type { ModuleManifest } from "@hexalith/shell-api";

export const manifest: ModuleManifest = {
  manifestVersion: 1,
  name: "tenants",
  displayName: "Tenants",
  version: "0.1.0",
  routes: [
    { path: "/" },
    { path: "/detail/:id" },
    { path: "/create" },
  ],
  navigation: [
    {
      label: "Tenants",
      path: "/",
      icon: "building",
      category: "Administration",
    },
  ],
};
