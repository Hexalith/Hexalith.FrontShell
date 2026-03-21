import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from './Modal';

const modalCss = readFileSync(
  join(process.cwd(), 'src/components/overlay/Modal/Modal.module.css'),
  'utf8',
);

describe('Modal', () => {
  it('renders with title and children when open', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('has hidden content when closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).toHaveAttribute('data-state', 'closed');
  });

  it('calls onClose when Escape pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay backdrop clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    const overlay = dialog.previousElementSibling;

    expect(overlay).not.toBeNull();
    await user.click(overlay as Element);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('close button has accessible label', () => {
    render(
      <Modal
        open={true}
        onClose={vi.fn()}
        title="Test"
        closeLabel="Dismiss"
      >
        <p>Content</p>
      </Modal>,
    );
    expect(
      screen.getByRole('button', { name: 'Dismiss' }),
    ).toBeInTheDocument();
  });

  it('title rendered as dialog title with aria-labelledby', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="My Title">
        <p>Content</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('description rendered when provided', () => {
    render(
      <Modal
        open={true}
        onClose={vi.fn()}
        title="Test"
        description="A helpful description"
      >
        <p>Content</p>
      </Modal>,
    );
    expect(screen.getByText('A helpful description')).toBeInTheDocument();
  });

  it('size prop applies data-size attribute', () => {
    const { rerender } = render(
      <Modal open={true} onClose={vi.fn()} title="Test" size="small">
        <p>Content</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('data-size', 'small');

    rerender(
      <Modal open={true} onClose={vi.fn()} title="Test" size="large">
        <p>Content</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('data-size', 'large');
  });

  it('defaults to medium size', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test">
        <p>Content</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('data-size', 'medium');
  });

  it('has displayName Modal', () => {
    expect(Modal.displayName).toBe('Modal');
  });

  it('focus is trapped inside modal', async () => {
    const user = userEvent.setup();
    render(
      <Modal open={true} onClose={vi.fn()} title="Test">
        <button>First</button>
        <button>Second</button>
      </Modal>,
    );
    // Tab through elements — focus should stay within the modal
    await user.tab();
    await user.tab();
    await user.tab();
    // After cycling, focus should still be within the dialog
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('when closed, content has visibility hidden', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Test">
        <p>Content</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { hidden: true });
    const modalContent = document.querySelector('[data-size]');

    expect(dialog).toHaveAttribute('data-state', 'closed');
    expect(modalContent).not.toBeNull();
    expect(modalCss).toContain(".content[data-state='closed']");
    expect(modalCss).toContain('visibility: hidden;');
  });

  it('long content scrolls within the modal body', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Scrollable modal">
        <div>
          {Array.from({ length: 100 }, (_, index) => (
            <p key={index}>Row {index + 1}</p>
          ))}
        </div>
      </Modal>,
    );

    const modalContent = document.querySelector('[data-size]');

    expect(modalContent).not.toBeNull();
    expect(modalCss).toContain('overflow-y: auto;');
    expect(modalCss).toContain('max-height: calc(100vh - var(--spacing-8));');
  });
});
