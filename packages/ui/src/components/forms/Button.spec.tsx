import { test, expect } from '@playwright/experimental-ct-react';

import { Button } from './Button';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';
import { Inline } from '../layout/Inline';

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

test.describe('Button visual regression', () => {
  test('primary variant - light', async ({ mount, page }) => {
    await mount(
      <Inline gap="2">
        <Button variant="primary">Create</Button>
        <Button variant="secondary">Edit</Button>
        <Button variant="ghost">Cancel</Button>
      </Inline>,
    );
    await expect(page).toHaveScreenshot('button-variants-light.png');
  });

  test('primary variant - dark', async ({ mount, page }) => {
    await mount(
      <Inline gap="2">
        <Button variant="primary">Create</Button>
        <Button variant="secondary">Edit</Button>
        <Button variant="ghost">Cancel</Button>
      </Inline>,
    );
    await setDarkTheme(page);
    await expect(page).toHaveScreenshot('button-variants-dark.png');
  });
});
