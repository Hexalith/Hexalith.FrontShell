import { test, expect } from '@playwright/experimental-ct-react';

import { Modal } from './Modal';
import { expectNoA11yViolations, setDarkTheme } from '../../../test-utils/a11y-helpers';

test.describe('Modal accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<Modal open={true} onClose={() => {}} title="Edit">Content</Modal>);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<Modal open={true} onClose={() => {}} title="Edit">Content</Modal>);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
