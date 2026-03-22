import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

import { createScrollManager } from "./scrollManager";

const scrollManager = createScrollManager();

export { scrollManager };

export function ScrollRestoration(): null {
  const { pathname } = useLocation();
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    previousPathnameRef.current = pathname;
    scrollManager.restore(pathname);

    return () => {
      scrollManager.save(pathname);
    };
  }, [pathname]);

  return null;
}
