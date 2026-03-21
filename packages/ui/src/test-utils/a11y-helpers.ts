import AxeBuilder from '@axe-core/playwright';

import type { Page } from '@playwright/test';

// Page-level rules excluded: component tests render isolated components
// without a full page structure (no <main>, no <h1>). These rules are
// validated in composition-level and E2E tests instead.
const PAGE_LEVEL_RULES = ['landmark-one-main', 'page-has-heading-one', 'region'];

export async function expectNoA11yViolations(page: Page, disableRules: string[] = []) {
  const results = await new AxeBuilder({ page })
    .disableRules([...PAGE_LEVEL_RULES, ...disableRules])
    .analyze();
  return results.violations;
}

/**
 * Composition/page-level a11y check — validates landmarks and heading hierarchy.
 * Unlike expectNoA11yViolations, this does NOT disable page-level rules because
 * compositions represent full page layouts where those rules should be enforced
 * (AC #5: "Composition-level stories tested for context-dependent issues").
 */
export async function expectNoCompositionA11yViolations(page: Page, disableRules: string[] = []) {
  const results = await new AxeBuilder({ page })
    .disableRules(disableRules)
    .analyze();
  return results.violations;
}

export async function setDarkTheme(page: Page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  // Wait for CSS custom properties to cascade through the DOM.
  // Larger component trees need more time for style recalculation.
  await page.waitForTimeout(200);
}
