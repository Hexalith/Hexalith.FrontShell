import type { RegisteredModule } from "./registry";

export interface SidebarNavigationItem {
  label: string;
  to: string;
  icon?: string;
  category: string;
}

/**
 * Generates sidebar navigation items from registered module manifests.
 * Paths are prefixed with the module's basePath.
 */
export function buildNavigationItems(
  registeredModules: RegisteredModule[],
): SidebarNavigationItem[] {
  return registeredModules.flatMap((mod) =>
    mod.manifest.navigation.map((item) => ({
      label: item.label,
      to:
        item.path === "/"
          ? `/${mod.basePath}`
          : `/${mod.basePath}${item.path}`,
      icon: item.icon,
      category: item.category ?? "Modules",
    })),
  );
}
