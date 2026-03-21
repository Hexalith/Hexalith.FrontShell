import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import clsx from 'clsx';

import styles from './Sidebar.module.css';
import { Tooltip } from '../overlay/Tooltip';

function getResponsiveCollapsed(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(max-width: 1279px)').matches;
}

function useResponsiveCollapsed(): boolean {
  const [responsiveCollapsed, setResponsiveCollapsed] = useState(
    getResponsiveCollapsed,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(max-width: 1279px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setResponsiveCollapsed(event.matches);
    };

    setResponsiveCollapsed(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  return responsiveCollapsed;
}

export interface NavigationItem {
  /** Unique identifier (e.g., module name) */
  id: string;
  /** Display name from manifest */
  label: string;
  /** Module icon (inline SVG or React element) */
  icon?: React.ReactNode;
  /** Route path (e.g., '/orders') */
  href: string;
  /** Category for sidebar grouping */
  category?: string;
}

export interface SidebarProps {
  /** Module navigation items */
  items: NavigationItem[];
  /** Currently active item ID */
  activeItemId?: string;
  /** Navigation handler */
  onItemClick?: (item: NavigationItem) => void;
  /** Controlled collapsed state — defaults to false */
  isCollapsed?: boolean;
  /** Collapse toggle callback */
  onCollapsedChange?: (isCollapsed: boolean) => void;
  /** Show search field — defaults to true */
  isSearchable?: boolean;
  /** Custom header content (logo, app name) */
  header?: React.ReactNode;
  /** Custom footer content (user info, settings) */
  footer?: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

interface CategoryGroup {
  name: string;
  items: NavigationItem[];
}

function groupItems(items: NavigationItem[]): {
  uncategorized: NavigationItem[];
  groups: CategoryGroup[];
} {
  const uncategorized: NavigationItem[] = [];
  const groupMap = new Map<string, NavigationItem[]>();

  for (const item of items) {
    if (!item.category) {
      uncategorized.push(item);
    } else {
      const existing = groupMap.get(item.category);
      if (existing) {
        existing.push(item);
      } else {
        groupMap.set(item.category, [item]);
      }
    }
  }

  const groups: CategoryGroup[] = [];
  for (const [name, groupItems] of groupMap) {
    groups.push({ name, items: groupItems });
  }

  return { uncategorized, groups };
}

const CollapseChevron = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M10 12L6 8L10 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GroupChevron = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path
      d="M3 4.5L6 7.5L9 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  (
    {
      items,
      activeItemId,
      onItemClick,
      isCollapsed,
      onCollapsedChange,
      isSearchable = true,
      header,
      footer,
      className,
    },
    ref,
  ) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const responsiveCollapsed = useResponsiveCollapsed();
    const [internalIsCollapsed, setInternalIsCollapsed] = useState(
      responsiveCollapsed,
    );
    const searchRef = useRef<HTMLInputElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const effectiveIsCollapsed = isCollapsed ?? internalIsCollapsed;

    useEffect(() => {
      if (isCollapsed === undefined) {
        setInternalIsCollapsed(responsiveCollapsed);
      }
    }, [isCollapsed, responsiveCollapsed]);

    // Focus management: move focus to toggle when collapsing hides search
    useEffect(() => {
      if (effectiveIsCollapsed && document.activeElement === searchRef.current) {
        toggleRef.current?.focus();
      }
    }, [effectiveIsCollapsed]);

    // Clear search when collapsing
    useEffect(() => {
      if (effectiveIsCollapsed) {
        setSearchTerm('');
      }
    }, [effectiveIsCollapsed]);

    const filteredItems = useMemo(() => {
      if (!searchTerm) return items;
      const lower = searchTerm.toLowerCase();
      return items.filter((item) => item.label.toLowerCase().includes(lower));
    }, [items, searchTerm]);

    const { uncategorized, groups } = useMemo(
      () => groupItems(filteredItems),
      [filteredItems],
    );

    const isSearching = searchTerm.length > 0;

    const handleCollapsedChange = (nextIsCollapsed: boolean) => {
      if (isCollapsed === undefined) {
        setInternalIsCollapsed(nextIsCollapsed);
      }

      onCollapsedChange?.(nextIsCollapsed);
    };

    const handleGroupOpenChange = (groupName: string, isOpen: boolean) => {
      setOpenGroups((current) => ({
        ...current,
        [groupName]: isOpen,
      }));
    };

    const renderItem = (item: NavigationItem) => {
      const isActive = item.id === activeItemId;
      const fallbackIcon = item.label.trim().charAt(0).toUpperCase();
      const link = (
        <a
          href={item.href}
          className={styles.item}
          aria-current={isActive ? 'page' : undefined}
          data-active={isActive || undefined}
          onClick={(e) => {
            e.preventDefault();
            onItemClick?.(item);
          }}
        >
          {(item.icon || effectiveIsCollapsed) && (
            <span className={styles.itemIcon}>{item.icon ?? fallbackIcon}</span>
          )}
          {!effectiveIsCollapsed && <span className={styles.itemLabel}>{item.label}</span>}
        </a>
      );

      return effectiveIsCollapsed ? (
        <Tooltip content={item.label} side="right">
          {link}
        </Tooltip>
      ) : (
        link
      );
    };

    return (
      <nav
        ref={ref}
        className={clsx(styles.root, className)}
        data-collapsed={effectiveIsCollapsed || undefined}
      >
        {/* Header area */}
        <div className={styles.header}>
          {header && <div className={styles.headerContent}>{header}</div>}
          <button
            ref={toggleRef}
            type="button"
            className={styles.collapseToggle}
            onClick={() => handleCollapsedChange(!effectiveIsCollapsed)}
            aria-label={effectiveIsCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className={styles.collapseIcon}>
              <CollapseChevron />
            </span>
          </button>
        </div>

        {/* Search field (expanded mode only) */}
        {isSearchable && !effectiveIsCollapsed && items.length > 0 && (
          <div className={styles.searchContainer}>
            <input
              ref={searchRef}
              className={styles.searchInput}
              type="search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchTerm('');
              }}
              aria-label="Filter navigation"
            />
          </div>
        )}

        {/* Navigation items */}
        {items.length > 0 ? (
          <div className={styles.navArea}>
            <ul className={styles.list} role="list">
              {/* Uncategorized items first */}
              {uncategorized.map((item) => (
                <li key={item.id}>{renderItem(item)}</li>
              ))}

              {/* Categorized groups */}
              {groups.map(
                (cat) =>
                  cat.items.length > 0 && (
                    <li key={cat.name} className={styles.group}>
                      <Collapsible.Root
                        open={isSearching ? true : openGroups[cat.name] ?? true}
                        onOpenChange={(isOpen) =>
                          handleGroupOpenChange(cat.name, isOpen)
                        }
                      >
                        {!effectiveIsCollapsed && (
                          <Collapsible.Trigger className={styles.groupHeader}>
                            <span>{cat.name}</span>
                            <span className={styles.groupChevron}>
                              <GroupChevron />
                            </span>
                          </Collapsible.Trigger>
                        )}
                        <Collapsible.Content className={styles.groupContent}>
                          <ul className={styles.list} role="list">
                            {cat.items.map((item) => (
                              <li key={item.id}>{renderItem(item)}</li>
                            ))}
                          </ul>
                        </Collapsible.Content>
                      </Collapsible.Root>
                    </li>
                  ),
              )}

              {/* No results message */}
              {filteredItems.length === 0 && searchTerm && (
                <li className={styles.noResults}>No results</li>
              )}
            </ul>
          </div>
        ) : null}

        {/* Footer area */}
        {footer && <div className={styles.footer}>{footer}</div>}
      </nav>
    );
  },
);

Sidebar.displayName = 'Sidebar';
