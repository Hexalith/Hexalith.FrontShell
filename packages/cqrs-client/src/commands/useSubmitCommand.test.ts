import React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { CqrsProvider } from "../CqrsProvider";
import { AuthError, ForbiddenError } from "../errors";
import { useSubmitCommand } from "./useSubmitCommand";
import { MockSignalRHub } from "../mocks/MockSignalRHub";

import type { SubmitCommandInput } from "./types";
import type { SubmitCommandResponse } from "../core/types";

// Mock fetchClient
const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock("../core/fetchClient", () => ({
  createFetchClient: vi.fn(() => ({
    post: mockPost,
    get: mockGet,
  })),
}));

// Mock useTenant
const mockUseTenant = vi.fn();
vi.mock("@hexalith/shell-api", () => ({
  useTenant: () => mockUseTenant(),
}));

const testCommand: SubmitCommandInput = {
  domain: "Tenants",
  aggregateId: "agg-1",
  commandType: "CreateTenant",
  payload: { name: "Acme" },
};

const mockSignalRHub = new MockSignalRHub();

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(CqrsProvider, {
      commandApiBaseUrl: "https://test",
      tokenGetter: () => Promise.resolve("token"),
      signalRHub: mockSignalRHub,
      children,
    });
  };
}

describe("useSubmitCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTenant.mockReturnValue({
      activeTenant: "test-tenant",
      availableTenants: ["test-tenant"],
      switchTenant: vi.fn(),
    });
  });

  it("returns object shape (not tuple)", () => {
    const { result } = renderHook(() => useSubmitCommand(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveProperty("submit");
    expect(result.current).toHaveProperty("correlationId");
    expect(result.current).toHaveProperty("error");
    expect(typeof result.current.submit).toBe("function");
  });

  it("successful submit sets correlationId", async () => {
    const response: SubmitCommandResponse = { correlationId: "corr-123" };
    mockPost.mockResolvedValueOnce(response);

    const { result } = renderHook(() => useSubmitCommand(), {
      wrapper: createWrapper(),
    });

    let submitResult: SubmitCommandResponse | undefined;
    await act(async () => {
      submitResult = await result.current.submit(testCommand);
    });

    expect(result.current.correlationId).toBe("corr-123");
    expect(submitResult?.correlationId).toBe("corr-123");
    expect(result.current.error).toBeNull();
  });

  it("includes tenant from context, not from caller", async () => {
    mockPost.mockResolvedValueOnce({ correlationId: "corr-1" });

    const { result } = renderHook(() => useSubmitCommand(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.submit(testCommand);
    });

    expect(mockPost).toHaveBeenCalledWith("/api/v1/commands", {
      body: {
        domain: "Tenants",
        aggregateId: "agg-1",
        commandType: "CreateTenant",
        payload: { name: "Acme" },
        tenant: "test-tenant",
      },
    });
  });

  it("throws ForbiddenError when no active tenant", async () => {
    mockUseTenant.mockReturnValue({
      activeTenant: null,
      availableTenants: [],
      switchTenant: vi.fn(),
    });

    const { result } = renderHook(() => useSubmitCommand(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.submit(testCommand);
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("error response sets error state AND re-throws", async () => {
    const authError = new AuthError("Session expired");
    mockPost.mockRejectedValueOnce(authError);

    const { result } = renderHook(() => useSubmitCommand(), {
      wrapper: createWrapper(),
    });

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.submit(testCommand);
      } catch (e) {
        thrown = e;
      }
    });

    expect(thrown).toBeInstanceOf(AuthError);
    expect(result.current.error).toBeInstanceOf(AuthError);
  });

  it("401 sets error to AuthError AND throws", async () => {
    const authError = new AuthError("Authentication required");
    mockPost.mockRejectedValueOnce(authError);

    const { result } = renderHook(() => useSubmitCommand(), {
      wrapper: createWrapper(),
    });

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.submit(testCommand);
      } catch (e) {
        thrown = e;
      }
    });

    expect(thrown).toBeInstanceOf(AuthError);
    expect(result.current.error).toBeInstanceOf(AuthError);
  });

  it("403 sets error to ForbiddenError AND throws", async () => {
    const forbiddenError = new ForbiddenError("Access forbidden");
    mockPost.mockRejectedValueOnce(forbiddenError);

    const { result } = renderHook(() => useSubmitCommand(), {
      wrapper: createWrapper(),
    });

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.submit(testCommand);
      } catch (e) {
        thrown = e;
      }
    });

    expect(thrown).toBeInstanceOf(ForbiddenError);
    expect(result.current.error).toBeInstanceOf(ForbiddenError);
  });

  it("non-HexalithError is re-thrown but not stored in error state", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network failure"));

    const { result } = renderHook(() => useSubmitCommand(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.submit(testCommand);
      }),
    ).rejects.toThrow("Network failure");

    // Not a HexalithError, so error state is not set
    expect(result.current.error).toBeNull();
  });
});
