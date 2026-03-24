# Test Fixture APIs

Source: `packages/cqrs-client/src/mocks/` and `packages/shell-api/src/testing/`

## MockCommandBus

Implements `ICommandBus`. Simulates async command submission with configurable behavior.

Source: `packages/cqrs-client/src/mocks/MockCommandBus.ts`

```typescript
import { MockCommandBus } from '@hexalith/cqrs-client';

interface MockCommandBusConfig {
  delay?: number;  // Simulated async delay in ms. Default: 50. Must be > 0.
  defaultBehavior?: 'success' | 'reject' | 'timeout' | 'publishFail'; // Default: 'success'
}

type MockSendBehavior =
  | { type: 'success' }
  | { type: 'reject'; rejectionEventType: string }
  | { type: 'timeout'; duration?: string }
  | { type: 'publishFail'; failureReason?: string }
  | { type: 'error'; error: Error };
```

### Key Methods

| Method | Description |
|--------|-------------|
| `constructor(config?)` | Create with optional delay and default behavior |
| `send(command)` | Submit a command. Returns `{ correlationId }` on success, throws on failure. |
| `configureNextSend(behavior)` | Enqueue a behavior for the next `send()` call (FIFO queue). |
| `getCalls()` | Returns full call history for assertions. |
| `getLastCall()` | Returns the most recent call, or undefined. |
| `reset()` | Clears call history AND behavior queue. |

### Usage

```typescript
const bus = new MockCommandBus({ delay: 10 });

// Default: success
const response = await bus.send({ tenant: 't1', domain: 'orders', aggregateId: '1', commandType: 'Create', payload: {} });
// response.correlationId is a generated UUID

// Configure specific behavior for next call
bus.configureNextSend({ type: 'reject', rejectionEventType: 'OrderLimitExceeded' });
await bus.send(command); // throws CommandRejectedError

// FIFO queue: configure multiple behaviors in sequence
bus.configureNextSend({ type: 'success' });
bus.configureNextSend({ type: 'timeout', duration: 'PT30S' });
// First send() succeeds, second send() throws CommandTimeoutError
```

---

## MockQueryBus

Implements `IQueryBus`. Returns pre-configured responses with Zod validation.

Source: `packages/cqrs-client/src/mocks/MockQueryBus.ts`

```typescript
import { MockQueryBus } from '@hexalith/cqrs-client';

interface MockQueryBusConfig {
  delay?: number;  // Simulated async delay in ms. Default: 30. Must be > 0.
}
```

### Key Methods

| Method | Description |
|--------|-------------|
| `constructor(config?)` | Create with optional delay |
| `query<T>(request, schema)` | Query for data. Validates response against Zod schema. |
| `setResponse(key, data)` | Configure response for a key. Key format: `tenant:domain:queryType:aggregateId:entityId` |
| `setError(key, error)` | Configure error for a key |
| `clearResponses()` | Clear all configured responses and errors |
| `getCalls()` | Returns full call history |
| `getLastCall()` | Returns most recent call |
| `reset()` | Clears call history, responses, and errors |

### Usage

```typescript
const bus = new MockQueryBus({ delay: 10 });

// Configure response (key = tenant:domain:queryType:aggregateId:entityId)
bus.setResponse('test-tenant:orders:OrderList::', [
  { id: '1', name: 'Order 1', status: 'active' },
]);

// Query returns configured data after Zod validation
const result = await bus.query(
  { tenant: 'test-tenant', domain: 'orders', queryType: 'OrderList', aggregateId: '' },
  OrderListSchema,
);

// Throws ApiError(404) if no response configured for key
// Throws ValidationError if data doesn't match schema
```

---

## MockSignalRHub

Implements `ISignalRHub`. Simulates real-time projection change notifications.

Source: `packages/cqrs-client/src/mocks/MockSignalRHub.ts`

```typescript
import { MockSignalRHub } from '@hexalith/cqrs-client';

type SignalRConnectionState = 'connected' | 'disconnected' | 'reconnecting';
```

### Key Methods

