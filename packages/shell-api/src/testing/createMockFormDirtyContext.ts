import { createMockFn } from "./createMockFn";

import type { FormDirtyContextValue } from "../types";

export function createMockFormDirtyContext(
  overrides?: Partial<FormDirtyContextValue>,
): FormDirtyContextValue {
  return {
    isDirty: false,
    setDirty: createMockFn<[boolean], void>(),
    dirtyFormId: null,
    setDirtyFormId: createMockFn<[string | null], void>(),
    ...overrides,
  };
}
