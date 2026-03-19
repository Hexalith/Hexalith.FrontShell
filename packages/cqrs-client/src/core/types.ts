/**
 * Backend API payload types for CQRS communication.
 * All fields match backend JSON shapes exactly (camelCase).
 */

// Command Status — 8-state union matching backend exactly
export type CommandStatus =
  | "Received"
  | "Processing"
  | "EventsStored"
  | "EventsPublished"
  | "Completed"
  | "Rejected"
  | "PublishFailed"
  | "TimedOut";

// Command submission
export interface SubmitCommandRequest {
  tenant: string;
  domain: string;
  aggregateId: string;
  commandType: string;
  payload: unknown;
  extensions?: Record<string, string>;
}

// Command response (202 Accepted)
export interface SubmitCommandResponse {
  correlationId: string;
}

// Command status polling
export interface CommandStatusResponse {
  correlationId: string;
  status: CommandStatus;
  statusCode: number;
  timestamp: string;
  aggregateId?: string;
  eventCount?: number;
  rejectionEventType?: string;
  failureReason?: string;
  timeoutDuration?: string;
}

// Query submission
export interface SubmitQueryRequest {
  tenant: string;
  domain: string;
  aggregateId: string;
  queryType: string;
  payload?: unknown;
  entityId?: string;
}

// Query response
export interface SubmitQueryResponse {
  correlationId: string;
  payload: unknown;
}

// Pre-flight validation
export interface ValidateCommandRequest {
  tenant: string;
  domain: string;
  commandType: string;
  aggregateId?: string;
}

export interface ValidateQueryRequest {
  tenant: string;
  domain: string;
  queryType: string;
  aggregateId?: string;
}

export interface PreflightValidationResult {
  isAuthorized: boolean;
  reason?: string;
}

// RFC 9457 Problem Details (error response)
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  correlationId?: string;
  tenantId?: string;
}
