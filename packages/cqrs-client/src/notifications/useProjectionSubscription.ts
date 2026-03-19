import { useContext, useEffect, useRef } from "react";

import { SignalRContext } from "./SignalRProvider";
import { useQueryClient } from "../queries/QueryProvider";

const MAX_GROUPS = 50;

/** Module-level ref counting and debounce state shared across all hook instances. */
const refCounts = new Map<string, number>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function groupKey(projectionType: string, tenantId: string): string {
  return `${projectionType}:${tenantId}`;
}

/** @internal Reset module-level state for testing. */
export function _resetSubscriptionState(): void {
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  refCounts.clear();
  debounceTimers.clear();
}

/**
 * Subscribes to real-time projection change notifications via SignalR.
 *
 * If no `SignalRProvider` is in the tree, this hook is a no-op —
 * queries continue via polling without errors.
 */
export function useProjectionSubscription(
  projectionType: string,
  tenantId: string,
): void {
  const hub = useContext(SignalRContext);
  const { notifyDomainInvalidation } = useQueryClient();
  const keyRef = useRef(groupKey(projectionType, tenantId));
  keyRef.current = groupKey(projectionType, tenantId);

  useEffect(() => {
    if (!hub) return;

    const key = groupKey(projectionType, tenantId);

    // Cancel any pending debounced LeaveGroup for this key
    const pendingTimer = debounceTimers.get(key);
    if (pendingTimer !== undefined) {
      clearTimeout(pendingTimer);
      debounceTimers.delete(key);
    }

    const prevCount = refCounts.get(key) ?? 0;
    refCounts.set(key, prevCount + 1);

    // Only invoke JoinGroup when count goes 0 → 1
    if (prevCount === 0) {
      const totalGroups = refCounts.size;
      if (totalGroups > MAX_GROUPS) {
        console.warn(
          `[useProjectionSubscription] Max group limit (${MAX_GROUPS}) exceeded. ` +
            `Projection "${projectionType}" for tenant "${tenantId}" will use polling only.`,
        );
        // Remove from refCounts since we didn't actually join
        refCounts.delete(key);
        return;
      }
      hub.joinGroup(projectionType, tenantId);
    }

    // Listen for projection changes matching this subscription
    const unsubscribe = hub.onProjectionChanged(
      (changedProjection, changedTenant) => {
        if (
          changedProjection === projectionType &&
          changedTenant === tenantId
        ) {
          notifyDomainInvalidation(projectionType, tenantId);
        }
      },
    );

    return () => {
      unsubscribe();

      const currentCount = refCounts.get(key);
      if (currentCount === undefined) return;

      const newCount = currentCount - 1;
      if (newCount <= 0) {
        refCounts.delete(key);
        // Debounce LeaveGroup to handle React StrictMode mount/unmount/mount cycles
        const timer = setTimeout(() => {
          debounceTimers.delete(key);
          // Only leave if no one re-joined during the debounce window
          if (!refCounts.has(key)) {
            hub.leaveGroup(projectionType, tenantId);
          }
        }, 50);
        debounceTimers.set(key, timer);
      } else {
        refCounts.set(key, newCount);
      }
    };
  }, [hub, projectionType, tenantId, notifyDomainInvalidation]);
}
