import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router";

import { useCommandPipeline } from "@hexalith/cqrs-client";
import {
  Button,
  ErrorDisplay,
  Form,
  FormField,
  Inline,
  Input,
  PageLayout,
  TextArea,
  useToast,
} from "@hexalith/ui";

import { CreateTenantCommandSchema } from "../schemas/tenantSchemas.js";

import type { CreateTenantInput } from "../schemas/tenantSchemas.js";

export function TenantCreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { send, status, error, replay } = useCommandPipeline();

  useEffect(() => {
    if (status !== "completed") {
      return;
    }

    toast({
      variant: "success",
      title: "Tenant created",
      description: "Your tenant has been created successfully.",
    });

    navigate("..");
  }, [navigate, status, toast]);

  const handleSubmit = useCallback(
    async (data: CreateTenantInput) => {
      await send({
        commandType: "CreateTenant",
        domain: "tenants",
        aggregateId: crypto.randomUUID(),
        payload: data,
      });
    },
    [send],
  );

  const handleCancel = useCallback(() => {
    navigate("..");
  }, [navigate]);

  const isBusy = status === "sending" || status === "polling";
  const canReplay =
    (status === "failed" || status === "timedOut") && replay !== null;
  const statusMessage =
    status === "sending"
      ? "Sending command to the backend…"
      : status === "polling"
        ? "Waiting for command confirmation…"
        : status === "rejected"
          ? "The backend rejected the command. Review the details below and try again."
          : status === "failed"
            ? "The command failed before completion. Review the error and retry."
            : status === "timedOut"
              ? "The command timed out before confirmation. You can retry once the service is responsive."
              : null;

  return (
    <PageLayout title="Create Tenant">
      {statusMessage && !error && <p>{statusMessage}</p>}

      {error && (
        <ErrorDisplay
          error={error}
          title={status === "rejected" ? "Command rejected" : "Command failed"}
          onRetry={canReplay ? replay : undefined}
        />
      )}

      <Form schema={CreateTenantCommandSchema} onSubmit={handleSubmit}>
        <FormField name="name">
          <Input
            label="Name"
            placeholder="Enter tenant name"
            required
          />
        </FormField>

        <FormField name="code">
          <Input
            label="Code"
            placeholder="tenant-code"
            required
          />
        </FormField>

        <FormField name="description">
          <TextArea
            label="Description"
            placeholder="Describe the tenant (optional)"
            rows={3}
          />
        </FormField>

        <FormField name="contactEmail">
          <Input
            label="Contact Email"
            placeholder="contact@example.com"
          />
        </FormField>

        <Inline gap="2">
          <Button variant="ghost" type="reset" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isBusy}>
            {status === "sending"
              ? "Sending…"
              : status === "polling"
                ? "Confirming…"
                : "Create Tenant"}
          </Button>
        </Inline>
      </Form>
    </PageLayout>
  );
}
