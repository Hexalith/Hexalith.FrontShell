import { z } from "zod";

const ExampleIdentifierSchema = z.string().uuid("ID must be a valid UUID");
const ExampleNameSchema = z
  .string()
  .min(3, "Name must be at least 3 characters")
  .max(200)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9 .,'&()/-]*$/,
    "Name can include letters, numbers, spaces, and common punctuation only",
  );
const ExampleCategorySchema = z
  .string()
  .min(2, "Category must be at least 2 characters")
  .max(100)
  .regex(
    /^[A-Za-z][A-Za-z &/-]*$/,
    "Category can include letters, spaces, ampersands, hyphens, and slashes only",
  );
const ExampleTimestampSchema = z
  .string()
  .datetime({ offset: true, message: "Timestamp must be a valid ISO 8601 date" });

/**
 * Example list view model — represents an item in table/list views.
 * Replace "Example" with your domain entity name (e.g., OrderItemSchema).
 */
export const ExampleItemSchema = z.object({
  id: ExampleIdentifierSchema,
  name: ExampleNameSchema,
  status: z.union([
    z.literal("Active"),
    z.literal("Inactive"),
    z.literal("Pending"),
    z.literal("Archived"),
  ]),
  description: z.string().max(500).optional(),
  category: ExampleCategorySchema,
  priority: z.union([
    z.literal("Low"),
    z.literal("Medium"),
    z.literal("High"),
    z.literal("Critical"),
  ]),
  createdAt: ExampleTimestampSchema,
  updatedAt: ExampleTimestampSchema,
});

/** Inferred type — use this instead of manually defining interfaces */
export type ExampleItem = z.infer<typeof ExampleItemSchema>;

/**
 * Example detail view model — full entity with audit and extra fields.
 * Extends the list schema with fields only needed on the detail page.
 */
export const ExampleDetailSchema = ExampleItemSchema.extend({
  notes: z.string().max(2000).optional(),
  createdBy: z.string().min(1),
});

export type ExampleDetail = z.infer<typeof ExampleDetailSchema>;

/**
 * Command input for creating a new example entity.
 * Validated both client-side (form) and server-side (event store).
 */
export const CreateExampleCommandSchema = z.object({
  name: ExampleNameSchema,
  description: z.string().max(500).optional(),
  category: ExampleCategorySchema,
  priority: z.union([
    z.literal("Low"),
    z.literal("Medium"),
    z.literal("High"),
    z.literal("Critical"),
  ]),
});

export type CreateExampleInput = z.infer<typeof CreateExampleCommandSchema>;
