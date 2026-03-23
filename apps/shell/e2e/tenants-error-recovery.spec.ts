import { test, expect } from "./fixtures/test-fixtures";

test.describe("Tenants Error Recovery", () => {
  test("module error boundary retries and recovers", async ({ page }) => {
    await page.goto("/tenants/__e2e-error");

    await expect(
      page.getByText(
        "Unable to load Tenants. Other sections continue to work normally.",
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: /retry|try again/i }).click();

    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("Acme Corporation")).toBeVisible();
    await expect(
      page.getByText(
        "Unable to load Tenants. Other sections continue to work normally.",
      ),
    ).not.toBeVisible();
  });
});
