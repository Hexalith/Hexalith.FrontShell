import { useCallback } from "react";
import { useNavigate } from "react-router";
import { z } from "zod";

import { useQuery } from "@hexalith/cqrs-client";
import {
  Button,
  EmptyState,
  ErrorDisplay,
  PageLayout,
  Skeleton,
  Table,
} from "@hexalith/ui";
import type { TableColumn } from "@hexalith/ui";

import styles from "./OrderListPage.module.css";
import { OrderItemSchema } from "../schemas/orderSchemas.js";
import statusStyles from "../styles/orderStatus.module.css";

import type { OrderItem } from "../schemas/orderSchemas.js";

const ListSchema = z.array(OrderItemSchema);

const ORDER_LIST_PARAMS = {
  domain: "Orders",
  queryType: "GetOrders",
} as const;

const STATUS_VARIANT: Record<string, string> = {
  draft: statusStyles.statusDraft,
  confirmed: statusStyles.statusConfirmed,
  shipped: statusStyles.statusShipped,
  delivered: statusStyles.statusDelivered,
  cancelled: statusStyles.statusCancelled,
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const columns = [
  {
    id: "orderNumber",
    header: "Order #",
    accessorKey: "orderNumber",
    isSortable: true,
    isFilterable: true,
    filterType: "text",
    cell: ({ value }) => (
      <span className={styles.orderNumber}>{value as string}</span>
    ),
  },
  {
    id: "customerName",
    header: "Customer",
    accessorKey: "customerName",
    isSortable: true,
    isFilterable: true,
    filterType: "text",
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    isSortable: true,
    isFilterable: true,
    filterType: "select",
    filterOptions: [
      { label: "Draft", value: "draft" },
      { label: "Confirmed", value: "confirmed" },
      { label: "Shipped", value: "shipped" },
      { label: "Delivered", value: "delivered" },
      { label: "Cancelled", value: "cancelled" },
    ],
    cell: ({ value }) => (
      <span
        className={`${statusStyles.statusBadge} ${STATUS_VARIANT[value as string] ?? ""}`}
      >
        {value as string}
      </span>
    ),
  },
  {
    id: "totalAmount",
    header: "Total",
    accessorKey: "totalAmount",
    isSortable: true,
    cell: ({ value }) => (
      <span className={styles.amountCell}>
        {formatCurrency(value as number)}
      </span>
    ),
  },
  {
    id: "createdAt",
    header: "Created",
    accessorKey: "createdAt",
    isSortable: true,
    cell: ({ value }) =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
      }).format(new Date(value as string)),
  },
] satisfies TableColumn<OrderItem>[];

export function OrderListPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(
    ListSchema,
    ORDER_LIST_PARAMS,
  );

  const handleRowClick = useCallback(
    (row: OrderItem) => {
      navigate(`detail/${row.id}`);
    },
    [navigate],
  );

  const handleCreate = useCallback(() => {
    navigate("create");
  }, [navigate]);

  if (isLoading) {
    return (
      <PageLayout title="Orders">
        <Skeleton variant="table" rows={5} />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Orders">
        <ErrorDisplay
          error={error}
          title="Failed to load orders"
          onRetry={refetch}
        />
      </PageLayout>
    );
  }

  if (!data || data.length === 0) {
    return (
      <PageLayout
        title="Orders"
        actions={
          <Button variant="primary" onClick={handleCreate}>
            Create Order
          </Button>
        }
      >
        <EmptyState
          title="No orders yet"
          description="Create your first order to get started."
          action={{ label: "Create Order", onClick: handleCreate }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Orders"
      actions={
        <Button variant="primary" onClick={handleCreate}>
          Create Order
        </Button>
      }
    >
      <Table
        data={data}
        columns={columns}
        sorting
        pagination={{ pageSize: 10 }}
        globalSearch
        onRowClick={handleRowClick}
        caption="Order items"
      />
    </PageLayout>
  );
}
