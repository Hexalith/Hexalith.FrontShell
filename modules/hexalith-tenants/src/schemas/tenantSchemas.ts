import { z } from "zod";

const TenantIdentifierSchema = z.string().uuid("ID must be a valid UUID");
const TenantNameSchema = z
  .string()
  .min(1, "Tenant name is required")
  .max(200);
const TenantCodeSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, "Lowercase alphanumeric and hyphens only")
  .min(1)
  .max(50);
const TenantTimestampSchema = z
  .string()
  .datetime({ offset: true, message: "Timestamp must be a valid ISO 8601 date" });

/**
 * Tenant list view model — represents a tenant in table/list views.
 */
export const TenantItemSchema = z.object({
  id: TenantIdentifierSchema,
  name: TenantNameSchema,
  code: TenantCodeSchema,
  status: z.enum(["Active", "Inactive", "Disabled"]),
  createdAt: TenantTimestampSchema,
  updatedAt: TenantTimestampSchema,
});

/** Inferred type — use this instead of manually defining interfaces */
export type TenantItem = z.infer<typeof TenantItemSchema>;

/** Response wrapper for the list query */
export const TenantListSchema = z.array(TenantItemSchema);

/**
 * Tenant detail view model — full entity with audit and extra fields.
 */
export const TenantDetailSchema = TenantItemSchema.extend({
  description: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional(),
  createdBy: z.string().min(1),
  notes: z.string().max(2000).optional(),
});

export type TenantDetail = z.infer<typeof TenantDetailSchema>;

/**
 * Command input for creating a new tenant.
 */
export const CreateTenantCommandSchema = z.object({
  name: z.string().min(1, "Tenant name is required").max(200),
  code: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Lowercase alphanumeric and hyphens only")
    .min(1)
    .max(50),
  description: z.string().max(500).optional(),
  contactEmail: z.string().email("Invalid email").optional(),
});

export type CreateTenantInput = z.infer<typeof CreateTenantCommandSchema>;

/**
 * Command input for updating an existing tenant (forward-compatibility for story 6-4).
 */
export const UpdateTenantCommandSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  contactEmail: z.string().email().optional(),
});

export type UpdateTenantInput = z.infer<typeof UpdateTenantCommandSchema>;

/**
 * Command input for disabling a tenant (forward-compatibility for story 6-4).
 */
export const DisableTenantCommandSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
});

export type DisableTenantInput = z.infer<typeof DisableTenantCommandSchema>;
