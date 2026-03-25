import { useCallback } from "react";
import { useNavigate, useParams } from "react-router";

import { useQuery } from "@hexalith/cqrs-client";
import {
  Button,
  DetailView,
  ErrorDisplay,
  Inline,
  PageLayout,
  Skeleton,
} from "@hexalith/ui";

import { OrderDetailSchema } from "../schemas/orderSchemas.js";
import statusStyles from "../styles/orderStatus.module.css";

const STATUS_VARIANT: Record<string, string> = {
  draft: statusStyles.statusDraft,
  confirmed: statusStyles.statusConfirmed,
  shipped: statusStyles.statusShipped,
  delivered: statusStyles.statusDelivered,
  cancelled: statusStyles.statusCancelled,
};

function buildOrderDetailParams(id: string) {
  return {
    domain: "Orders",
    queryType: "GetOrderById",
    aggregateId: id,
  };
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(
    OrderDetailSchema,
    buildOrderDetailParams(id ?? ""),
    { enabled: !!id },
  );

  const handleBack = useCallback(() => {
    navigate("..");
  }, [navigate]);

  if (isLoading) {
    return (
      <PageLayout title="Order Details">
        <Skeleton variant="detail" fields={6} />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Order Details">
        <ErrorDisplay
          error={error}
          title="Failed to load order"
          onRetry={refetch}
        />
      </PageLayout>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <PageLayout
      title={`Order ${data.orderNumber}`}
      subtitle="Order Details"
      actions={
        <Inline gap="2">
          <Button variant="ghost" onClick={handleBack}>
            Back
          </Button>
        </Inline>
      }
    >
      <DetailView
        sections={[
          {
            title: "Order Information",
            fields: [
              { label: "Order Number", value: data.orderNumber },
              { label: "Customer", value: data.customerName },
              {
                label: "Status",
                value: (
                  <span
                    className={`${statusStyles.statusBadge} ${STATUS_VARIANT[data.status] ?? ""}`}
                  >
                    {data.status}
                  </span>
                ),
              },
              { label: "Total Amount", value: formatCurrency(data.totalAmount) },
              { label: "Item Count", value: String(data.itemCount) },
            ],
          },
          {
            title: "Shipping",
            fields: [
              { label: "Shipping Address", value: data.shippingAddress, span: 2 },
              { label: "Billing Address", value: data.billingAddress, span: 2 },
              { label: "Notes", value: data.notes ?? "—", span: 2 },
            ],
          },
          {
            title: "Audit Trail",
            fields: [
              { label: "Created At", value: formatDate(data.createdAt) },
              { label: "Updated At", value: formatDate(data.updatedAt) },
            ],
          },
        ]}
      />
    </PageLayout>
  );
}
