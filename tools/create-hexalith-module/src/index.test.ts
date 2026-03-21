import { describe, expect, it } from "vitest";

import { toDisplayName, toPascalCase } from "./nameUtils.js";
import { validateModuleName } from "./validateModuleName.js";

describe("validateModuleName", () => {
  it("returns null for valid names", () => {
    expect(validateModuleName("my-orders")).toBeNull();
    expect(validateModuleName("orders")).toBeNull();
    expect(validateModuleName("my-cool-module")).toBeNull();
    expect(validateModuleName("a")).toBeNull();
    expect(validateModuleName("a1b2")).toBeNull();
  });

  it("rejects empty name", () => {
    expect(validateModuleName("")).toContain("required");
  });

  it("rejects names longer than 50 characters", () => {
    const longName = "a".repeat(51);
    expect(validateModuleName(longName)).toContain("50 characters");
  });

  it("accepts names at exactly 50 characters", () => {
    const name50 = "a".repeat(50);
    expect(validateModuleName(name50)).toBeNull();
  });

  it("rejects uppercase characters", () => {
    expect(validateModuleName("MyOrders")).toContain("lowercase");
  });

  it("rejects leading hyphens", () => {
    expect(validateModuleName("-orders")).toContain("lowercase");
  });

  it("rejects trailing hyphens", () => {
    expect(validateModuleName("orders-")).toContain("lowercase");
  });

  it("rejects consecutive hyphens", () => {
    expect(validateModuleName("my--orders")).toContain("lowercase");
  });

  it("rejects special characters", () => {
    expect(validateModuleName("my_orders")).toContain("lowercase");
    expect(validateModuleName("my.orders")).toContain("lowercase");
    expect(validateModuleName("my orders")).toContain("lowercase");
  });

  it("rejects JavaScript reserved words", () => {
    expect(validateModuleName("class")).toContain("reserved word");
    expect(validateModuleName("export")).toContain("reserved word");
    expect(validateModuleName("default")).toContain("reserved word");
    expect(validateModuleName("import")).toContain("reserved word");
    expect(validateModuleName("return")).toContain("reserved word");
  });
});

describe("toDisplayName", () => {
  it("converts hyphenated names to title case", () => {
    expect(toDisplayName("my-orders")).toBe("My Orders");
    expect(toDisplayName("orders")).toBe("Orders");
    expect(toDisplayName("my-cool-module")).toBe("My Cool Module");
  });
});

describe("toPascalCase", () => {
  it("converts hyphenated names to PascalCase", () => {
    expect(toPascalCase("my-orders")).toBe("MyOrders");
    expect(toPascalCase("orders")).toBe("Orders");
    expect(toPascalCase("my-cool-module")).toBe("MyCoolModule");
  });
});
