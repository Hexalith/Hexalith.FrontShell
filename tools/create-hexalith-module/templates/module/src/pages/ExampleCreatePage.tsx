import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router";

import { useCommandPipeline } from "@hexalith/cqrs-client";
import {
  Button,
  ErrorDisplay,
  Form,
  FormField,
  Input,
  Inline,
  PageLayout,
  Select,
  TextArea,
  useToast,
} from "@hexalith/ui";

import { CreateExampleCommandSchema } from "../schemas/exampleSchemas.js";

import type { CreateExampleInput } from "../schemas/exampleSchemas.js";

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

export function ExampleCreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { send, status, error } = useCommandPipeline();

  useEffect(() => {
    if (status !== "completed") {
      return;
    }

    toast({
      variant: "success",
      title: "Item created",
      description: "Your command completed successfully and the item is ready.",
    });

    navigate("..");
  }, [navigate, status, toast]);

  // CQRS commands are async — you send a command to EventStore, then the hook
  // polls the backend for the result (accepted/rejected/timed out).
  // Status flow: idle → sending → polling → completed | rejected | failed | timedOut
  const handleSubmit = useCallback(
    async (data: CreateExampleInput) => {
      await send({
        commandType: "CreateExample", // Replace with your command name
        domain: "__MODULE_NAME__", // Replace with your aggregate/domain name
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
    <PageLayout title="Create __MODULE_DISPLAY_NAME__">
      {statusMessage && !error && <p>{statusMessage}</p>}

      {error && (
        <ErrorDisplay error={error} title="Command failed" />
      )}

      <Form schema={CreateExampleCommandSchema} onSubmit={handleSubmit}>
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
              ? "Sending…"
              : status === "polling"
                ? "Confirming…"
                : "Create"}
          </Button>
        </Inline>
      </Form>
    </PageLayout>
  );
}
