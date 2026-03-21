import { test, expect } from '@playwright/experimental-ct-react';

import { DetailView } from './DetailView';
import { expectNoA11yViolations, setDarkTheme } from '../../../test-utils/a11y-helpers';

test.describe('DetailView accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(
      <DetailView
        sections={[{ title: 'Info', fields: [{ label: 'Name', value: 'Contoso' }] }]}
      />
    );
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(
      <DetailView
        sections={[{ title: 'Info', fields: [{ label: 'Name', value: 'Contoso' }] }]}
      />
    );
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
