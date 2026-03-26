export { ExampleRootPage as default } from "./routes.js";
export { manifest } from "./manifest.js";
export { routes } from "./routes.js";

// Re-export domain types for consumers of this module
export type {
  ExampleItem,
  ExampleDetail,
  CreateExampleInput,
  UpdateExampleInput,
} from "./schemas/exampleSchemas.js";

export {
  ExampleItemSchema,
  ExampleDetailSchema,
  CreateExampleCommandSchema,
  UpdateExampleCommandSchema,
} from "./schemas/exampleSchemas.js";
