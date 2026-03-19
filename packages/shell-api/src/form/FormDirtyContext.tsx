import React, { createContext, useCallback, useContext, useState } from "react";

import type { FormDirtyContextValue } from "../types";

export const FormDirtyContext =
  createContext<FormDirtyContextValue | null>(null);

export function FormDirtyProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [isDirty, setIsDirty] = useState(false);
  const [dirtyFormId, setDirtyFormIdState] = useState<string | null>(null);

  const setDirty = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  const setDirtyFormId = useCallback((id: string | null) => {
    setDirtyFormIdState(id);
  }, []);

  const value: FormDirtyContextValue = {
    isDirty,
    setDirty,
    dirtyFormId,
    setDirtyFormId,
  };

  return (
    <FormDirtyContext.Provider value={value}>
      {children}
    </FormDirtyContext.Provider>
  );
}

export function useFormDirty(): FormDirtyContextValue {
  const ctx = useContext(FormDirtyContext);
  if (!ctx)
    throw new Error("useFormDirty must be used within FormDirtyProvider");
  return ctx;
}
