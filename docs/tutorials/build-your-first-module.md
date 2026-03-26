# Build Your First Module

A step-by-step guide to creating a Hexalith module from scaffold to running dev host. By the end, you'll have a working **Products** module with list, detail, create, and edit pages.

**Time:** ~45 minutes | **Prerequisites:** Node 22+, pnpm 9+, repo cloned with `pnpm install` complete.

---

## Part 1: Plan Your Module

Before scaffolding, decide three things:

| Decision | Example | Why it matters |
|----------|---------|---------------|
| **Module name** (kebab-case) | `products` | Becomes the directory name (`hexalith-products`), package name (`@hexalith/products`), and route prefix (`/products`) |
| **Domain name** (PascalCase) | `Products` | Used in CQRS query/command keys — must match your backend domain |
| **Entity name** (PascalCase) | `Product` | Names your schemas, pages, and types: `ProductItem`, `ProductDetailPage`, etc. |

> **Naming tip:** Use plural for the module/domain (`Products`), singular for the entity (`Product`). The scaffold generates `Example*` — you'll replace it with your entity name.

## Part 2: Scaffold

```bash
pnpm create-module products
```

This creates `modules/hexalith-products/` with ~40 files: pages, schemas, routes, tests, dev host, and config.

Verify it worked:

```bash
cd modules/hexalith-products
pnpm dev
```

Open `http://localhost:5173` — you should see the Example list page with sample data. Press `Ctrl+C` to stop.

## Part 3: Understand the Structure

```
modules/hexalith-products/src/
├── index.ts          # Public exports (manifest, routes, schemas)
├── manifest.ts       # Declares routes and sidebar navigation
├── routes.tsx        # Lazy-loaded page components
├── pages/            # List, Detail, Create, Edit pages + tests
├── schemas/          # Zod domain types
├── data/             # Sample data and query constants
├── testing/          # renderWithProviders test helper
├── components/       # (empty — add reusable UI here)
└── hooks/            # (empty — add custom hooks here)
```

The three files that wire everything together:

- **`manifest.ts`** — Tells the shell which routes this module owns and where to show it in the sidebar
- **`routes.tsx`** — Maps URL paths to page components (code-split with `React.lazy`)
- **`schemas/exampleSchemas.ts`** — Zod schemas that validate data from the backend

## Part 4: Rename the Domain

The scaffold uses `Example` as a placeholder. Replace it with your entity name throughout. Here's what changes:

### 4.1 — Schemas

Open `src/schemas/exampleSchemas.ts`. Rename the file to `productSchemas.ts`, then rename all types:

| Before | After |
|--------|-------|
| `ExampleItemSchema` | `ProductItemSchema` |
| `ExampleDetailSchema` | `ProductDetailSchema` |
| `CreateExampleCommandSchema` | `CreateProductCommandSchema` |
| `UpdateExampleCommandSchema` | `UpdateProductCommandSchema` |
| `ExampleItem` | `ProductItem` |
| `ExampleDetail` | `ProductDetail` |

Now customize the fields for your domain. For a Products module:

```typescript
export const ProductItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Product name is required").max(200),
  sku: z.string().min(1).max(50),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  inStock: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
});

export type ProductItem = z.infer<typeof ProductItemSchema>;

export const ProductDetailSchema = ProductItemSchema.extend({
  description: z.string().max(2000).optional(),
  supplier: z.string().optional(),
  updatedAt: z.string().datetime({ offset: true }),
});

export type ProductDetail = z.infer<typeof ProductDetailSchema>;

export const CreateProductCommandSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  sku: z.string().min(1, "SKU is required").max(50),
  category: z.string().min(1, "Category is required"),
  price: z.number().nonnegative("Price must be positive"),
  description: z.string().max(2000).optional(),
  supplier: z.string().optional(),
});

export type CreateProductCommand = z.infer<typeof CreateProductCommandSchema>;

export const UpdateProductCommandSchema = CreateProductCommandSchema;
export type UpdateProductCommand = z.infer<typeof UpdateProductCommandSchema>;
```

### 4.2 — Sample Data

Open `src/data/sampleData.ts`. Update the query constants to match your backend:

```typescript
export const PRODUCT_LIST_QUERY = {
  domain: "Products",
  queryType: "GetProducts",
} as const;

export const PRODUCT_DETAIL_QUERY = {
  domain: "Products",
  queryType: "GetProductById",
} as const;

export function buildProductDetailQuery(id: string) {
  return {
    domain: "Products",
    queryType: "GetProductById",
    aggregateId: id,
  };
}
```

Then replace the sample items with realistic product data. Use your Zod schemas to validate:

```typescript
export const productItems: ProductItem[] = ProductItemSchema.array().parse([
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567801",
    name: "Industrial Sensor Module",
    sku: "ISM-4200",
    category: "Electronics",
    price: 149.99,
    inStock: true,
    createdAt: "2025-09-15T08:30:00Z",
  },
  // ... more items
]);
```

> **Why Zod parse?** It validates your sample data at load time. If a field is wrong, you get a clear error instead of silent bugs.

### 4.3 — Pages

Rename page files and update their contents:

| File | Rename to | Key changes |
|------|-----------|-------------|
| `ExampleListPage.tsx` | `ProductListPage.tsx` | Table columns, query constant |
| `ExampleDetailPage.tsx` | `ProductDetailPage.tsx` | Detail sections, field labels |
| `ExampleCreatePage.tsx` | `ProductCreatePage.tsx` | Form fields, command type |
| `ExampleEditPage.tsx` | `ProductEditPage.tsx` | Form fields, `defaultValues`, command type |

