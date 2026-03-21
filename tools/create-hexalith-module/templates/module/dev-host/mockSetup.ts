import {
  MockCommandBus,
  MockQueryBus,
  MockSignalRHub,
} from "@hexalith/cqrs-client";

import {
  EXAMPLE_DETAIL_QUERY,
  EXAMPLE_LIST_QUERY,
  exampleDetails,
  exampleItems,
} from "../src/data/sampleData.js";

// Adjust delay values to simulate different network conditions.
// Set delay: 0 for fast tests, delay: 1000+ for slow network simulation.
export const mockQueryBus = new MockQueryBus({ delay: 300 });
export const mockCommandBus = new MockCommandBus({
  delay: 500,
  defaultBehavior: "success",
});
export const mockSignalRHub = new MockSignalRHub();

// --- Configure query responses ---

// List query: returns all 12 sample items
const listKey = `test-tenant:${EXAMPLE_LIST_QUERY.domain}:${EXAMPLE_LIST_QUERY.queryType}::`;
mockQueryBus.setResponse(listKey, exampleItems);

// Detail queries: one response per item ID
for (const detail of exampleDetails) {
  const detailKey = `test-tenant:${EXAMPLE_DETAIL_QUERY.domain}:${EXAMPLE_DETAIL_QUERY.queryType}:${detail.id}:`;
  mockQueryBus.setResponse(detailKey, detail);
}

console.log("[dev-host] Mock responses configured:", {
  listKey,
  detailKeys: exampleDetails.map(
    (d) =>
      `test-tenant:${EXAMPLE_DETAIL_QUERY.domain}:${EXAMPLE_DETAIL_QUERY.queryType}:${d.id}:`,
  ),
});
