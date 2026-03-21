import { test, expect } from '@playwright/experimental-ct-react';

import { TextArea } from './TextArea';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('TextArea accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<TextArea label="Description" />);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<TextArea label="Description" />);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
