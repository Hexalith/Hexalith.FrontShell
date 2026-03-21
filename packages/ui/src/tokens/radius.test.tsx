import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

const radiusCss = readFileSync(join(process.cwd(), 'src/tokens/radius.css'), 'utf8');

describe('radius tokens', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--radius-sm');
    document.documentElement.style.removeProperty('--radius-md');
    document.documentElement.style.removeProperty('--radius-lg');
  });

  it('defines the expected semantic radius tokens', () => {
    expect(radiusCss).toContain('--radius-sm: 4px;');
    expect(radiusCss).toContain('--radius-md: 6px;');
    expect(radiusCss).toContain('--radius-lg: 8px;');
  });

  it('resolves radius-lg to 8px when applied to a rendered element', () => {
    document.documentElement.style.setProperty('--radius-lg', '8px');

    const style = document.createElement('style');
    style.textContent = '.radiusSurface { border-radius: var(--radius-lg); }';
    document.head.appendChild(style);

    render(
      <div data-testid="radius-surface" className="radiusSurface" />,
    );

    expect(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--radius-lg')
        .trim(),
    ).toBe('8px');
    expect(screen.getByTestId('radius-surface')).toHaveClass('radiusSurface');

    style.remove();
  });
});