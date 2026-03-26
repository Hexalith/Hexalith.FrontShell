# @hexalith/cqrs-client

CQRS frontend hooks and utilities for command/query communication with backends. Abstracts HTTP, SignalR, authentication, and correlation tracking.

## Hooks

| Hook | Purpose |
|------|---------|
| `useSubmitCommand` | Send commands to the backend |
| `useCommandPipeline` | Orchestrate multi-step command flows |
| `useCommandStatus` | Track command processing status |
| `useQuery` | Fetch projections with caching and ETag support |
| `useSignalRHub` | Manage SignalR connection lifecycle |
| `useProjectionSubscription` | Subscribe to real-time projection updates |
| `useConnectionState` | Monitor connection health |
| `useCanExecuteCommand` | Check command authorization |

## Usage

```tsx
import { useSubmitCommand, useQuery } from '@hexalith/cqrs-client';

// Submit a command
const { submit, status } = useSubmitCommand('CreateOrder');

// Query a projection
const { data, isLoading } = useQuery('orders', { tenantId });
```

## Testing

Import mock implementations for isolated testing:

```tsx
import { MockCommandBus, MockQueryBus } from '@hexalith/cqrs-client/testing';
```

## Structure

```
src/
├── core/           # Types, command/query bus interfaces
├── commands/       # useSubmitCommand, useCommandPipeline
├── queries/        # useQuery, QueryProvider, ETag caching
├── connection/     # ConnectionStateProvider
├── notifications/  # SignalRHub, SignalRProvider
├── validation/     # useCanExecute hooks
├── contracts/      # Interface definitions
└── mocks/          # Mock implementations for testing
```

## Scripts

```bash
pnpm build    # Build with tsup
pnpm test     # Unit tests (Vitest)
pnpm lint     # ESLint
```
