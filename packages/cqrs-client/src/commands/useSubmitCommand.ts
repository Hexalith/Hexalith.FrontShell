import { useState, useCallback } from "react";

import { useTenant } from "@hexalith/shell-api";

import { useCqrs } from "../CqrsProvider";
import { generateCorrelationId } from "../core/correlationId";
import { ApiError, ForbiddenError, HexalithError } from "../errors";

import type { SubmitCommandInput } from "./types";
import type { SubmitCommandResponse } from "../core/types";

export interface UseSubmitCommandResult {
  submit: (command: SubmitCommandInput) => Promise<SubmitCommandResponse | null>;
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
        const tenantError = new ForbiddenError(
          "No active tenant selected — cannot submit command without tenant context",
        );
        setError(tenantError);
        return null;
      }
      setError(null);
      setCorrelationId(null);

      try {
        const messageId = generateCorrelationId();
        const response = await fetchClient.post<SubmitCommandResponse>(
          "/api/v1/commands",
          { body: { ...command, messageId, tenant: activeTenant } },
        );
        setCorrelationId(response.correlationId);
        return response;
      } catch (err) {
        const mappedError =
          err instanceof HexalithError
            ? err
            : new ApiError(
                0,
                err instanceof Error ? err.message : err,
              );

        setError(mappedError);
        return null;
      }
    },
    [fetchClient, activeTenant],
  );

  return { submit, correlationId, error };
}
