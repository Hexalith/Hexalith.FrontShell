import { beforeMount } from "@playwright/experimental-ct-react/hooks";
import { MockShellProvider, createMockTenantContext } from "@hexalith/shell-api";
import { CqrsProvider } from "@hexalith/cqrs-client";
import { MockCommandBus, MockQueryBus, MockSignalRHub } from "@hexalith/cqrs-client";
import { ToastProvider } from "@hexalith/ui";
import { MemoryRouter } from "react-router";
import "@hexalith/ui/tokens.css";
import {
  exampleItems,
  exampleDetails,
  EXAMPLE_LIST_QUERY,
  EXAMPLE_DETAIL_QUERY,
} from "../src/data/sampleData";

beforeMount(async ({ App }) => {
  // Set body styles for correct axe-core contrast computation
  document.body.style.backgroundColor = "var(--color-surface-primary)";
  document.body.style.color = "var(--color-text-primary)";

  // Configure mock buses with sample data — build keys from query constants
  const TENANT = createMockTenantContext().activeTenant;
  const mockQueryBus = new MockQueryBus({ delay: 30 });
  mockQueryBus.setResponse(
    `${TENANT}:${EXAMPLE_LIST_QUERY.domain}:${EXAMPLE_LIST_QUERY.queryType}::`,
    exampleItems,
  );
  for (const detail of exampleDetails) {
    mockQueryBus.setResponse(
      `${TENANT}:${EXAMPLE_DETAIL_QUERY.domain}:${EXAMPLE_DETAIL_QUERY.queryType}:${detail.id}:`,
      detail,
    );
  }
  const mockCommandBus = new MockCommandBus({ delay: 50, defaultBehavior: "success" });
  const mockSignalRHub = new MockSignalRHub();

  return (
    <MockShellProvider>
      <CqrsProvider
        commandApiBaseUrl="http://localhost:mock"
        tokenGetter={async () => "dev-token"}
        signalRHub={mockSignalRHub}
        queryBus={mockQueryBus}
        commandBus={mockCommandBus}
      >
        <ToastProvider>
          <MemoryRouter>
            <App />
          </MemoryRouter>
        </ToastProvider>
      </CqrsProvider>
    </MockShellProvider>
  );
});
