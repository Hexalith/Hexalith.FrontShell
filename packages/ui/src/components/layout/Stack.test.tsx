import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Stack } from './Stack';

describe('Stack', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Stack>
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>,
    );
    expect(getByText('Item 1')).toBeInTheDocument();
    expect(getByText('Item 2')).toBeInTheDocument();
  });

  it('applies root CSS class', () => {
    const { container } = render(<Stack>Content</Stack>);
    expect(container.firstChild).toHaveClass('root');
  });

  it('merges custom className with root class', () => {
    const { container } = render(<Stack className="custom">Content</Stack>);
    expect(container.firstChild).toHaveClass('root');
    expect(container.firstChild).toHaveClass('custom');
  });

  it('sets default gap to spacing-4', () => {
    const { container } = render(<Stack>Content</Stack>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--stack-gap')).toBe('var(--spacing-4)');
  });

  it('sets custom gap via CSS custom property', () => {
    const { container } = render(<Stack gap="2">Content</Stack>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--stack-gap')).toBe('var(--spacing-2)');
  });

  it('sets default align to stretch', () => {
    const { container } = render(<Stack>Content</Stack>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--stack-align')).toBe('stretch');
  });

  it('maps align="center" to CSS value', () => {
    const { container } = render(<Stack align="center">Content</Stack>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--stack-align')).toBe('center');
  });

  it('maps align="start" to flex-start', () => {
    const { container } = render(<Stack align="start">Content</Stack>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--stack-align')).toBe('flex-start');
  });

  it('maps align="end" to flex-end', () => {
    const { container } = render(<Stack align="end">Content</Stack>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--stack-align')).toBe('flex-end');
  });

  it('sets gap="0" for zero spacing', () => {
    const { container } = render(<Stack gap="0">Content</Stack>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--stack-gap')).toBe('var(--spacing-0)');
  });

  it('sets gap="8" for maximum spacing', () => {
    const { container } = render(<Stack gap="8">Content</Stack>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--stack-gap')).toBe('var(--spacing-8)');
  });
});
