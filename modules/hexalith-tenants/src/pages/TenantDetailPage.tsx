import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { useCommandPipeline, useQuery } from "@hexalith/cqrs-client";
import {
  Button,
  DetailView,
  ErrorDisplay,
  Form,
  FormField,
  Input,
  Modal,
  PageLayout,
  Skeleton,
  Stack,
  useToast,
} from "@hexalith/ui";

import { buildTenantDetailQuery } from "../data/sampleData.js";
import {
  DisableTenantCommandSchema,
  TenantDetailSchema,
} from "../schemas/tenantSchemas.js";
import styles from "../styles/tenantStatus.module.css";

import type { DisableTenantInput } from "../schemas/tenantSchemas.js";

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
  const { toast } = useToast();
  const { data, isLoading, error, refetch } = useQuery(
    TenantDetailSchema,
    buildTenantDetailQuery(id ?? ""),
    { enabled: !!id },
  );
  const {
    send: sendDisable,
    status: disableStatus,
    error: disableError,
  } = useCommandPipeline();

  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const hasSubmittedDisable = useRef(false);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleEdit = useCallback(() => {
    navigate(`../edit/${id}`);
  }, [id, navigate]);

  const handleDisable = useCallback(
    async (formData: DisableTenantInput) => {
      hasSubmittedDisable.current = true;
      setIsDisableModalOpen(false);
      toast({ title: "Disabling tenant...", variant: "info" });
      await sendDisable({
        domain: "tenants",
        commandType: "DisableTenant",
        aggregateId: id!,
        payload: formData,
      });
    },
    [id, sendDisable, toast],
  );

  useEffect(() => {
    if (!hasSubmittedDisable.current) return;

    if (disableStatus === "completed") {
      toast({ title: "Tenant disabled", variant: "success" });
      refetch();
      hasSubmittedDisable.current = false;
    }
    if (disableStatus === "rejected") {
      toast({
        title: `Failed to disable: ${disableError?.message ?? "Unknown error"}`,
        variant: "error",
      });
      hasSubmittedDisable.current = false;
    }
    if (disableStatus === "failed" || disableStatus === "timedOut") {
      toast({
        title: "Disable failed — please try again",
        variant: "error",
      });
      hasSubmittedDisable.current = false;
    }
  }, [disableError, disableStatus, refetch, toast]);

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
        <Stack direction="horizontal" gap="sm">
          <Button variant="ghost" onClick={handleBack}>
            Back
          </Button>
          <Button onClick={handleEdit}>Edit</Button>
          {data.status !== "Disabled" && (
            <Button
              variant="destructive"
              onClick={() => setIsDisableModalOpen(true)}
            >
              Disable
            </Button>
          )}
        </Stack>
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
                  <span
                    className={`${styles.statusBadge} ${STATUS_VARIANT[data.status] ?? ""}`}
                    data-tenant-status={data.status}
                  >
                    {data.status}
                  </span>
                ),
              },
              {
                label: "Description",
                value: data.description ?? "—",
                span: 2,
              },
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

      {isDisableModalOpen && (
        <Modal
          open
          onClose={() => setIsDisableModalOpen(false)}
          title="Disable Tenant"
        >
          <Form schema={DisableTenantCommandSchema} onSubmit={handleDisable}>
            <Stack gap="md">
              <p>
                This action will disable the tenant. Please provide a reason.
              </p>
              <FormField name="reason">
                <Input label="Reason" placeholder="Reason for disabling" required />
              </FormField>
              <Stack direction="horizontal" gap="sm">
                <Button
                  variant="ghost"
                  onClick={() => setIsDisableModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={
                    disableStatus === "sending" || disableStatus === "polling"
                  }
                >
                  {disableStatus === "sending" || disableStatus === "polling"
                    ? "Disabling..."
                    : "Confirm Disable"}
                </Button>
              </Stack>
            </Stack>
          </Form>
        </Modal>
      )}
    </PageLayout>
  );
}
