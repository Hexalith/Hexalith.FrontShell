import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EmptyState } from './EmptyState';

afterEach(cleanup);

describe('EmptyState', () => {
  it('renders title text', () => {
    render(<EmptyState title="No orders yet" />);
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <EmptyState title="No orders" description="Orders will appear here" />,
    );
    expect(screen.getByText('Orders will appear here')).toBeInTheDocument();
  });

  it('does NOT render description when not provided', () => {
    const { container } = render(<EmptyState title="No orders" />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(0);
  });

  it('renders action button with correct label when action provided', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No orders"
        action={{ label: 'Create order', onClick }}
      />,
    );
    expect(screen.getByText('Create order')).toBeInTheDocument();
  });

  it('action button fires onClick callback', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No orders"
        action={{ label: 'Create order', onClick }}
      />,
    );

    await user.click(screen.getByText('Create order'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does NOT render button when action not provided', () => {
    render(<EmptyState title="No orders" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders illustration when provided', () => {
    render(
      <EmptyState
        title="No orders"
        illustration={<div data-testid="illustration">Art</div>}
      />,
    );
    expect(screen.getByTestId('illustration')).toBeInTheDocument();
  });

  it('merges className via clsx', () => {
    const { container } = render(
      <EmptyState title="No orders" className="custom-class" />,
    );
    expect(container.firstElementChild).toHaveClass('custom-class');
  });
});
