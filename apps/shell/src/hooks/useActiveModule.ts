import { useMemo } from "react";
import { useLocation } from "react-router";

import { modules } from "../modules";
import type { RegisteredModule } from "../modules";

interface ActiveModuleResult {
  activeModule: RegisteredModule | undefined;
  activeModuleName: string;
}

export function useActiveModule(): ActiveModuleResult {
  const { pathname } = useLocation();

  return useMemo(() => {
    const activeModule = modules.find(
      (m) =>
        pathname === `/${m.basePath}` ||
        pathname.startsWith(`/${m.basePath}/`),
    );

    return {
      activeModule,
      activeModuleName: activeModule?.manifest.displayName ?? "Welcome",
    };
  }, [pathname, modules]);
}
