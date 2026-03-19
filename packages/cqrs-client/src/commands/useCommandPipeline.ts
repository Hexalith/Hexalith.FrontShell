import { useState, useCallback, useEffect, useRef } from "react";

import { useTenant } from "@hexalith/shell-api";

import { useCqrs } from "../CqrsProvider";
import { type HexalithError } from "../errors";
import { useCommandStatus } from "./useCommandStatus";
import { useSubmitCommand } from "./useSubmitCommand";

import type { PipelineStatus, SubmitCommandInput } from "./types";
import type { SubmitCommandResponse } from "../core/types";

export interface UseCommandPipelineResult {
  send: (command: SubmitCommandInput) => Promise<void>;
  status: PipelineStatus;
  error: HexalithError | null;
  correlationId: string | null;
  replay: (() => Promise<void>) | null;
}

export function useCommandPipeline(): UseCommandPipelineResult {
  const { fetchClient, commandEventBus } = useCqrs("useCommandPipeline");
  const { activeTenant } = useTenant();
  const { submit } = useSubmitCommand();

  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [error, setError] = useState<HexalithError | null>(null);

  const commandInputRef = useRef<{
    domain: string;
    aggregateId: string;
    tenant: string;
  } | null>(null);

  const statusResult = useCommandStatus(
    pipelineStatus === "polling" ? correlationId : null,
  );

  // React to terminal status from useCommandStatus
  useEffect(() => {
    if (pipelineStatus !== "polling") return;

    if (
      statusResult.status === "completed" ||
      statusResult.status === "rejected" ||
      statusResult.status === "failed" ||
      statusResult.status === "timedOut"
    ) {
      setPipelineStatus(statusResult.status);
      if (statusResult.error) {
        setError(statusResult.error);
      }
      if (
        statusResult.status === "completed" &&
        correlationId &&
        commandInputRef.current
      ) {
        commandEventBus.emitCommandCompleted({
          correlationId,
          ...commandInputRef.current,
        });
      }
    }
  }, [
    pipelineStatus,
    statusResult.status,
    statusResult.error,
    correlationId,
    commandEventBus,
  ]);

  const send = useCallback(
    async (command: SubmitCommandInput) => {
      setError(null);
      setCorrelationId(null);
      setPipelineStatus("sending");

      commandInputRef.current = {
        domain: command.domain,
        aggregateId: command.aggregateId,
        tenant: activeTenant ?? "",
      };

      try {
        const response = await submit(command);
        setCorrelationId(response.correlationId);
        setPipelineStatus("polling");
      } catch (err) {
        setPipelineStatus("failed");
        if (err instanceof Error) {
          setError(err as HexalithError);
        }
        throw err;
      }
    },
    [submit, activeTenant],
  );

  const replay = useCallback(async () => {
    if (!correlationId) return;
    setError(null);
    setPipelineStatus("polling");

    try {
      const response = await fetchClient.post<SubmitCommandResponse>(
        `/api/v1/commands/replay/${correlationId}`,
      );
      setCorrelationId(response.correlationId);
    } catch (err) {
      setPipelineStatus("failed");
      if (err instanceof Error) {
        setError(err as HexalithError);
      }
      throw err;
    }
  }, [correlationId, fetchClient]);

  const canReplay =
    correlationId !== null &&
    (pipelineStatus === "failed" || pipelineStatus === "timedOut");

  return {
    send,
    status: pipelineStatus,
    error,
    correlationId,
    replay: canReplay ? replay : null,
  };
}
