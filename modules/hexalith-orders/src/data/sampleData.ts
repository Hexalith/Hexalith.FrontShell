import {
  OrderDetailSchema,
  OrderItemSchema,
  type OrderDetail,
  type OrderItem,
} from "../schemas/orderSchemas.js";

/**
 * Query param constants — MockQueryBus in the dev host matches on these
 * to return the correct sample data for each page.
 */
export const ORDER_LIST_QUERY = {
  domain: "Orders",
  queryType: "GetOrders",
} as const;

export const ORDER_DETAIL_QUERY = {
  domain: "Orders",
  queryType: "GetOrderById",
} as const;

export function buildOrderDetailQuery(id: string) {
  return {
    domain: "Orders",
    queryType: "GetOrderById",
    aggregateId: id,
  };
}

function createDeterministicLineItems(order: OrderItem, orderIndex: number) {
  const priceMultipliers = [0.82, 0.94, 1.07, 1.15, 0.89] as const;

  return Array.from({ length: order.itemCount }, (_, itemIndex) => {
    const quantity = ((orderIndex + itemIndex) % 5) + 1;
    const unitPrice = Number(
      (
        (order.totalAmount / Math.max(order.itemCount, 1)) *
        priceMultipliers[(orderIndex + itemIndex) % priceMultipliers.length]
      ).toFixed(2),
    );

    return {
      id: `${order.id.slice(0, -2)}${String(itemIndex + 1).padStart(2, "0")}`,
      productName: [
        "Enterprise License",
        "Support Package",
        "Implementation Kit",
        "Training Module",
        "Integration Adapter",
      ][itemIndex % 5],
      quantity,
      unitPrice,
      lineTotal: Number((quantity * unitPrice).toFixed(2)),
    };
  });
}

/**
 * Realistic sample data for the orders module.
 * Uses domain-specific vocabulary — NOT placeholder text.
 */
export const orderItems: OrderItem[] = OrderItemSchema.array().parse([
  {
    id: "c1d2e3f4-a5b6-7890-abcd-ef1234567801",
    orderNumber: "ORD-2026-001",
    customerName: "Acme Corporation",
    status: "confirmed",
    totalAmount: 1247.5,
    itemCount: 3,
    createdAt: "2026-01-15T08:30:00Z",
  },
  {
    id: "c1d2e3f4-a5b6-7890-abcd-ef1234567802",
    orderNumber: "ORD-2026-002",
    customerName: "TechVentures Inc.",
    status: "shipped",
    totalAmount: 3892.0,
    itemCount: 7,
    createdAt: "2026-01-22T14:15:00Z",
  },
  {
    id: "c1d2e3f4-a5b6-7890-abcd-ef1234567803",
    orderNumber: "ORD-2026-003",
    customerName: "GlobalTrade Solutions",
    status: "draft",
    totalAmount: 562.75,
    itemCount: 2,
    createdAt: "2026-02-03T09:45:00Z",
  },
  {
    id: "c1d2e3f4-a5b6-7890-abcd-ef1234567804",
    orderNumber: "ORD-2026-004",
    customerName: "Northern Logistics Group",
    status: "delivered",
    totalAmount: 8450.0,
    itemCount: 12,
    createdAt: "2026-02-10T11:00:00Z",
  },
  {
    id: "c1d2e3f4-a5b6-7890-abcd-ef1234567805",
    orderNumber: "ORD-2026-005",
    customerName: "Pinnacle Financial Services",
    status: "confirmed",
    totalAmount: 2100.25,
    itemCount: 4,
    createdAt: "2026-02-18T16:30:00Z",
  },
  {
    id: "c1d2e3f4-a5b6-7890-abcd-ef1234567806",
    orderNumber: "ORD-2026-006",
    customerName: "Horizon Healthcare Partners",
    status: "cancelled",
    totalAmount: 975.0,
    itemCount: 1,
    createdAt: "2026-02-25T07:20:00Z",
  },
  {
    id: "c1d2e3f4-a5b6-7890-abcd-ef1234567807",
    orderNumber: "ORD-2026-007",
    customerName: "Summit Engineering Co.",
    status: "shipped",
    totalAmount: 5320.5,
    itemCount: 8,
    createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "c1d2e3f4-a5b6-7890-abcd-ef1234567808",
    orderNumber: "ORD-2026-008",
    customerName: "Cascade Media Group",
    status: "draft",
    totalAmount: 430.0,
    itemCount: 2,
    createdAt: "2026-03-05T13:45:00Z",
  },
  {
    id: "c1d2e3f4-a5b6-7890-abcd-ef1234567809",
    orderNumber: "ORD-2026-009",
    customerName: "Meridian Consulting",
    status: "confirmed",
    totalAmount: 1875.0,
    itemCount: 5,
    createdAt: "2026-03-10T08:15:00Z",
  },
  {
    id: "c1d2e3f4-a5b6-7890-abcd-ef1234567810",
    orderNumber: "ORD-2026-010",
    customerName: "Vanguard Industries",
    status: "delivered",
    totalAmount: 12680.0,
    itemCount: 15,
    createdAt: "2026-03-15T15:00:00Z",
  },
]);

/**
 * Detailed versions of sample orders — used by the detail page.
 * Extends list items with shipping, notes, line items, and updatedAt.
 */
export const orderDetails: OrderDetail[] = OrderDetailSchema.array().parse(
  orderItems.map((item, index) => ({
    ...item,
    shippingAddress: [
      "123 Main Street, Suite 400, New York, NY 10001",
      "456 Innovation Drive, San Francisco, CA 94105",
      "789 Commerce Blvd, Chicago, IL 60601",
      "321 Harbor Way, Seattle, WA 98101",
      "654 Financial Plaza, Boston, MA 02110",
      "987 Healthcare Lane, Denver, CO 80202",
      "147 Engineering Road, Austin, TX 78701",
      "258 Media Circle, Los Angeles, CA 90001",
      "369 Consulting Ave, Miami, FL 33101",
      "741 Industry Park, Detroit, MI 48201",
    ][index],
    billingAddress: [
      "123 Main Street, Suite 400, New York, NY 10001",
      "456 Innovation Drive, San Francisco, CA 94105",
      "789 Commerce Blvd, Chicago, IL 60601",
      "321 Harbor Way, Seattle, WA 98101",
      "654 Financial Plaza, Boston, MA 02110",
      "987 Healthcare Lane, Denver, CO 80202",
      "147 Engineering Road, Austin, TX 78701",
      "258 Media Circle, Los Angeles, CA 90001",
      "369 Consulting Ave, Miami, FL 33101",
      "741 Industry Park, Detroit, MI 48201",
    ][index],
    notes: [
      "Priority shipment — customer requested expedited delivery.",
      "Bulk order for Q1 infrastructure refresh.",
      undefined,
      "Delivered ahead of schedule. Customer confirmed receipt.",
      "Recurring quarterly order. Apply standard discount.",
      "Cancelled per customer request — budget reallocation.",
      "International shipping — customs documentation attached.",
      undefined,
      "Consultation package with implementation support.",
      "Largest order this quarter. VP-level approval obtained.",
    ][index],
    items: createDeterministicLineItems(item, index),
    updatedAt: new Date(
      new Date(item.createdAt).getTime() + (index + 1) * 86400000 * 3,
    ).toISOString(),
  })),
);
