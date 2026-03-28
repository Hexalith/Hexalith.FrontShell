import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router";

import { useCommandPipeline, useQuery } from "@hexalith/cqrs-client";
import {
  Button,
  ErrorDisplay,
  Form,
  FormField,
  Input,
  PageLayout,
  Skeleton,
  Stack,
  TextArea,
  useToast,
} from "@hexalith/ui";

import { buildTenantDetailQuery } from "../data/sampleData.js";
import {
  TenantDetailSchema,
  UpdateTenantCommandSchema,
} from "../schemas/tenantSchemas.js";

import type { UpdateTenantInput } from "../schemas/tenantSchemas.js";

export function TenantEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error, refetch } = useQuery(
    TenantDetailSchema,
    buildTenantDetailQuery(id ?? ""),
    { enabled: !!id },
  );
  const { send, status, error: cmdError, replay } = useCommandPipeline();

  useEffect(() => {
    if (status !== "completed") {
      return;
    }

    toast({
      variant: "success",
      title: "Tenant updated",
      description: "Your changes have been saved successfully.",
    });

    navigate(`../detail/${id}`);
  }, [id, navigate, status, toast]);

  const handleSubmit = useCallback(
    async (formData: UpdateTenantInput) => {
      await send({
        domain: "tenants",
        commandType: "UpdateTenant",
        aggregateId: id!,
        payload: formData,
      });
    },
    [id, send],
  );

  const handleCancel = useCallback(() => {
    navigate("..");
  }, [navigate]);

  if (!id) {
    return (
      <PageLayout title="Edit Tenant">
        <ErrorDisplay
          error="Tenant not found"
          title="Failed to load tenant"
        />
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout title="Edit Tenant">
        <Skeleton variant="detail" fields={4} />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Edit Tenant">
        <ErrorDisplay
          error={error}
          title="Failed to load tenant"
          onRetry={refetch}
        />
      </PageLayout>
    );
  }

  if (!data) {
    return (
      <PageLayout title="Edit Tenant">
        <ErrorDisplay
          error="Tenant details are unavailable right now. Try reloading from the tenants list."
          title="Failed to load tenant"
          onRetry={refetch}
        />
      </PageLayout>
    );
  }

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
    <PageLayout title={`Edit ${data.name}`}>
      {statusMessage && !cmdError && <p>{statusMessage}</p>}

      {cmdError && (
        <ErrorDisplay
          error={cmdError}
          title={status === "rejected" ? "Command rejected" : "Command failed"}
          onRetry={canReplay ? replay : undefined}
        />
      )}

      <Form
        schema={UpdateTenantCommandSchema}
        onSubmit={handleSubmit}
        defaultValues={{
          name: data.name,
          description: data.description,
          contactEmail: data.contactEmail,
        }}
      >
        <FormField name="name">
          <Input
            label="Name"
            placeholder="Tenant name"
            required
          />
        </FormField>

        <FormField name="description">
          <TextArea
            label="Description"
            placeholder="Description (optional)"
            rows={3}
          />
        </FormField>

        <FormField name="contactEmail">
          <Input
            label="Contact Email"
            placeholder="contact@example.com"
          />
        </FormField>

        <Stack direction="horizontal" gap="sm">
          <Button variant="ghost" type="reset" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isBusy}>
            {status === "sending"
              ? "Sending…"
              : status === "polling"
                ? "Confirming…"
                : "Save Changes"}
          </Button>
        </Stack>
      </Form>
    </PageLayout>
  );
}
