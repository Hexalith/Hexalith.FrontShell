import type { ModuleManifest } from "@hexalith/shell-api";

/**
 * Module manifest for __MODULE_DISPLAY_NAME__.
 *
 * The manifest declares the module's identity, routes, and navigation entries
 * to the shell. The shell reads this at composition time to wire routing and
 * build the sidebar/navigation.
 */
export const manifest: ModuleManifest = {
  /** Schema version — always 1 for now. */
  manifestVersion: 1,

  /** Unique kebab-case identifier used in route prefixes and internal lookups. */
  name: "__MODULE_NAME__",

  /** Human-readable label shown in navigation and page titles. */
  displayName: "__MODULE_DISPLAY_NAME__",

  /** SemVer string; updated on each release. */
  version: "0.1.0",

  /** Route definitions — each `path` is relative to the module's mount point. */
  routes: [
    { path: "/" },
    { path: "/:id" },
    { path: "/create" },
  ],

  /** Sidebar / top-nav entries. `path` must match a declared route. */
  navigation: [{ label: "__MODULE_DISPLAY_NAME__", path: "/" }],
};
