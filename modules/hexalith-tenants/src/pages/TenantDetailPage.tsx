import { useCallback } from "react";
import { useNavigate, useParams } from "react-router";

import { useQuery } from "@hexalith/cqrs-client";
import {
  Button,
  DetailView,
  ErrorDisplay,
  PageLayout,
  Skeleton,
} from "@hexalith/ui";

import styles from "./TenantDetailPage.module.css";
import { buildTenantDetailQuery } from "../data/sampleData.js";
import { TenantDetailSchema } from "../schemas/tenantSchemas.js";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));
}

const STATUS_VARIANT: Record<string, string> = {
  Active: styles.statusActive,
  Inactive: styles.statusInactive,
  Disabled: styles.statusDisabled,
};

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(
    TenantDetailSchema,
    buildTenantDetailQuery(id ?? ""),
    { enabled: !!id },
  );

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  if (!id) {
    return (
      <PageLayout title="Tenant Details">
        <ErrorDisplay
          error="Tenant identifier is missing. Navigate from the tenant list and try again."
          title="Failed to load tenant"
        />
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout title="Tenant Details">
        <Skeleton variant="detail" fields={6} />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Tenant Details">
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
      <PageLayout title="Tenant Details">
        <ErrorDisplay
          error="Tenant details are unavailable right now. Try reloading the page from the tenants list."
          title="Failed to load tenant"
          onRetry={refetch}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={data.name}
      subtitle="Tenant Details"
      actions={
        <Button variant="ghost" onClick={handleBack}>
          Back
        </Button>
      }
    >
      <DetailView
        sections={[
          {
            title: "General Information",
            fields: [
              { label: "Name", value: data.name },
              { label: "Code", value: data.code },
              {
                label: "Status",
                value: (
                  <span className={`${styles.statusBadge} ${STATUS_VARIANT[data.status] ?? ""}`}>
                    {data.status}
                  </span>
                ),
              },
              { label: "Description", value: data.description ?? "—", span: 2 },
              { label: "Contact Email", value: data.contactEmail ?? "—" },
            ],
          },
          {
            title: "Audit Trail",
            fields: [
              { label: "Created By", value: data.createdBy },
              { label: "Created At", value: formatDate(data.createdAt) },
              { label: "Updated At", value: formatDate(data.updatedAt) },
              { label: "Notes", value: data.notes ?? "—", span: 2 },
            ],
          },
        ]}
      />
    </PageLayout>
  );
}
