import { test, expect, checkAccessibility } from "./fixtures/test-fixtures";

// AC: 6-4#7 — E2E tenant navigation flows
test.describe("Tenants Navigation", () => {
  test("navigate to tenant list, click row, see detail, navigate back", async ({
    page,
  }) => {
    await page.goto("/tenants");

    // Verify table renders with tenant data
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("Acme Corporation")).toBeVisible();

    // Click a known tenant row
    await page.getByRole("row").filter({ hasText: /Acme/ }).click();

    // Verify detail page
    await expect(page).toHaveURL(/\/tenants\/detail\//);
    await expect(page.getByText("General Information")).toBeVisible();

    // Navigate back
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page).toHaveURL(/\/tenants$/);
  });

  test("accessibility check on list page", async ({ page }) => {
    await page.goto("/tenants");
    await expect(page.getByRole("table")).toBeVisible();
    await checkAccessibility(page);
  });

  test("dark mode accessibility check on list page", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/tenants");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await checkAccessibility(page);
  });

  test("accessibility check on detail page", async ({ page }) => {
    await page.goto("/tenants");
    await expect(page.getByRole("table")).toBeVisible();
    await page.getByRole("row").filter({ hasText: /Acme/ }).click();
    await expect(page.getByText("General Information")).toBeVisible();
    await checkAccessibility(page);
  });
});