| Method | Description |
|--------|-------------|
| `joinGroup(projectionType, tenantId)` | Subscribe to projection changes |
| `leaveGroup(projectionType, tenantId)` | Unsubscribe from projection changes |
| `onProjectionChanged(listener)` | Register listener. Returns unsubscribe function. |
| `connectionState` | Read-only current state |
| `emitProjectionChanged(projectionType, tenantId)` | **Test control:** Trigger projection change |
| `simulateDisconnect()` | **Test control:** Simulate connection loss |
| `simulateReconnect()` | **Test control:** Simulate reconnection (reconnecting → connected) |
| `getJoinedGroups()` | Read-only list of currently joined groups |
| `reset()` | Clear all state |

---

## MockShellProvider

Wraps all shell context providers for tests and Storybook. Single import.

Source: `packages/shell-api/src/testing/MockShellProvider.tsx`

```typescript
import { MockShellProvider } from '@hexalith/shell-api';

interface MockShellProviderProps {
  authContext?: AuthContextValue;
  tenantContext?: TenantContextValue;
  connectionHealthContext?: ConnectionHealthContextValue;
  formDirtyContext?: FormDirtyContextValue;
  theme?: 'light' | 'dark';
  locale?: string;         // Default: 'en-US'
  defaultCurrency?: string; // Default: 'USD'
  children: ReactNode;
}
```

Wraps components in the correct provider nesting order: Auth → Tenant → ConnectionHealth → FormDirty → Theme → Locale.

### Usage in Tests

```tsx
import { render } from '@testing-library/react';
import { MockShellProvider } from '@hexalith/shell-api';

render(
  <MockShellProvider>
    <MyComponent />
  </MockShellProvider>,
);
```

---

## Context Factory Functions

### createMockAuthContext

```typescript
import { createMockAuthContext } from '@hexalith/shell-api';

// Default: authenticated user
createMockAuthContext();
// { user: { sub: 'test-user', tenantClaims: ['test-tenant'], name: 'Test User', email: 'test@test.com' },
//   isAuthenticated: true, isLoading: false, error: null, signinRedirect: fn, signoutRedirect: fn }

// Unauthenticated
createMockAuthContext({ isAuthenticated: false, user: null });

// Expired session
createMockAuthContext({ error: new Error('Session expired') });
```

### createMockTenantContext

```typescript
import { createMockTenantContext } from '@hexalith/shell-api';

// Default: single tenant
createMockTenantContext();
// { activeTenant: 'test-tenant', availableTenants: ['test-tenant'], switchTenant: fn }

// Multi-tenant
createMockTenantContext({
  activeTenant: 'tenant-a',
  availableTenants: ['tenant-a', 'tenant-b', 'tenant-c'],
});
```

### createMockConnectionHealthContext

```typescript
import { createMockConnectionHealthContext } from '@hexalith/shell-api';

// Default: connected
createMockConnectionHealthContext();
// { health: 'connected', lastChecked: Date, checkNow: fn }

// Disconnected
createMockConnectionHealthContext({ health: 'disconnected' });
```

### createMockFormDirtyContext

```typescript
import { createMockFormDirtyContext } from '@hexalith/shell-api';

// Default: clean
createMockFormDirtyContext();
// { isDirty: false, setDirty: fn, dirtyFormId: null, setDirtyFormId: fn }

// Dirty form
createMockFormDirtyContext({ isDirty: true, dirtyFormId: 'order-form' });
```

---

## Complete Test Setup Example

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';

import { MockShellProvider } from '@hexalith/shell-api';
import { CqrsProvider } from '@hexalith/cqrs-client';

import { OrderListPage } from './OrderListPage';

// AC: 7-1#1
describe('OrderListPage', () => {
  it('renders order table when data is available', async () => {
    render(
      <MemoryRouter>
        <MockShellProvider>
          <CqrsProvider /* mock bus config */>
            <OrderListPage />
          </CqrsProvider>
        </MockShellProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  it('shows empty state when no orders exist', async () => {
    render(
      <MemoryRouter>
        <MockShellProvider>
          <CqrsProvider /* mock bus with empty response */>
            <OrderListPage />
          </CqrsProvider>
        </MockShellProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('No orders')).toBeInTheDocument();
    });
  });
});
```

### AC Marker Convention

Add `// AC: story-id#criterion` at file level to trace test files back to acceptance criteria:

```typescript
// AC: 7-1#1
describe('ModuleManifest validation', () => { ... });
```

See `docs/testing-strategy.md` for full testing conventions, test pyramid ratios, and contract testing approach.
