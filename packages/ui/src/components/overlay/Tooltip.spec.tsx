import { test, expect } from '@playwright/experimental-ct-react';

import { Tooltip } from './Tooltip';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('Tooltip accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<Tooltip content="Help text"><button>Hover me</button></Tooltip>);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<Tooltip content="Help text"><button>Hover me</button></Tooltip>);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
