import React from "react";
import { renderHook, act, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";

import { FormDirtyProvider, useFormDirty } from "./FormDirtyContext";

afterEach(cleanup);

function renderFormDirtyHook() {
  return renderHook(() => useFormDirty(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <FormDirtyProvider>{children}</FormDirtyProvider>
    ),
  });
}

describe("FormDirtyProvider", () => {
  it("starts with isDirty = false", () => {
    const { result } = renderFormDirtyHook();
    expect(result.current.isDirty).toBe(false);
  });

  it("starts with dirtyFormId = null", () => {
    const { result } = renderFormDirtyHook();
    expect(result.current.dirtyFormId).toBeNull();
  });

  it("updates isDirty when setDirty is called", () => {
    const { result } = renderFormDirtyHook();

    act(() => {
      result.current.setDirty(true);
    });

    expect(result.current.isDirty).toBe(true);
  });

  it("resets isDirty back to false", () => {
    const { result } = renderFormDirtyHook();

    act(() => {
      result.current.setDirty(true);
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.setDirty(false);
    });
    expect(result.current.isDirty).toBe(false);
  });

  it("updates dirtyFormId when setDirtyFormId is called", () => {
    const { result } = renderFormDirtyHook();

    act(() => {
      result.current.setDirtyFormId("my-form");
    });

    expect(result.current.dirtyFormId).toBe("my-form");
  });

  it("clears dirtyFormId when set to null", () => {
    const { result } = renderFormDirtyHook();

    act(() => {
      result.current.setDirtyFormId("my-form");
    });
    expect(result.current.dirtyFormId).toBe("my-form");

    act(() => {
      result.current.setDirtyFormId(null);
    });
    expect(result.current.dirtyFormId).toBeNull();
  });
});

describe("useFormDirty outside provider", () => {
  it("throws error when used outside FormDirtyProvider", () => {
    expect(() => {
      renderHook(() => useFormDirty());
    }).toThrow("useFormDirty must be used within FormDirtyProvider");
  });
});
