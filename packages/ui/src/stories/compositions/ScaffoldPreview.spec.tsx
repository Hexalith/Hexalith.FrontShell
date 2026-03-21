import { test, expect } from '@playwright/experimental-ct-react';

import { ScaffoldPreview } from './ScaffoldPreview.stories';
import { expectNoCompositionA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('ScaffoldPreview accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<ScaffoldPreview />);
    const violations = await expectNoCompositionA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<ScaffoldPreview />);
    await setDarkTheme(page);
    const violations = await expectNoCompositionA11yViolations(page);
    expect(violations).toEqual([]);
  });
});