For each page, update:

1. **Imports** — point to `productSchemas.js` and your renamed query functions
2. **Query hooks** — use your `PRODUCT_LIST_QUERY` / `buildProductDetailQuery`
3. **Command hooks** — set `domain: "Products"` and `commandType: "CreateProduct"` / `"UpdateProduct"`
4. **UI** — customize table columns, detail view sections, form fields

### 4.4 — Routes & Manifest

In `routes.tsx`, update the lazy imports to point to your renamed pages:

```typescript
const ProductListPage = lazy(() =>
  import("./pages/ProductListPage.js").then((m) => ({
    default: m.ProductListPage,
  })),
);
// ... same pattern for Detail, Create, Edit
```

In `manifest.ts`, update the display name and icon:

```typescript
export const manifest: ModuleManifest = {
  manifestVersion: 1,
  name: "products",
  displayName: "Products",
  version: "0.1.0",
  routes: [
    { path: "/" },
    { path: "/detail/:id" },
    { path: "/create" },
    { path: "/edit/:id" },
  ],
  navigation: [
    {
      label: "Products",
      path: "/",
      icon: "box",        // Choose an icon that fits your domain
      category: "Modules",
    },
  ],
};
```

### 4.5 — Exports

Update `index.ts` to export your renamed types and schemas:

```typescript
export { ProductRootPage as default } from "./routes.js";
export { manifest } from "./manifest.js";
export { routes } from "./routes.js";

export type {
  ProductItem,
  ProductDetail,
  CreateProductCommand,
  UpdateProductCommand,
} from "./schemas/productSchemas.js";

export {
  ProductItemSchema,
  ProductDetailSchema,
  CreateProductCommandSchema,
  UpdateProductCommandSchema,
} from "./schemas/productSchemas.js";
```

## Part 5: Test in the Dev Host

The dev host runs your module in isolation with mock providers:

```bash
pnpm dev
```

Update `dev-host/mockSetup.ts` to wire your query constants to sample data:

```typescript
import { MockCommandBus, MockQueryBus } from "@hexalith/cqrs-client";
import { productItems, productDetails, PRODUCT_LIST_QUERY, PRODUCT_DETAIL_QUERY } from "../src/data/sampleData";

const mockQueryBus = new MockQueryBus({ delay: 300 });

const listKey = `test-tenant:${PRODUCT_LIST_QUERY.domain}:${PRODUCT_LIST_QUERY.queryType}::`;
mockQueryBus.setResponse(listKey, productItems);

for (const detail of productDetails) {
  const detailKey = `test-tenant:${PRODUCT_DETAIL_QUERY.domain}:${PRODUCT_DETAIL_QUERY.queryType}:${detail.id}:`;
  mockQueryBus.setResponse(detailKey, detail);
}
```

The query key format is `{tenantId}:{domain}:{queryType}:{aggregateId}:`. Empty `aggregateId` for list queries.

## Part 6: Write a Test

Open `src/pages/ProductListPage.test.tsx` (scaffolded with basic tests). Add a domain-specific test:

```typescript
it("renders product data in table", async () => {
  renderWithProviders(<ProductListPage />);

  await waitFor(() => {
    expect(screen.getByText("Industrial Sensor Module")).toBeInTheDocument();
  });

  expect(screen.getByText("ISM-4200")).toBeInTheDocument();
});
```

Run tests:

```bash
pnpm test           # Unit tests (Vitest)
pnpm test:ct        # Component tests (Playwright CT)
```

## Part 7: Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Example" still shows in the UI | Missed a rename | Search for `Example` across all files |
| Query returns empty data | Mock key mismatch | Check the query key format: `{tenant}:{domain}:{queryType}:{id}:` |
| Zod validation error on load | Schema mismatch with sample data | Run `pnpm test` — Zod parse errors show exactly which field failed |
| ESLint "restricted import" error | Direct Radix UI import | Use `@hexalith/ui` components instead |
| Page shows spinner forever | Missing mock response in dev-host | Add `mockQueryBus.setResponse(key, data)` in `mockSetup.ts` |

## Part 8: Integration Checklist

Before submitting your module:

- [ ] All `Example` references replaced with your entity name
- [ ] `manifest.ts` has correct name, displayName, and routes
- [ ] `index.ts` exports all public types and schemas
- [ ] Sample data validates against Zod schemas (tests pass)
- [ ] Dev host shows all 4 pages working (list → detail → create → edit)
- [ ] `pnpm test` passes (unit + component tests)
- [ ] `pnpm lint` passes (ESLint + module boundaries)
- [ ] No hardcoded colors/spacing (use design tokens)
- [ ] No direct Radix imports (use `@hexalith/ui`)

## Next Steps

- **[Module Development](../module-development.md)** — Full reference for manifest fields, CQRS hooks, and UI patterns
- **[UX Interaction Patterns](../../design-artifacts/C-UX-Scenarios/ux-interaction-patterns.md)** — Page templates and state handling rules
- **[Component Usage Guidelines](../../design-artifacts/D-Design-System/component-usage-guidelines.md)** — Which component to use when
- **[Testing Strategy](../testing-strategy.md)** — Test pyramid and quality standards
