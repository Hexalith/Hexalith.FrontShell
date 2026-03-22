import type { ReactNode } from "react";

import { useQueryClient } from "@hexalith/cqrs-client";

import { scrollManager } from "./ScrollRestoration";
import { useVersionCheck } from "./useVersionCheck";

export function VersionGuard({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const { etagCache } = useQueryClient();
  useVersionCheck(etagCache, scrollManager);
  return children;
}
