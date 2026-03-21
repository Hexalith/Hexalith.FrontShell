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

import styles from "./ExampleListPage.module.css";
import { ExampleItemSchema } from "../schemas/exampleSchemas.js";

// useQuery validates the response against the Zod schema at runtime —
// if the backend returns unexpected shapes, you get a clear validation error
// instead of a silent runtime crash
const ExampleListSchema = z.array(ExampleItemSchema);
type ExampleItem = z.infer<typeof ExampleItemSchema>;

// Define query params at module scope so the reference is stable across renders
const EXAMPLE_LIST_PARAMS = {
  domain: "__MODULE_NAME__",
  // Replace 'ExampleList' with your projection query type (e.g., 'OrderList')
  // — check your backend's projection configuration for the correct name
  queryType: "ExampleList",
} as const;

const STATUS_VARIANT: Record<string, string> = {
  Active: styles.statusActive,
  Inactive: styles.statusInactive,
  Pending: styles.statusPending,
  Archived: styles.statusArchived,
};

const columns = [
  {
    id: "name",
    header: "Name",
    accessorKey: "name",
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
      { label: "Active", value: "Active" },
      { label: "Inactive", value: "Inactive" },
      { label: "Pending", value: "Pending" },
      { label: "Archived", value: "Archived" },
    ],
    cell: ({ value }) => (
      <span className={`${styles.statusBadge} ${STATUS_VARIANT[value as string] ?? ""}`}>
        {value as string}
      </span>
    ),
  },
  {
    id: "category",
    header: "Category",
    accessorKey: "category",
    isSortable: true,
  },
  {
    id: "priority",
    header: "Priority",
    accessorKey: "priority",
    isSortable: true,
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
] satisfies TableColumn<ExampleItem>[];

export function ExampleListPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(
    ExampleListSchema,
    EXAMPLE_LIST_PARAMS,
  );

  const handleRowClick = useCallback(
    (row: ExampleItem) => {
      navigate(row.id);
    },
    [navigate],
  );

  const handleCreate = useCallback(() => {
    navigate("create");
  }, [navigate]);

  if (isLoading) {
    return (
      <PageLayout title="__MODULE_DISPLAY_NAME__">
        <Skeleton variant="table" rows={5} />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="__MODULE_DISPLAY_NAME__">
        <ErrorDisplay
          error={error}
          title="Failed to load items"
          onRetry={refetch}
        />
      </PageLayout>
    );
  }

  if (!data || data.length === 0) {
    return (
      <PageLayout
        title="__MODULE_DISPLAY_NAME__"
        actions={<Button variant="primary" onClick={handleCreate}>Create New</Button>}
      >
        <EmptyState
          title="No items yet"
          description="Create your first item to get started"
          action={{ label: "Create Item", onClick: handleCreate }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="__MODULE_DISPLAY_NAME__"
      actions={<Button variant="primary" onClick={handleCreate}>Create New</Button>}
    >
      <Table
        data={data}
        columns={columns}
        sorting
        pagination={{ pageSize: 10 }}
        globalSearch
        onRowClick={handleRowClick}
        caption="__MODULE_DISPLAY_NAME__ items"
      />
    </PageLayout>
  );
}
