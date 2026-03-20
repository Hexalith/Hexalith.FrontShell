import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Divider } from './Divider';

describe('Divider', () => {
  it('renders an hr element', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('applies root CSS class', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('hr')).toHaveClass('root');
  });

  it('merges custom className with root class', () => {
    const { container } = render(<Divider className="custom-divider" />);
    const hr = container.querySelector('hr');
    expect(hr).toHaveClass('root');
    expect(hr).toHaveClass('custom-divider');
  });

  it('has separator role by default (hr element)', () => {
    render(<Divider />);
    const hr = document.querySelector('hr');
    expect(hr).toBeInTheDocument();
  });
});
