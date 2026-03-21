import { test, expect } from '@playwright/experimental-ct-react';

import { Button } from './Button';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('Button accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<Button>Create Tenant</Button>);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<Button>Create Tenant</Button>);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
