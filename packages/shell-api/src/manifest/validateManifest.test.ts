import { describe, it, expect } from "vitest";

import { validateManifest } from "./validateManifest";
import type { ModuleManifest } from "./manifestTypes";

function validManifest(): ModuleManifest {
  return {
    manifestVersion: 1,
    name: "test-module",
    displayName: "Test Module",
    version: "0.1.0",
    routes: [{ path: "/" }, { path: "/detail/:id" }, { path: "/create" }],
    navigation: [
      { label: "Test Module", path: "/", icon: "box", category: "Modules" },
    ],
  };
}

describe("validateManifest", () => {
  it("validates a correct manifest", () => {
    const result = validateManifest(validManifest());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects manifest with empty name", () => {
    const m = { ...validManifest(), name: "" };
    const result = validateManifest(m);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "name")).toBe(true);
  });

  it("rejects manifest with uppercase name", () => {
    const m = { ...validManifest(), name: "MyModule" };
    const result = validateManifest(m);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "name")).toBe(true);
  });

  it("rejects manifest with invalid manifestVersion", () => {
    const m = { ...validManifest(), manifestVersion: 2 };
    const result = validateManifest(m);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.field === "manifestVersion"),
    ).toBe(true);
  });

  it("rejects manifest with empty routes", () => {
    const m = { ...validManifest(), routes: [] };
    const result = validateManifest(m);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "routes")).toBe(true);
  });

  it("rejects manifest with route missing leading slash", () => {
    const m = { ...validManifest(), routes: [{ path: "foo" }] };
    const result = validateManifest(m);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.field === "routes[0].path"),
    ).toBe(true);
  });

  it("rejects manifest with empty navigation", () => {
    const m = { ...validManifest(), navigation: [] };
    const result = validateManifest(m);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "navigation")).toBe(true);
  });

  it("rejects manifest with empty displayName", () => {
    const m = { ...validManifest(), displayName: "" };
    const result = validateManifest(m);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "displayName")).toBe(true);
  });

  it("rejects manifest with invalid semver", () => {
    const m = { ...validManifest(), version: "abc" };
    const result = validateManifest(m);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "version")).toBe(true);
  });

  it("warns when navigation path doesn't match a route", () => {
    const m = validManifest();
    m.navigation = [{ label: "Admin", path: "/admin" }];
    const result = validateManifest(m);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(
      result.warnings.some((w) => w.field === "navigation[0].path"),
    ).toBe(true);
  });

  it("accepts manifest with optional icon and category in navigation", () => {
    const m = validManifest();
    m.navigation = [
      {
        label: "Test",
        path: "/",
        icon: "settings",
        category: "admin",
      },
    ];
    const result = validateManifest(m);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("actual scaffold manifest passes validation", () => {
    const m: ModuleManifest = {
      manifestVersion: 1,
      name: "test-module",
      displayName: "Test Module",
      version: "0.1.0",
      routes: [{ path: "/" }, { path: "/detail/:id" }, { path: "/create" }],
      navigation: [
        {
          label: "Test Module",
          path: "/",
          icon: "box",
          category: "Modules",
        },
      ],
    };
    const result = validateManifest(m);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("rejects null input", () => {
    const result = validateManifest(null);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) => e.message === "Manifest must be a non-null object",
      ),
    ).toBe(true);
  });

  it("rejects undefined input", () => {
    const result = validateManifest(undefined);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) => e.message === "Manifest must be a non-null object",
      ),
    ).toBe(true);
  });
});
