import { test, expect } from '@playwright/experimental-ct-react';
import { z } from 'zod';

import { Form } from './index';
import { expectNoA11yViolations, setDarkTheme } from '../../../test-utils/a11y-helpers';
import { Input } from '../Input';

const schema = z.object({ name: z.string() });

test.describe('Form accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(
      <Form schema={schema} onSubmit={() => {}}>
        <Input label="Name" name="name" />
      </Form>
    );
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(
      <Form schema={schema} onSubmit={() => {}}>
        <Input label="Name" name="name" />
      </Form>
    );
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
