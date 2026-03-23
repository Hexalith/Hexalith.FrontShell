import { useCallback } from "react";
import { useNavigate } from "react-router";

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

import styles from "./TenantListPage.module.css";
import { TENANT_LIST_QUERY } from "../data/sampleData.js";
import {
  TenantListSchema,
  type TenantItem,
} from "../schemas/tenantSchemas.js";

const STATUS_VARIANT: Record<string, string> = {
  Active: styles.statusActive,
  Inactive: styles.statusInactive,
  Disabled: styles.statusDisabled,
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
    id: "code",
    header: "Code",
    accessorKey: "code",
    isSortable: true,
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
      { label: "Disabled", value: "Disabled" },
    ],
    cell: ({ value }) => (
      <span className={`${styles.statusBadge} ${STATUS_VARIANT[value as string] ?? ""}`}>
        {value as string}
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
] satisfies TableColumn<TenantItem>[];

export function TenantListPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(
    TenantListSchema,
    TENANT_LIST_QUERY,
  );

  const handleRowClick = useCallback(
    (row: TenantItem) => {
      navigate(`detail/${row.id}`);
    },
    [navigate],
  );

  const handleCreate = useCallback(() => {
    navigate("create");
  }, [navigate]);

  if (isLoading) {
    return (
      <PageLayout title="Tenants">
        <Skeleton variant="table" rows={8} />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Tenants">
        <ErrorDisplay
          error={error}
          title="Failed to load tenants"
          onRetry={refetch}
        />
      </PageLayout>
    );
  }

  if (!data || data.length === 0) {
    return (
      <PageLayout
        title="Tenants"
        actions={<Button variant="primary" onClick={handleCreate}>Create Tenant</Button>}
      >
        <EmptyState
          title="No tenants yet"
          description="Create your first tenant to get started."
          action={{ label: "Create Tenant", onClick: handleCreate }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Tenants"
      actions={<Button variant="primary" onClick={handleCreate}>Create Tenant</Button>}
    >
      <Table
        data={data}
        columns={columns}
        sorting
        pagination={{ pageSize: 10 }}
        globalSearch
        onRowClick={handleRowClick}
        caption="Tenants list"
      />
    </PageLayout>
  );
}
