import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import type { RenderOptions, RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import {
  CqrsProvider,
  MockCommandBus,
  MockQueryBus,
  MockSignalRHub,
} from "@hexalith/cqrs-client";
import { MockShellProvider, createMockTenantContext } from "@hexalith/shell-api";
import { ToastProvider } from "@hexalith/ui";

import {
  EXAMPLE_DETAIL_QUERY,
  EXAMPLE_LIST_QUERY,
  exampleDetails,
  exampleItems,
} from "../data/sampleData.js";

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  initialRoute?: string;
  queryBus?: MockQueryBus;
  commandBus?: MockCommandBus;
}

function createConfiguredQueryBus(): MockQueryBus {
  const mockQueryBus = new MockQueryBus({ delay: 30 });

  // Derive tenant from MockShellProvider defaults to stay resilient to changes
  const TENANT = createMockTenantContext().activeTenant;

  // Build keys from query constants to prevent manual string typos
  const listKey = `${TENANT}:${EXAMPLE_LIST_QUERY.domain}:${EXAMPLE_LIST_QUERY.queryType}::`;
  mockQueryBus.setResponse(listKey, exampleItems);

  for (const detail of exampleDetails) {
    const detailKey = `${TENANT}:${EXAMPLE_DETAIL_QUERY.domain}:${EXAMPLE_DETAIL_QUERY.queryType}:${detail.id}:`;
    mockQueryBus.setResponse(detailKey, detail);
  }

  return mockQueryBus;
}

function createConfiguredCommandBus(): MockCommandBus {
  return new MockCommandBus({ delay: 50, defaultBehavior: "success" });
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderResult & { queryBus: MockQueryBus; commandBus: MockCommandBus } {
  const {
    initialRoute = "/",
    queryBus = createConfiguredQueryBus(),
    commandBus = createConfiguredCommandBus(),
    ...renderOptions
  } = options;

  const mockSignalRHub = new MockSignalRHub();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MockShellProvider>
        <CqrsProvider
          commandApiBaseUrl="http://localhost:mock"
          tokenGetter={async () => "dev-token"}
          signalRHub={mockSignalRHub}
          queryBus={queryBus}
          commandBus={commandBus}
        >
          <ToastProvider>
            <MemoryRouter initialEntries={[initialRoute]}>
              {children}
            </MemoryRouter>
          </ToastProvider>
        </CqrsProvider>
      </MockShellProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryBus,
    commandBus,
  };
}
