import { test, expect } from '@playwright/experimental-ct-react';

import { DropdownMenu } from './DropdownMenu';
import { expectNoA11yViolations, setDarkTheme } from '../../../test-utils/a11y-helpers';

test.describe('DropdownMenu accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(
      <DropdownMenu
        trigger={<button>Menu</button>}
        items={[{ label: 'Edit', onSelect: () => {} }]}
      />
    );
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(
      <DropdownMenu
        trigger={<button>Menu</button>}
        items={[{ label: 'Edit', onSelect: () => {} }]}
      />
    );
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
