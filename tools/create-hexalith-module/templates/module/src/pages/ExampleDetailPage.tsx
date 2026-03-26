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

import { ExampleDetailSchema } from "../schemas/exampleSchemas.js";

// Define query params at module scope for referential stability
function buildExampleDetailParams(id: string) {
  return {
    domain: "__MODULE_NAME__",
    // Replace 'ExampleDetail' with your projection query type
    // — check your backend's projection configuration
    queryType: "ExampleDetail",
    aggregateId: id,
  };
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function ExampleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(
    ExampleDetailSchema,
    buildExampleDetailParams(id ?? ""),
    { enabled: !!id },
  );

  const handleBack = useCallback(() => {
    navigate("..");
  }, [navigate]);

  const handleEdit = useCallback(() => {
    navigate(`../edit/${id}`);
  }, [navigate, id]);

  if (isLoading) {
    return (
      <PageLayout title="Item Details">
        <Skeleton variant="detail" fields={6} />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Item Details">
        <ErrorDisplay
          error={error}
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
    <PageLayout
      title={data.name}
      subtitle="Item Details"
      actions={
        <Inline gap="2">
          <Button variant="ghost" onClick={handleBack}>
            Back
          </Button>
          <Button variant="secondary" onClick={handleEdit}>Edit</Button>
          <Button variant="secondary">Delete</Button>
        </Inline>
      }
    >
      <DetailView
        sections={[
          {
            title: "General Information",
            fields: [
              { label: "Name", value: data.name },
              { label: "Description", value: data.description ?? "—" },
              { label: "Category", value: data.category },
              { label: "Priority", value: data.priority },
              { label: "Status", value: data.status },
              { label: "Notes", value: data.notes ?? "—", span: 2 },
            ],
          },
          {
            title: "Audit Trail",
            fields: [
              { label: "Created By", value: data.createdBy },
              { label: "Created At", value: formatDate(data.createdAt) },
              { label: "Updated At", value: formatDate(data.updatedAt) },
            ],
          },
        ]}
      />
    </PageLayout>
  );
}
