import { test, expect, checkAccessibility } from "./fixtures/test-fixtures";

// AC: 6-4#7 — E2E tenant create flow
test.describe("Tenants Create", () => {
  test("create tenant: form validation, submit, toast, redirect", async ({
    page,
  }) => {
    await page.goto("/tenants");
    await expect(page.getByRole("table")).toBeVisible();

    // Navigate to create page
    await page.getByRole("button", { name: /create tenant/i }).click();
    await expect(page).toHaveURL(/\/tenants\/create$/);

    // Submit empty form — validation errors
    await page.getByRole("button", { name: /create tenant/i }).click();
    await expect(page.getByText(/required/i).first()).toBeVisible();

    // Fill the form
    await page.getByLabel(/name/i).fill("Test Corp");
    await page.getByLabel(/code/i).fill("test-corp");

    // Submit
    await page.getByRole("button", { name: /create tenant/i }).click();

    // Verify toast confirmation (toast renders text in multiple elements, use first match)
    await expect(page.getByText("Tenant created", { exact: true }).first()).toBeVisible();

    // Verify redirect to list
    await expect(page).toHaveURL(/\/tenants$/);
  });

  test("accessibility check on create page", async ({ page }) => {
    await page.goto("/tenants/create");
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await checkAccessibility(page);
  });
});
