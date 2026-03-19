export type PipelineStatus =
  | "idle"
  | "sending"
  | "polling"
  | "completed"
  | "rejected"
  | "failed"
  | "timedOut";

export interface SubmitCommandInput {
  domain: string;
  aggregateId: string;
  commandType: string;
  payload: unknown;
  extensions?: Record<string, string>;
}
