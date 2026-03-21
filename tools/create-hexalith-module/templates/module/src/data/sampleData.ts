import {
  ExampleDetailSchema,
  ExampleItemSchema,
  type ExampleDetail,
  type ExampleItem,
} from "../schemas/exampleSchemas.js";

/**
 * Query param constants — MockQueryBus in the dev host matches on these
 * to return the correct sample data for each page.
 */
export const EXAMPLE_LIST_QUERY = {
  domain: "__MODULE_NAME__",
  queryType: "ExampleList",
} as const;

export const EXAMPLE_DETAIL_QUERY = {
  domain: "__MODULE_NAME__",
  queryType: "ExampleDetail",
} as const;

/**
 * Realistic sample data for the example module.
 * Uses domain-agnostic, professional vocabulary — NOT placeholder text.
 */
export const exampleItems: ExampleItem[] = ExampleItemSchema.array().parse([
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567801",
    name: "Project Atlas",
    status: "Active",
    description: "Cross-functional initiative to consolidate regional supply chains into a unified logistics platform.",
    category: "Operations",
    priority: "High",
    createdAt: "2025-09-15T08:30:00Z",
    updatedAt: "2026-02-10T14:22:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567802",
    name: "Operation Horizon",
    status: "Active",
    description: "Long-term strategic review of market expansion opportunities in the Asia-Pacific corridor.",
    category: "Research",
    priority: "Critical",
    createdAt: "2025-10-01T09:00:00Z",
    updatedAt: "2026-03-01T11:45:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567803",
    name: "Northern Distribution Hub",
    status: "Pending",
    description: "Feasibility study for a new distribution center in the northern region to reduce last-mile delivery times.",
    category: "Operations",
    priority: "Medium",
    createdAt: "2025-11-20T13:15:00Z",
    updatedAt: "2026-01-28T09:30:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567804",
    name: "Brand Refresh Campaign",
    status: "Active",
    description: "Comprehensive rebrand covering visual identity, messaging framework, and digital presence guidelines.",
    category: "Marketing",
    priority: "High",
    createdAt: "2025-12-05T10:00:00Z",
    updatedAt: "2026-02-20T16:10:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567805",
    name: "Compliance Modernization",
    status: "Active",
    description: "Updating regulatory compliance processes to align with new industry standards effective Q3.",
    category: "Finance",
    priority: "Critical",
    createdAt: "2025-08-22T07:45:00Z",
    updatedAt: "2026-03-05T08:00:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567806",
    name: "Platform Migration v3",
    status: "Archived",
    description: "Migration of legacy on-premise services to cloud infrastructure completed ahead of schedule.",
    category: "Engineering",
    priority: "Low",
    createdAt: "2025-06-10T11:20:00Z",
    updatedAt: "2025-12-18T15:30:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567807",
    name: "Quality Assurance Framework",
    status: "Pending",
    description: "Establishing standardized QA processes across all product teams to improve release consistency.",
    category: "Engineering",
    priority: "Medium",
    createdAt: "2026-01-08T14:00:00Z",
    updatedAt: "2026-02-15T10:20:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567808",
    name: "Customer Insights Pipeline",
    status: "Active",
    description: "Automated analytics pipeline aggregating customer feedback from support, surveys, and usage telemetry.",
    category: "Research",
    priority: "High",
    createdAt: "2025-11-01T09:30:00Z",
    updatedAt: "2026-03-10T12:00:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567809",
    name: "Annual Budget Review",
    status: "Inactive",
    description: "Fiscal year budget analysis and variance report for departmental allocation adjustments.",
    category: "Finance",
    priority: "Low",
    createdAt: "2025-07-15T08:00:00Z",
    updatedAt: "2025-11-30T17:00:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567810",
    name: "Partner Enablement Program",
    status: "Active",
    description: "Training and certification program for channel partners to improve solution delivery quality.",
    category: "Marketing",
    priority: "Medium",
    createdAt: "2025-12-20T10:45:00Z",
    updatedAt: "2026-02-28T09:15:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567811",
    name: "Internal Knowledge Base",
    status: "Pending",
    description: "Centralized documentation platform for cross-team knowledge sharing and onboarding resources.",
    category: "Engineering",
    priority: "Low",
    createdAt: "2026-02-01T11:00:00Z",
    updatedAt: "2026-03-12T14:30:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567812",
    name: "Sustainability Reporting",
    status: "Archived",
    description: "Annual environmental impact assessment and carbon footprint report for stakeholder disclosure.",
    category: "Operations",
    priority: "Medium",
    createdAt: "2025-05-18T13:00:00Z",
    updatedAt: "2025-10-25T16:45:00Z",
  },
]);

/**
 * Detailed versions of sample items — used by the detail page.
 * Extends list items with notes and createdBy fields.
 */
export const exampleDetails: ExampleDetail[] = ExampleDetailSchema.array().parse(
  exampleItems.map((item) => ({
    ...item,
    notes: `Working notes for ${item.name}. Last reviewed during the quarterly planning cycle.`,
    createdBy: "system@hexalith.io",
  })),
);
