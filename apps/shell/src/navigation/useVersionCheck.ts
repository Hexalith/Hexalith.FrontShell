import { useEffect, useRef } from "react";

import type { ETagCache } from "@hexalith/cqrs-client";

import { checkVersionMismatch, recordCurrentVersion } from "./versionCheck";

import type { ScrollManager } from "./scrollManager";

export function useVersionCheck(
  etagCache: ETagCache,
  scrollManager: ScrollManager,
): void {
  const didRunRef = useRef(false);

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    if (checkVersionMismatch()) {
      etagCache.clear();
      scrollManager.clear();
      recordCurrentVersion();
    } else {
      recordCurrentVersion();
    }
  }, [etagCache, scrollManager]);
}
