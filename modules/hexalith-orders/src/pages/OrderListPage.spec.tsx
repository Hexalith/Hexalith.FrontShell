import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/experimental-ct-react";

import { OrderListPage } from "./OrderListPage";

test("OrderListPage has no accessibility violations", async ({ mount, page }) => {
  await mount(<OrderListPage />);

  await page.waitForSelector("table");

  const results = await new AxeBuilder({ page })
    .disableRules(["landmark-one-main", "page-has-heading-one", "region"])
    .analyze();

  expect(results.violations).toEqual([]);
});