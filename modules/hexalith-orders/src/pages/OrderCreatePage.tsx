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

import { CreateOrderCommandSchema } from "../schemas/orderSchemas.js";

import type { CreateOrderCommand } from "../schemas/orderSchemas.js";

export function OrderCreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { send, status, error } = useCommandPipeline();

  useEffect(() => {
    if (status !== "completed") {
      return;
    }

    toast({
      variant: "success",
      title: "Order created",
      description: "Your order has been created successfully.",
    });

    navigate("..");
  }, [navigate, status, toast]);

  const handleSubmit = useCallback(
    async (data: CreateOrderCommand) => {
      await send({
        commandType: "CreateOrder",
        domain: "Orders",
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
    <PageLayout title="Create Order">
      {statusMessage && !error && <p>{statusMessage}</p>}

      {error && <ErrorDisplay error={error} title="Command failed" />}

      <Form schema={CreateOrderCommandSchema} onSubmit={handleSubmit}>
        <FormField name="customerName">
          <Input
            label="Customer Name"
            placeholder="Enter customer name"
            required
          />
        </FormField>

        <FormField name="shippingAddress">
          <TextArea
            label="Shipping Address"
            placeholder="Enter shipping address"
            rows={2}
            required
          />
        </FormField>

        <FormField name="billingAddress">
          <TextArea
            label="Billing Address"
            placeholder="Enter billing address"
            rows={2}
            required
          />
        </FormField>

        <FormField name="notes">
          <TextArea
            label="Notes"
            placeholder="Additional notes (optional)"
            rows={3}
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
                : "Create Order"}
          </Button>
        </Inline>
      </Form>
    </PageLayout>
  );
}
