import React from "react";
import { NavLink } from "react-router";

import { getSidebarNavigationItems } from "../modules/placeholderModules";

import styles from "./Sidebar.module.css";

export function Sidebar(): React.JSX.Element {
  const moduleItems = getSidebarNavigationItems();
  const groupedItems = Map.groupBy(moduleItems, (item) => item.category);

  return (
    <div className={styles.sidebar}>
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `${styles.navLink}${isActive ? ` ${styles.active}` : ""}`
        }
      >
        <span className={styles.navText}>Home</span>
      </NavLink>

      {[...groupedItems.entries()].map(([category, items]) => (
        <section key={category} className={styles.group} aria-label={category}>
          <h2 className={styles.groupLabel}>{category}</h2>
          {items?.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `${styles.navLink}${isActive ? ` ${styles.active}` : ""}`
              }
            >
              {item.icon ? (
                <span className={styles.icon} aria-hidden="true">
                  {item.icon}
                </span>
              ) : null}
              <span className={styles.navText}>{item.label}</span>
            </NavLink>
          ))}
        </section>
      ))}
    </div>
  );
}
