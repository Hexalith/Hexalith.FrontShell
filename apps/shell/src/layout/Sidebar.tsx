import React from "react";
import { NavLink } from "react-router";

import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  { label: "Home", path: "/" },
  { label: "Tenants", path: "/tenants" },
];

export function Sidebar(): React.JSX.Element {
  return (
    <div className={styles.sidebar}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === "/"}
          className={({ isActive }) =>
            `${styles.navLink}${isActive ? ` ${styles.active}` : ""}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
