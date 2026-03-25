import { beforeMount } from "@playwright/experimental-ct-react/hooks";

import {
  CqrsProvider,
  MockCommandBus,
  MockQueryBus,
  MockSignalRHub,
} from "@hexalith/cqrs-client";
import { MockShellProvider, createMockTenantContext } from "@hexalith/shell-api";
import { ToastProvider } from "@hexalith/ui";
import "@hexalith/ui/tokens.css";
import { MemoryRouter } from "react-router";

import {
  ORDER_DETAIL_QUERY,
  ORDER_LIST_QUERY,
  orderDetails,
  orderItems,
} from "../src/data/sampleData";

beforeMount(async ({ App }) => {
  document.body.style.backgroundColor = "var(--color-surface-primary)";
  document.body.style.color = "var(--color-text-primary)";

  const tenant = createMockTenantContext().activeTenant;
  const mockQueryBus = new MockQueryBus({ delay: 30 });

  mockQueryBus.setResponse(
    `${tenant}:${ORDER_LIST_QUERY.domain}:${ORDER_LIST_QUERY.queryType}::`,
    orderItems,
  );

  for (const detail of orderDetails) {
    mockQueryBus.setResponse(
      `${tenant}:${ORDER_DETAIL_QUERY.domain}:${ORDER_DETAIL_QUERY.queryType}:${detail.id}:`,
      detail,
    );
  }

  const mockCommandBus = new MockCommandBus({
    delay: 50,
    defaultBehavior: "success",
  });
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