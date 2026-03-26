import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router";

import { useCommandPipeline, useQuery } from "@hexalith/cqrs-client";
import {
  Button,
  ErrorDisplay,
  Form,
  FormField,
  Input,
  Inline,
  PageLayout,
  Select,
  Skeleton,
  TextArea,
  useToast,
} from "@hexalith/ui";

import {
  ExampleDetailSchema,
  UpdateExampleCommandSchema,
} from "../schemas/exampleSchemas.js";

import type { UpdateExampleInput } from "../schemas/exampleSchemas.js";

const CATEGORY_OPTIONS = [
  { value: "Operations", label: "Operations" },
  { value: "Engineering", label: "Engineering" },
  { value: "Marketing", label: "Marketing" },
  { value: "Research", label: "Research" },
  { value: "Finance", label: "Finance" },
];

const PRIORITY_OPTIONS = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
  { value: "Critical", label: "Critical" },
];

function buildExampleDetailParams(id: string) {
  return {
    domain: "__MODULE_NAME__",
    queryType: "ExampleDetail",
    aggregateId: id,
  };
}

export function ExampleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { send, status, error } = useCommandPipeline();
  const {
    data,
    isLoading,
    error: loadError,
    refetch,
  } = useQuery(
    ExampleDetailSchema,
    buildExampleDetailParams(id ?? ""),
    { enabled: !!id },
  );

  useEffect(() => {
    if (status !== "completed") {
      return;
    }

    toast({
      variant: "success",
      title: "Item updated",
      description: "Your changes have been saved successfully.",
    });

    navigate(`../detail/${id}`);
  }, [navigate, status, toast, id]);

  const handleSubmit = useCallback(
    async (formData: UpdateExampleInput) => {
      await send({
        commandType: "UpdateExample",
        domain: "__MODULE_NAME__",
        aggregateId: id!,
        payload: formData,
      });
    },
    [send, id],
  );

  const handleCancel = useCallback(() => {
    navigate(`../detail/${id}`);
  }, [navigate, id]);

  const isBusy = status === "sending" || status === "polling";
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

  if (isLoading) {
    return (
      <PageLayout title="Edit __MODULE_DISPLAY_NAME__">
        <Skeleton variant="form" fields={4} />
      </PageLayout>
    );
  }

  if (loadError) {
    return (
      <PageLayout title="Edit __MODULE_DISPLAY_NAME__">
        <ErrorDisplay
          error={loadError}
          title="Failed to load item"
          onRetry={refetch}
        />
      </PageLayout>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <PageLayout title="Edit __MODULE_DISPLAY_NAME__">
      {statusMessage && !error && <p>{statusMessage}</p>}

      {error && (
        <ErrorDisplay error={error} title="Command failed" />
      )}

      <Form
        schema={UpdateExampleCommandSchema}
        onSubmit={handleSubmit}
        defaultValues={data}
      >
        <FormField name="name">
          <Input
            label="Name"
            placeholder="Enter a descriptive name"
            required
          />
        </FormField>

        <FormField name="description">
          <TextArea
            label="Description"
            placeholder="Provide details about this item"
            rows={3}
          />
        </FormField>

        <FormField name="category">
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            placeholder="Select a category"
            required
          />
        </FormField>

        <FormField name="priority">
          <Select
            label="Priority"
            options={PRIORITY_OPTIONS}
            placeholder="Select priority level"
            required
          />
        </FormField>

        <Inline gap="2">
          <Button variant="ghost" type="reset" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isBusy}>
            {status === "sending"
              ? "Saving…"
              : status === "polling"
                ? "Confirming…"
                : "Save"}
          </Button>
        </Inline>
      </Form>
    </PageLayout>
  );
}
