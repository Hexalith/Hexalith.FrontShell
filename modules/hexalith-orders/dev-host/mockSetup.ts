import {
  MockCommandBus,
  MockQueryBus,
  MockSignalRHub,
} from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import {
  ORDER_DETAIL_QUERY,
  ORDER_LIST_QUERY,
  orderDetails,
  orderItems,
} from "../src/data/sampleData.js";

export const mockQueryBus = new MockQueryBus({ delay: 300 });
export const mockCommandBus = new MockCommandBus({
  delay: 500,
  defaultBehavior: "success",
});
export const mockSignalRHub = new MockSignalRHub();

// --- Configure query responses ---

const TENANT = createMockTenantContext().activeTenant;

// List query: returns all sample orders
const listKey = `${TENANT}:${ORDER_LIST_QUERY.domain}:${ORDER_LIST_QUERY.queryType}::`;
mockQueryBus.setResponse(listKey, orderItems);

// Detail queries: one response per order ID
for (const detail of orderDetails) {
  const detailKey = `${TENANT}:${ORDER_DETAIL_QUERY.domain}:${ORDER_DETAIL_QUERY.queryType}:${detail.id}:`;
  mockQueryBus.setResponse(detailKey, detail);
}
