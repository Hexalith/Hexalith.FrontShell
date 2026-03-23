import { test, expect, checkAccessibility } from "./fixtures/test-fixtures";

test.describe("Tenants Switching", () => {
  test("switching tenant from the status bar refreshes table data", async ({
    page,
  }) => {
    await page.goto("/tenants");
    await expect(page.getByRole("table")).toBeVisible();

    await expect(page.getByText("Acme Corporation")).toBeVisible();
    await expect(page.getByText("TechVentures Inc.")).toBeVisible();
    await expect(page.getByText("BlueSky Retail Group")).not.toBeVisible();

    const tenantSwitcher = page.getByLabel("Switch tenant");
    await tenantSwitcher.selectOption("tenant-beta");

    await expect(tenantSwitcher).toHaveValue("tenant-beta");
    await expect(page.getByText("BlueSky Retail Group")).toBeVisible();
    await expect(page.getByText("Cedar Health Partners")).toBeVisible();
    await expect(page.getByText("Lighthouse Education Trust")).toBeVisible();
    await expect(page.getByText("Acme Corporation")).not.toBeVisible();

    await checkAccessibility(page);
  });
});
