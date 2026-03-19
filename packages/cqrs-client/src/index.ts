// Types
export type {
  CommandStatus,
  CommandStatusResponse,
  ProblemDetails,
  PreflightValidationResult,
  SubmitCommandRequest,
  SubmitCommandResponse,
  SubmitQueryRequest,
  SubmitQueryResponse,
  ValidateCommandRequest,
} from "./core/types";

// Interfaces
export type { ICommandBus } from "./core/ICommandBus";
export type { IQueryBus } from "./core/IQueryBus";

// Errors
export {
  ApiError,
  AuthError,
  CommandRejectedError,
  CommandTimeoutError,
  ForbiddenError,
  HexalithError,
  RateLimitError,
  ValidationError,
} from "./errors";

// Utilities
export {
  CORRELATION_ID_HEADER,
  generateCorrelationId,
} from "./core/correlationId";
export { parseProblemDetails } from "./core/problemDetails";

// Provider (package-level — serves commands + queries)
export { CqrsProvider, useCqrs } from "./CqrsProvider";
export type { CqrsProviderProps } from "./CqrsProvider";

// Command types (shared)
export type { PipelineStatus, SubmitCommandInput } from "./commands/types";

// Command hooks
export { useSubmitCommand } from "./commands/useSubmitCommand";
export { useCommandStatus } from "./commands/useCommandStatus";
export { useCommandPipeline } from "./commands/useCommandPipeline";

// Command event bus types
export type {
  CommandCompletedEvent,
  CommandEventBus,
} from "./commands/commandEventBus";

// Connection state
export { useConnectionState } from "./connection/ConnectionStateProvider";
export type {
  ConnectionState,
  TransportType,
} from "./connection/ConnectionStateProvider";

// Queries
export { useQuery } from "./queries/useQuery";
export { QueryProvider } from "./queries/QueryProvider";
export type {
  QueryParams,
  QueryOptions,
  UseQueryResult,
} from "./queries/useQuery";

// SignalR / real-time notifications
export { SignalRHub } from "./notifications/SignalRHub";
export { SignalRProvider, useSignalRHub } from "./notifications/SignalRProvider";
export { useProjectionSubscription } from "./notifications/useProjectionSubscription";
export type { SignalRProviderProps } from "./notifications/SignalRProvider";

// Mock implementations (platform capabilities — FR14, FR15)
export { MockCommandBus } from "./mocks/MockCommandBus";
export type {
  MockCommandBusConfig,
  MockSendBehavior,
} from "./mocks/MockCommandBus";
export { MockQueryBus } from "./mocks/MockQueryBus";
export type { MockQueryBusConfig } from "./mocks/MockQueryBus";
export { MockSignalRHub } from "./mocks/MockSignalRHub";
export type { ISignalRHub } from "./mocks/MockSignalRHub";
