import { describe, expect, it } from "vitest";

import {
  ORDER_DETAIL_QUERY,
  ORDER_LIST_QUERY,
  buildOrderDetailQuery,
  orderDetails,
  orderItems,
} from "./sampleData.js";
import { OrderDetailSchema, OrderItemSchema } from "../schemas/orderSchemas.js";

// AC: 7-3#1

describe("sampleData", () => {
  it("all sample items validate against OrderItemSchema", () => {
    for (const item of orderItems) {
      expect(() => OrderItemSchema.parse(item)).not.toThrow();
    }
  });

  it("all sample details validate against OrderDetailSchema", () => {
    for (const detail of orderDetails) {
      expect(() => OrderDetailSchema.parse(detail)).not.toThrow();
    }
  });

  it("has non-empty order items", () => {
    expect(orderItems.length).toBeGreaterThan(0);
  });

  it("has non-empty order details", () => {
    expect(orderDetails.length).toBeGreaterThan(0);
  });

  it("query constants are defined and non-empty", () => {
    expect(ORDER_LIST_QUERY.domain).toBe("Orders");
    expect(ORDER_LIST_QUERY.queryType).toBe("GetOrders");
    expect(ORDER_DETAIL_QUERY.domain).toBe("Orders");
    expect(ORDER_DETAIL_QUERY.queryType).toBe("GetOrderById");
  });

  it("detail count matches item count", () => {
    expect(orderDetails).toHaveLength(orderItems.length);
  });

  it("detail IDs match item IDs", () => {
    const itemIds = orderItems.map((i) => i.id);
    const detailIds = orderDetails.map((d) => d.id);
    expect(detailIds).toEqual(itemIds);
  });

  it("buildOrderDetailQuery returns correct params", () => {
    const params = buildOrderDetailQuery("test-id");
    expect(params.domain).toBe("Orders");
    expect(params.queryType).toBe("GetOrderById");
    expect(params.aggregateId).toBe("test-id");
  });
});
