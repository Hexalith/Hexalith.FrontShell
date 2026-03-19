import { useState, useEffect, useRef, useCallback } from "react";

import { useCqrs } from "../CqrsProvider";
import {
  CommandRejectedError,
  CommandTimeoutError,
  type HexalithError,
} from "../errors";

import type { PipelineStatus } from "./types";
import type { CommandStatusResponse } from "../core/types";

const TERMINAL_STATUSES = [
  "Completed",
  "Rejected",
  "PublishFailed",
  "TimedOut",
] as const;

const POLL_INTERVAL_MS = 1000;

export interface UseCommandStatusResult {
  status: PipelineStatus;
  response: CommandStatusResponse | null;
  error: HexalithError | null;
}

export function mapTerminalStatus(resp: CommandStatusResponse): {
  status: PipelineStatus;
  error?: HexalithError;
} {
  switch (resp.status) {
    case "Completed":
      return { status: "completed" };
    case "Rejected":
      return {
        status: "rejected",
        error: new CommandRejectedError(
          resp.rejectionEventType ?? "",
          resp.correlationId,
        ),
      };
    case "PublishFailed":
      return {
        status: "failed",
        error: new CommandTimeoutError(
          resp.failureReason ?? "Publish failed",
          resp.correlationId,
        ),
      };
    case "TimedOut":
      return {
        status: "timedOut",
        error: new CommandTimeoutError(
          resp.timeoutDuration ?? "unknown",
          resp.correlationId,
        ),
      };
    default:
      return { status: "polling" };
  }
}

export function useCommandStatus(
  correlationId: string | null,
): UseCommandStatusResult {
  const { fetchClient } = useCqrs();
  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [response, setResponse] = useState<CommandStatusResponse | null>(null);
  const [error, setError] = useState<HexalithError | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!correlationId) {
      setStatus("idle");
      setResponse(null);
      setError(null);
      return;
    }

    setStatus("polling");
    setError(null);

    const poll = async () => {
      try {
        const resp = await fetchClient.get<CommandStatusResponse>(
          `/api/v1/commands/status/${correlationId}`,
        );
        setResponse(resp);

        if (
          TERMINAL_STATUSES.includes(
            resp.status as (typeof TERMINAL_STATUSES)[number],
          )
        ) {
          stopPolling();
          const mapped = mapTerminalStatus(resp);
          setStatus(mapped.status);
          if (mapped.error) {
            setError(mapped.error);
          }
        }
      } catch (err) {
        // TODO: Story 2.5 adds retry with backoff for transient errors
        setError(err as HexalithError);
        stopPolling();
      }
    };

    // Poll immediately, then every POLL_INTERVAL_MS
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return stopPolling;
  }, [correlationId, fetchClient, stopPolling]);

  return { status, response, error };
}
