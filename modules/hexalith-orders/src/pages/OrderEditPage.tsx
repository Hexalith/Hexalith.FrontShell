import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router";

import { useCommandPipeline, useQuery } from "@hexalith/cqrs-client";
import {
  Button,
  ErrorDisplay,
  Form,
  FormField,
  Inline,
  Input,
  PageLayout,
  Skeleton,
  TextArea,
  useToast,
} from "@hexalith/ui";

import { buildOrderDetailQuery } from "../data/sampleData.js";
import {
  OrderDetailSchema,
  UpdateOrderCommandSchema,
} from "../schemas/orderSchemas.js";

import type { UpdateOrderCommand } from "../schemas/orderSchemas.js";

export function OrderEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error, refetch } = useQuery(
    OrderDetailSchema,
    buildOrderDetailQuery(id ?? ""),
    { enabled: !!id },
  );
  const { send, status, error: cmdError, replay } = useCommandPipeline();

  useEffect(() => {
    if (status !== "completed") {
      return;
    }

    toast({
      variant: "success",
      title: "Order updated",
      description: "Your changes have been saved successfully.",
    });

    navigate(`../detail/${id}`);
  }, [id, navigate, status, toast]);

  const handleSubmit = useCallback(
    async (formData: UpdateOrderCommand) => {
      await send({
        domain: "Orders",
        commandType: "UpdateOrder",
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
      <PageLayout title="Edit Order">
        <ErrorDisplay
          error="Order not found"
          title="Failed to load order"
        />
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout title="Edit Order">
        <Skeleton variant="detail" fields={4} />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Edit Order">
        <ErrorDisplay
          error={error}
          title="Failed to load order"
          onRetry={refetch}
        />
      </PageLayout>
    );
  }

  if (!data) {
    return (
      <PageLayout title="Edit Order">
        <ErrorDisplay
          error="Order details are unavailable right now. Try reloading from the orders list."
          title="Failed to load order"
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
    <PageLayout title={`Edit Order ${data.orderNumber}`}>
      {statusMessage && !cmdError && <p>{statusMessage}</p>}

      {cmdError && (
        <ErrorDisplay
          error={cmdError}
          title={status === "rejected" ? "Command rejected" : "Command failed"}
          onRetry={canReplay ? replay : undefined}
        />
      )}

      <Form
        schema={UpdateOrderCommandSchema}
        onSubmit={handleSubmit}
        defaultValues={{
          customerName: data.customerName,
          shippingAddress: data.shippingAddress,
          billingAddress: data.billingAddress,
          notes: data.notes ?? "",
        }}
      >
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
                : "Save Changes"}
          </Button>
        </Inline>
      </Form>
    </PageLayout>
  );
}
