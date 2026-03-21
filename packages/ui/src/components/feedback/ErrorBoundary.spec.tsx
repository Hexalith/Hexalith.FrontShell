import { test, expect } from '@playwright/experimental-ct-react';

import { ErrorBoundary } from './ErrorBoundary';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('ErrorBoundary accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<ErrorBoundary><p>Safe content</p></ErrorBoundary>);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<ErrorBoundary><p>Safe content</p></ErrorBoundary>);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
