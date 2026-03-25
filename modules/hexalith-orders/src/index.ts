export { OrderRootPage as default } from "./routes.js";
export { manifest } from "./manifest.js";
export { routes } from "./routes.js";

// Re-export domain types for consumers of this module
export type {
  OrderItem,
  OrderDetail,
  OrderLineItem,
  CreateOrderCommand,
} from "./schemas/orderSchemas.js";

export {
  OrderItemSchema,
  OrderDetailSchema,
  OrderLineItemSchema,
  CreateOrderCommandSchema,
} from "./schemas/orderSchemas.js";
