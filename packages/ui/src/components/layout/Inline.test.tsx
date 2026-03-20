import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Inline } from './Inline';

describe('Inline', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Inline>
        <span>A</span>
        <span>B</span>
      </Inline>,
    );
    expect(getByText('A')).toBeInTheDocument();
    expect(getByText('B')).toBeInTheDocument();
  });

  it('applies root CSS class', () => {
    const { container } = render(<Inline>Content</Inline>);
    expect(container.firstChild).toHaveClass('root');
  });

  it('merges custom className with root class', () => {
    const { container } = render(<Inline className="custom">Content</Inline>);
    expect(container.firstChild).toHaveClass('root');
    expect(container.firstChild).toHaveClass('custom');
  });

  it('sets default gap to spacing-4', () => {
    const { container } = render(<Inline>Content</Inline>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--inline-gap')).toBe('var(--spacing-4)');
  });

  it('sets custom gap via CSS custom property', () => {
    const { container } = render(<Inline gap="3">Content</Inline>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--inline-gap')).toBe('var(--spacing-3)');
  });

  it('sets default align to center', () => {
    const { container } = render(<Inline>Content</Inline>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--inline-align')).toBe('center');
  });

  it('maps align="baseline" correctly', () => {
    const { container } = render(<Inline align="baseline">Content</Inline>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--inline-align')).toBe('baseline');
  });

  it('maps align="start" to flex-start', () => {
    const { container } = render(<Inline align="start">Content</Inline>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--inline-align')).toBe('flex-start');
  });

  it('sets default justify to flex-start', () => {
    const { container } = render(<Inline>Content</Inline>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--inline-justify')).toBe('flex-start');
  });

  it('maps justify="between" to space-between', () => {
    const { container } = render(<Inline justify="between">Content</Inline>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--inline-justify')).toBe('space-between');
  });

  it('maps justify="center" correctly', () => {
    const { container } = render(<Inline justify="center">Content</Inline>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--inline-justify')).toBe('center');
  });

  it('sets default wrap to nowrap', () => {
    const { container } = render(<Inline>Content</Inline>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--inline-wrap')).toBe('nowrap');
  });

  it('sets wrap=true to wrap', () => {
    const { container } = render(<Inline wrap>Content</Inline>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--inline-wrap')).toBe('wrap');
  });
});
