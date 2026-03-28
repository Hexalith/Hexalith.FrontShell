import {
  TenantDetailSchema,
  TenantItemSchema,
  type TenantDetail,
  type TenantItem,
} from "../schemas/tenantSchemas.js";

/**
 * Query param constants — must match the server-side IQueryContract values
 * (e.g. ListTenantsQuery.Domain, ListTenantsQuery.QueryType).
 */
export const TENANT_LIST_QUERY = {
  domain: "tenants",
  queryType: "list-tenants",
  aggregateId: "index",
} as const;

export const TENANT_DETAIL_QUERY = {
  domain: "tenants",
  queryType: "get-tenant",
} as const;

export function buildTenantDetailQuery(id: string) {
  return {
    domain: "tenants",
    queryType: "get-tenant",
    aggregateId: id,
  };
}

/**
 * Realistic sample data for the tenants module.
 */
export const sampleTenants: TenantItem[] = TenantItemSchema.array().parse([
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567801",
    name: "Acme Corporation",
    code: "acme-corp",
    status: "Active",
    createdAt: "2025-06-15T08:30:00Z",
    updatedAt: "2026-02-10T14:22:00Z",
  },
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567802",
    name: "TechVentures Inc.",
    code: "techventures",
    status: "Active",
    createdAt: "2025-07-01T09:00:00Z",
    updatedAt: "2026-03-01T11:45:00Z",
  },
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567803",
    name: "GlobalTrade Solutions",
    code: "globaltrade",
    status: "Active",
    createdAt: "2025-08-20T13:15:00Z",
    updatedAt: "2026-01-28T09:30:00Z",
  },
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567804",
    name: "Northern Logistics Group",
    code: "northern-logistics",
    status: "Inactive",
    createdAt: "2025-09-05T10:00:00Z",
    updatedAt: "2026-02-20T16:10:00Z",
  },
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567805",
    name: "Pinnacle Financial Services",
    code: "pinnacle-fin",
    status: "Active",
    createdAt: "2025-10-22T07:45:00Z",
    updatedAt: "2026-03-05T08:00:00Z",
  },
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567806",
    name: "Horizon Healthcare Partners",
    code: "horizon-health",
    status: "Disabled",
    createdAt: "2025-05-10T11:20:00Z",
    updatedAt: "2025-12-18T15:30:00Z",
  },
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567807",
    name: "Summit Engineering Co.",
    code: "summit-eng",
    status: "Active",
    createdAt: "2025-11-08T14:00:00Z",
    updatedAt: "2026-02-15T10:20:00Z",
  },
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567808",
    name: "Cascade Media Group",
    code: "cascade-media",
    status: "Active",
    createdAt: "2025-12-01T09:30:00Z",
    updatedAt: "2026-03-10T12:00:00Z",
  },
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567809",
    name: "Meridian Consulting",
    code: "meridian",
    status: "Inactive",
    createdAt: "2025-07-15T08:00:00Z",
    updatedAt: "2025-11-30T17:00:00Z",
  },
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567810",
    name: "Vanguard Industries",
    code: "vanguard",
    status: "Active",
    createdAt: "2026-01-20T10:45:00Z",
    updatedAt: "2026-02-28T09:15:00Z",
  },
]);

/**
 * Detailed versions of sample tenants — used by the detail page.
 */
export const sampleTenantDetails: TenantDetail[] = TenantDetailSchema.array().parse(
  sampleTenants.map((tenant) => ({
    ...tenant,
    description: `Enterprise tenant for ${tenant.name}. Onboarded during the platform expansion initiative.`,
    contactEmail: `admin@${tenant.code.replace(/-/g, "")}.com`,
    createdBy: "system@hexalith.io",
    notes: `Working notes for ${tenant.name}. Last reviewed during the quarterly tenant audit.`,
  })),
);
