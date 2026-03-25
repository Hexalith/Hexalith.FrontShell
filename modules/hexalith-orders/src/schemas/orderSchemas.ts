import { z } from "zod";

const OrderIdentifierSchema = z.string().uuid("ID must be a valid UUID");
const OrderNumberSchema = z
  .string()
  .min(1, "Order number is required")
  .max(50);
const CustomerNameSchema = z
  .string()
  .min(1, "Customer name is required")
  .max(200);
const OrderTimestampSchema = z
  .string()
  .datetime({ offset: true, message: "Timestamp must be a valid ISO 8601 date" });

/**
 * Order line item — represents a single product line within an order.
 */
export const OrderLineItemSchema = z.object({
  id: OrderIdentifierSchema,
  productName: z.string().min(1).max(200),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
});

export type OrderLineItem = z.infer<typeof OrderLineItemSchema>;

/**
 * Order list view model — represents an order in table/list views.
 */
export const OrderItemSchema = z.object({
  id: OrderIdentifierSchema,
  orderNumber: OrderNumberSchema,
  customerName: CustomerNameSchema,
  status: z.union([
    z.literal("draft"),
    z.literal("confirmed"),
    z.literal("shipped"),
    z.literal("delivered"),
    z.literal("cancelled"),
  ]),
  totalAmount: z.number().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  createdAt: OrderTimestampSchema,
});

/** Inferred type — use this instead of manually defining interfaces */
export type OrderItem = z.infer<typeof OrderItemSchema>;

/**
 * Order detail view model — full entity with shipping and audit fields.
 * Extends the list schema with fields only needed on the detail page.
 *
 * Note: the `items` field exists for domain completeness and is used in
 * sample data/tests, but OrderDetailPage does NOT render it — only
 * `itemCount` is displayed. DetailView renders label/value pairs, not
 * nested arrays.
 */
export const OrderDetailSchema = OrderItemSchema.extend({
  shippingAddress: z.string().min(1),
  billingAddress: z.string().min(1),
  notes: z.string().max(2000).optional(),
  items: z.array(OrderLineItemSchema),
  updatedAt: OrderTimestampSchema,
});

export type OrderDetail = z.infer<typeof OrderDetailSchema>;

/**
 * Command input for creating a new order.
 * Static fields only — matching scaffold ExampleCreatePage pattern.
 * No dynamic arrays (line items added separately after order creation).
 */
export const CreateOrderCommandSchema = z.object({
  customerName: z.string().min(1, "Customer name is required").max(200),
  shippingAddress: z.string().min(1, "Shipping address is required").max(500),
  billingAddress: z.string().min(1, "Billing address is required").max(500),
  notes: z.string().max(2000).optional(),
});

export type CreateOrderCommand = z.infer<typeof CreateOrderCommandSchema>;
