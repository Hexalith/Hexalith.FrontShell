export { TenantRootPage as default } from "./routes.js";
export { manifest } from "./manifest.js";
export { routes } from "./routes.js";

// Re-export domain types for consumers of this module
export type {
  TenantItem,
  TenantDetail,
  CreateTenantInput,
  UpdateTenantInput,
  DisableTenantInput,
} from "./schemas/tenantSchemas.js";

export {
  TenantItemSchema,
  TenantListSchema,
  TenantDetailSchema,
  CreateTenantCommandSchema,
  UpdateTenantCommandSchema,
  DisableTenantCommandSchema,
} from "./schemas/tenantSchemas.js";
