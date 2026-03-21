import { test, expect } from '@playwright/experimental-ct-react';

import { Tabs } from './Tabs';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('Tabs accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<Tabs items={[{ id: 'tab1', label: 'Overview', content: <p>Content</p> }]} />);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<Tabs items={[{ id: 'tab1', label: 'Overview', content: <p>Content</p> }]} />);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
