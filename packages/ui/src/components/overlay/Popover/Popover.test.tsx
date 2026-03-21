import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Popover } from './Popover';

describe('Popover', () => {
  it('renders trigger element', () => {
    render(
      <Popover trigger={<button>Info</button>}>
        <p>Details here</p>
      </Popover>,
    );
    expect(screen.getByRole('button', { name: 'Info' })).toBeInTheDocument();
  });

  it('opens popover on trigger click', async () => {
    const user = userEvent.setup();
    render(
      <Popover trigger={<button>Info</button>}>
        <p>Details here</p>
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Info' }));
    await waitFor(() => {
      expect(screen.getByText('Details here')).toBeInTheDocument();
    });
  });

  it('renders children content when open', async () => {
    const user = userEvent.setup();
    render(
      <Popover trigger={<button>Info</button>}>
        <p>Popover content</p>
        <a href="#">A link</a>
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Info' }));
    await waitFor(() => {
      expect(screen.getByText('Popover content')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'A link' })).toBeInTheDocument();
    });
  });

  it('closes on Escape key', async () => {
    const user = userEvent.setup();
    render(
      <Popover trigger={<button>Info</button>}>
        <p>Details here</p>
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Info' }));
    await waitFor(() => {
      expect(screen.getByText('Details here')).toBeInTheDocument();
    });
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByText('Details here')).not.toBeInTheDocument();
    });
  });

  it('closes on click outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Popover trigger={<button>Info</button>}>
          <p>Details here</p>
        </Popover>
        <button>Outside</button>
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Info' }));
    await waitFor(() => {
      expect(screen.getByText('Details here')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    await waitFor(() => {
      expect(screen.queryByText('Details here')).not.toBeInTheDocument();
    });
  });

  it('controlled open/onOpenChange works', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Popover trigger={<button>Info</button>} open={true} onOpenChange={onOpenChange}>
        <p>Details here</p>
      </Popover>,
    );
    expect(screen.getByText('Details here')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('align and side props are passed to content', async () => {
    render(
      <Popover trigger={<button>Info</button>} open={true} align="start" side="right">
        <p>Details here</p>
      </Popover>,
    );

    const content = screen.getByText('Details here').parentElement;

    expect(content).toHaveAttribute('data-side', 'right');
    expect(content).toHaveAttribute('data-align', 'start');
  });

  it('calls onOpenChange when used as a controlled trigger', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Popover trigger={<button>Info</button>} open={false} onOpenChange={onOpenChange}>
        <p>Details here</p>
      </Popover>,
    );

    await user.click(screen.getByRole('button', { name: 'Info' }));

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('has displayName Popover', () => {
    expect(Popover.displayName).toBe('Popover');
  });
});
