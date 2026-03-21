import React from "react";
import { useNavigate } from "react-router";

import { Sidebar as UiSidebar } from "@hexalith/ui";
import type { NavigationItem } from "@hexalith/ui";

import { useActiveModule } from "../hooks/useActiveModule";
import { modules, buildNavigationItems } from "../modules";

interface SidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (isCollapsed: boolean) => void;
}

const HOME_ITEM: NavigationItem = {
  id: "/",
  label: "Home",
  href: "/",
  icon: undefined,
};

export function Sidebar({
  isCollapsed,
  onCollapsedChange,
}: SidebarProps): React.JSX.Element {
  const navigate = useNavigate();
  const { activeModule } = useActiveModule();

  const moduleNavItems = React.useMemo(() => {
    const moduleItems = buildNavigationItems(modules);
    return moduleItems.map<NavigationItem>((item) => ({
      id: item.to,
      label: item.label,
      icon: item.icon,
      href: item.to,
      category: item.category,
    }));
  }, []);

  const navigationItems = React.useMemo<NavigationItem[]>(
    () => [HOME_ITEM, ...moduleNavItems],
    [moduleNavItems],
  );

  const hasModuleItems = moduleNavItems.length > 0;

  const activeItemId = activeModule
    ? `/${activeModule.basePath}`
    : "/";

  const handleNavigation = React.useCallback(
    (item: NavigationItem) => {
      navigate(item.href);
    },
    [navigate],
  );

  return (
    <UiSidebar
      items={navigationItems}
      activeItemId={activeItemId}
      onItemClick={handleNavigation}
      isSearchable={hasModuleItems}
      isCollapsed={isCollapsed}
      onCollapsedChange={onCollapsedChange}
    />
  );
}
