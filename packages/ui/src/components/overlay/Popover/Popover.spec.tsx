import { test, expect } from '@playwright/experimental-ct-react';

import { Popover } from './Popover';
import { expectNoA11yViolations, setDarkTheme } from '../../../test-utils/a11y-helpers';

test.describe('Popover accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<Popover trigger={<button>Info</button>}><p>Details</p></Popover>);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<Popover trigger={<button>Info</button>}><p>Details</p></Popover>);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
