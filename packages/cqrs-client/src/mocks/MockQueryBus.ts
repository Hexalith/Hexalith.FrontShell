import { ApiError, ValidationError } from "../errors";

import type { IQueryBus } from "../core/IQueryBus";
import type { SubmitQueryRequest } from "../core/types";
import type { z } from "zod";

export interface MockQueryBusConfig {
  /** Simulated async delay in ms. Default: 30. Must be > 0 (contract test verifies). */
  delay?: number;
}

export interface MockQueryBusCall {
  request: SubmitQueryRequest;
  timestamp: number;
}

function buildResponseKey(request: SubmitQueryRequest): string {
  const parts = [
    request.tenant,
    request.domain,
    request.queryType,
    request.aggregateId ?? "",
    request.entityId ?? "",
  ];
  return parts.join(":");
}

export class MockQueryBus implements IQueryBus {
  private readonly delay: number;
  private readonly calls: MockQueryBusCall[] = [];
  private readonly responses = new Map<string, unknown>();
  private readonly errors = new Map<string, Error>();

  constructor(config?: MockQueryBusConfig) {
    const configuredDelay = config?.delay ?? 30;
    this.delay = configuredDelay > 0 ? configuredDelay : 1;
  }

  async query<T>(request: SubmitQueryRequest, schema: z.ZodType<T>): Promise<T> {
    // Simulate async delay
    await new Promise((resolve) => setTimeout(resolve, this.delay));

    // Record call
    this.calls.push({ request, timestamp: Date.now() });

    // Build response key
    const key = buildResponseKey(request);

    // Check for configured error
    const error = this.errors.get(key);
    if (error) {
      throw error;
    }

    // Check for configured response
    if (!this.responses.has(key)) {
      throw new ApiError(404, {
        type: "about:blank",
        title: "Not Found",
        status: 404,
        detail: "No projection data found",
        instance: "/api/v1/queries",
      });
    }

    const data = this.responses.get(key);

    // Validate against Zod schema (same as real implementation)
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new ValidationError(result.error.issues);
    }

    return result.data;
  }

  /** Configure a response for a given key. Key format: tenant:domain:queryType:aggregateId:entityId */
  setResponse(key: string, data: unknown): void {
    this.responses.set(key, data);
  }

  /** Configure an error for a given key. */
  setError(key: string, error: Error): void {
    this.errors.set(key, error);
  }

  /** Clear all configured responses and errors. */
  clearResponses(): void {
    this.responses.clear();
    this.errors.clear();
  }

  /** Returns full call history for assertions. */
  getCalls(): ReadonlyArray<MockQueryBusCall> {
    return this.calls;
  }

  /** Returns the most recent call, or undefined if none. */
  getLastCall(): MockQueryBusCall | undefined {
    return this.calls[this.calls.length - 1];
  }

  /** Clears call history, responses, and errors. */
  reset(): void {
    this.calls.length = 0;
    this.responses.clear();
    this.errors.clear();
  }
}
