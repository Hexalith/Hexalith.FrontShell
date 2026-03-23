import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

import type { Page } from "@playwright/test";

export { test, expect };

/**
 * Run axe-core accessibility checks targeting WCAG 2.x Level AA.
 * Call at the end of each E2E test on stable pages.
 */
export async function checkAccessibility(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}
