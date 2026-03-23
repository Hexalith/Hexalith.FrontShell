import {
  MockCommandBus,
  MockQueryBus,
  MockSignalRHub,
} from "@hexalith/cqrs-client";

import {
  TENANT_DETAIL_QUERY,
  TENANT_LIST_QUERY,
  sampleTenantDetails,
  sampleTenants,
} from "../src/data/sampleData.js";

export const mockQueryBus = new MockQueryBus({ delay: 300 });
export const mockCommandBus = new MockCommandBus({
  delay: 500,
  defaultBehavior: "success",
});
export const mockSignalRHub = new MockSignalRHub();

// --- Configure query responses ---

// List query: returns all sample tenants
const listKey = `test-tenant:${TENANT_LIST_QUERY.domain}:${TENANT_LIST_QUERY.queryType}::`;
mockQueryBus.setResponse(listKey, sampleTenants);

// Detail queries: one response per tenant ID
for (const detail of sampleTenantDetails) {
  const detailKey = `test-tenant:${TENANT_DETAIL_QUERY.domain}:${TENANT_DETAIL_QUERY.queryType}:${detail.id}:`;
  mockQueryBus.setResponse(detailKey, detail);
}

console.log("[dev-host] Mock responses configured:", {
  listKey,
  detailKeys: sampleTenantDetails.map(
    (d) =>
      `test-tenant:${TENANT_DETAIL_QUERY.domain}:${TENANT_DETAIL_QUERY.queryType}:${d.id}:`,
  ),
});
