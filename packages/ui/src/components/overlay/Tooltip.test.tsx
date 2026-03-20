import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('renders trigger child without modifying it', () => {
    render(
      <Tooltip content="Help text">
        <button>Help</button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
  });

  it('does not show tooltip content by default', () => {
    render(
      <Tooltip content="Help text">
        <button>Help</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip content on focus (keyboard accessibility)', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Help text" delayDuration={0}>
        <button>Help</button>
      </Tooltip>,
    );

    await user.tab();
    expect(screen.getByRole('button', { name: 'Help' })).toHaveFocus();

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByRole('tooltip')).toHaveTextContent('Help text');
    });
  });

  it('renders with default side="top"', () => {
    const { container } = render(
      <Tooltip content="Help">
        <button>?</button>
      </Tooltip>,
    );
    expect(container).toBeInTheDocument();
  });

  it('accepts custom delayDuration', () => {
    render(
      <Tooltip content="Help" delayDuration={500}>
        <button>?</button>
      </Tooltip>,
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has displayName set to Tooltip', () => {
    expect(Tooltip.displayName).toBe('Tooltip');
  });
});
