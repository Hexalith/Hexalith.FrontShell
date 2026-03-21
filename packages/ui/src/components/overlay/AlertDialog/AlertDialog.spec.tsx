import { test, expect } from '@playwright/experimental-ct-react';

import { AlertDialog } from './AlertDialog';
import { expectNoA11yViolations, setDarkTheme } from '../../../test-utils/a11y-helpers';

test.describe('AlertDialog accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(
      <AlertDialog
        open={true}
        onAction={() => {}}
        onCancel={() => {}}
        title="Delete"
        description="Are you sure?"
      />
    );
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(
      <AlertDialog
        open={true}
        onAction={() => {}}
        onCancel={() => {}}
        title="Delete"
        description="Are you sure?"
      />
    );
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
