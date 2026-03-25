import { describe, expect, it } from "vitest";

import {
  CreateOrderCommandSchema,
  OrderDetailSchema,
  OrderItemSchema,
  OrderLineItemSchema,
} from "./orderSchemas.js";
import { orderDetails, orderItems } from "../data/sampleData.js";

// AC: 7-3#1, 7-3#3

describe("OrderLineItemSchema", () => {
  it("parses valid line item data", () => {
    const valid = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567801",
      productName: "Enterprise License",
      quantity: 3,
      unitPrice: 499.99,
      lineTotal: 1499.97,
    };
    expect(OrderLineItemSchema.parse(valid)).toEqual(valid);
  });

  it("rejects invalid line item data", () => {
    expect(() =>
      OrderLineItemSchema.parse({ id: "not-uuid", productName: "", quantity: -1, unitPrice: -5, lineTotal: -1 }),
    ).toThrow();
  });
});

describe("OrderItemSchema", () => {
  it("parses valid order item data", () => {
    const valid = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567801",
      orderNumber: "ORD-2026-001",
      customerName: "Acme Corporation",
      status: "confirmed" as const,
      totalAmount: 1247.50,
      itemCount: 3,
      createdAt: "2026-01-15T08:30:00Z",
    };
    expect(OrderItemSchema.parse(valid)).toEqual(valid);
  });

  it("rejects missing required fields", () => {
    expect(() => OrderItemSchema.parse({})).toThrow();
  });

  it("rejects invalid status values", () => {
    expect(() =>
      OrderItemSchema.parse({
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567801",
        orderNumber: "ORD-001",
        customerName: "Test",
        status: "invalid-status",
        totalAmount: 0,
        itemCount: 0,
        createdAt: "2026-01-01T00:00:00Z",
      }),
    ).toThrow();
  });

  it("accepts all valid status values", () => {
    const base = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567801",
      orderNumber: "ORD-001",
      customerName: "Test",
      totalAmount: 0,
      itemCount: 0,
      createdAt: "2026-01-01T00:00:00Z",
    };
    for (const status of ["draft", "confirmed", "shipped", "delivered", "cancelled"]) {
      expect(OrderItemSchema.parse({ ...base, status })).toHaveProperty("status", status);
    }
  });

  it("validates all sample items", () => {
    for (const item of orderItems) {
      expect(OrderItemSchema.parse(item)).toEqual(item);
    }
  });
});

describe("OrderDetailSchema", () => {
  it("extends OrderItemSchema correctly", () => {
    const valid = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567801",
      orderNumber: "ORD-2026-001",
      customerName: "Acme Corporation",
      status: "confirmed" as const,
      totalAmount: 1247.50,
      itemCount: 1,
      createdAt: "2026-01-15T08:30:00Z",
      shippingAddress: "123 Main Street",
      billingAddress: "123 Main Street",
      items: [
        {
          id: "a1b2c3d4-e5f6-7890-abcd-ef1234567801",
          productName: "License",
          quantity: 1,
          unitPrice: 1247.50,
          lineTotal: 1247.50,
        },
      ],
      updatedAt: "2026-02-01T10:00:00Z",
    };
    const parsed = OrderDetailSchema.parse(valid);
    expect(parsed.shippingAddress).toBe("123 Main Street");
    expect(parsed.items).toHaveLength(1);
    expect(parsed.updatedAt).toBe("2026-02-01T10:00:00Z");
  });

  it("allows optional notes field", () => {
    const withNotes = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567801",
      orderNumber: "ORD-001",
      customerName: "Test",
      status: "draft" as const,
      totalAmount: 0,
      itemCount: 0,
      createdAt: "2026-01-01T00:00:00Z",
      shippingAddress: "Address",
      billingAddress: "Address",
      items: [],
      updatedAt: "2026-01-01T00:00:00Z",
      notes: "Some notes",
    };
    expect(OrderDetailSchema.parse(withNotes).notes).toBe("Some notes");

    const withoutNotes = { ...withNotes, notes: undefined };
    expect(OrderDetailSchema.parse(withoutNotes).notes).toBeUndefined();
  });

  it("validates all sample details", () => {
    for (const detail of orderDetails) {
      expect(OrderDetailSchema.parse(detail)).toEqual(detail);
    }
  });
});

describe("CreateOrderCommandSchema", () => {
  it("parses valid command data", () => {
    const valid = {
      customerName: "Acme Corporation",
      shippingAddress: "123 Main Street",
      billingAddress: "456 Billing Ave",
    };
    expect(CreateOrderCommandSchema.parse(valid)).toEqual(valid);
  });

  it("allows optional notes", () => {
    const withNotes = {
      customerName: "Test",
      shippingAddress: "Address",
      billingAddress: "Address",
      notes: "Rush delivery",
    };
    expect(CreateOrderCommandSchema.parse(withNotes).notes).toBe("Rush delivery");
  });

  it("rejects empty required fields", () => {
    expect(() =>
      CreateOrderCommandSchema.parse({
        customerName: "",
        shippingAddress: "",
        billingAddress: "",
      }),
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => CreateOrderCommandSchema.parse({})).toThrow();
  });
});
