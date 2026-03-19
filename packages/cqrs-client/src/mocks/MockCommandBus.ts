import { generateCorrelationId } from "../core/correlationId";
import {
  ApiError,
  CommandRejectedError,
  CommandTimeoutError,
} from "../errors";

import type { ICommandBus } from "../core/ICommandBus";
import type { SubmitCommandRequest, SubmitCommandResponse } from "../core/types";

export interface MockCommandBusConfig {
  /** Simulated async delay in ms. Default: 50. Must be > 0 (contract test verifies). */
  delay?: number;
  /** Default behavior: 'success'. Override per-call via configureNextSend(). */
  defaultBehavior?: "success" | "reject" | "timeout" | "publishFail";
}

export type MockSendBehavior =
  | { type: "success" }
  | { type: "reject"; rejectionEventType: string }
  | { type: "timeout"; duration?: string }
  | { type: "publishFail"; failureReason?: string }
  | { type: "error"; error: Error };

export interface MockCommandBusCall {
  command: SubmitCommandRequest;
  correlationId: string;
  timestamp: number;
}

export class MockCommandBus implements ICommandBus {
  private readonly delay: number;
  private readonly defaultBehavior: NonNullable<MockCommandBusConfig["defaultBehavior"]>;
  private readonly calls: MockCommandBusCall[] = [];
  private readonly behaviorQueue: MockSendBehavior[] = [];

  constructor(config?: MockCommandBusConfig) {
    const configuredDelay = config?.delay ?? 50;
    this.delay = configuredDelay > 0 ? configuredDelay : 1;
    this.defaultBehavior = config?.defaultBehavior ?? "success";
  }

  async send(command: SubmitCommandRequest): Promise<SubmitCommandResponse> {
    const correlationId = generateCorrelationId();

    // Simulate async delay
    await new Promise((resolve) => setTimeout(resolve, this.delay));

    // Record the call
    this.calls.push({ command, correlationId, timestamp: Date.now() });

    // Determine behavior: dequeue from FIFO queue, or use default
    const queued = this.behaviorQueue.shift();
    const behaviorType = queued?.type ?? this.defaultBehavior;

    switch (behaviorType) {
      case "success":
        return { correlationId };

      case "reject": {
        const rejectionEventType =
          queued?.type === "reject" ? queued.rejectionEventType : "UnknownRejection";
        throw new CommandRejectedError(rejectionEventType, correlationId);
      }

      case "timeout": {
        const duration =
          queued?.type === "timeout" ? (queued.duration ?? "PT30S") : "PT30S";
        throw new CommandTimeoutError(duration, correlationId);
      }

      case "publishFail": {
        const failureReason =
          queued?.type === "publishFail"
            ? (queued.failureReason ?? "Event publication failed")
            : "Event publication failed";
        throw new ApiError(500, {
          type: "about:blank",
          title: "Publish Failed",
          status: 500,
          detail: failureReason,
          instance: "/api/v1/commands",
        });
      }

      case "error":
        if (queued?.type === "error") throw queued.error;
        throw new Error("Unexpected error behavior without error object");
    }
  }

  /** Enqueue a behavior for the next send() call (FIFO). */
  configureNextSend(behavior: MockSendBehavior): void {
    this.behaviorQueue.push(behavior);
  }

  /** Returns full call history for assertions. */
  getCalls(): ReadonlyArray<MockCommandBusCall> {
    return this.calls;
  }

  /** Returns the most recent call, or undefined if none. */
  getLastCall(): MockCommandBusCall | undefined {
    return this.calls[this.calls.length - 1];
  }

  /** Clears call history AND behavior queue. */
  reset(): void {
    this.calls.length = 0;
    this.behaviorQueue.length = 0;
  }
}
