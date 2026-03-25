import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/experimental-ct-react";

import { ExampleListPage } from "./ExampleListPage";

test("ExampleListPage has no accessibility violations", async ({ mount, page }) => {
  // Providers are injected by playwright/index.tsx beforeMount hook
  await mount(<ExampleListPage />);

  // Wait for mock data to render in the table
  await page.waitForSelector("table");

  // Run axe-core accessibility check
  // Disable page-level rules (landmark-one-main, page-has-heading-one, region)
  // because this is a component test, not a full page
  const results = await new AxeBuilder({ page })
    .disableRules(["landmark-one-main", "page-has-heading-one", "region"])
    .analyze();
  expect(results.violations).toEqual([]);
});
