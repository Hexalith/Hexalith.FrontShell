import type { ModuleManifest } from "@hexalith/shell-api";

export const manifest: ModuleManifest = {
  manifestVersion: 1,
  name: "orders",
  displayName: "Orders",
  version: "0.1.0",
  routes: [
    { path: "/" },
    { path: "/detail/:id" },
    { path: "/create" },
    { path: "/edit/:id" },
  ],
  navigation: [
    {
      label: "Orders",
      path: "/",
      icon: "package",
      category: "Modules",
    },
  ],
};
