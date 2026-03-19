import { useState, useCallback } from "react";

import { useTenant } from "@hexalith/shell-api";

import { useCqrs } from "../CqrsProvider";
import { ForbiddenError, HexalithError } from "../errors";

import type { SubmitCommandInput } from "./types";
import type { SubmitCommandResponse } from "../core/types";

export interface UseSubmitCommandResult {
  submit: (command: SubmitCommandInput) => Promise<SubmitCommandResponse>;
  correlationId: string | null;
  error: HexalithError | null;
}

export function useSubmitCommand(): UseSubmitCommandResult {
  const { fetchClient } = useCqrs();
  const { activeTenant } = useTenant();
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [error, setError] = useState<HexalithError | null>(null);

  const submit = useCallback(
    async (command: SubmitCommandInput) => {
      if (!activeTenant) {
        throw new ForbiddenError(
          "No active tenant selected — cannot submit command without tenant context",
        );
      }
      setError(null);
      setCorrelationId(null);

      try {
        const response = await fetchClient.post<SubmitCommandResponse>(
          "/api/v1/commands",
          { body: { ...command, tenant: activeTenant } },
        );
        setCorrelationId(response.correlationId);
        return response;
      } catch (err) {
        if (err instanceof HexalithError) {
          setError(err);
        }
        throw err;
      }
    },
    [fetchClient, activeTenant],
  );

  return { submit, correlationId, error };
}
