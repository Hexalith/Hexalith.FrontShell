import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AlertDialog } from './AlertDialog';
import styles from './AlertDialog.module.css';

describe('AlertDialog', () => {
  it('renders title and description when open', () => {
    render(
      <AlertDialog
        open={true}
        onAction={vi.fn()}
        onCancel={vi.fn()}
        title="Delete item?"
        description="This cannot be undone."
      />,
    );
    expect(screen.getByText('Delete item?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('renders action and cancel buttons with correct labels', () => {
    render(
      <AlertDialog
        open={true}
        onAction={vi.fn()}
        onCancel={vi.fn()}
        title="Delete?"
        description="Gone forever."
      />,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('calls onAction when action button clicked', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(
      <AlertDialog
        open={true}
        onAction={onAction}
        onCancel={vi.fn()}
        title="Delete?"
        description="Gone forever."
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <AlertDialog
        open={true}
        onAction={vi.fn()}
        onCancel={onCancel}
        title="Delete?"
        description="Gone forever."
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('does NOT close on click outside', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <AlertDialog
        open={true}
        onAction={vi.fn()}
        onCancel={onCancel}
        title="Delete?"
        description="Gone forever."
      />,
    );
    // Click the overlay — AlertDialog should block this
    const overlay = document.querySelector('[data-state="open"]');
    if (overlay && overlay.getAttribute('role') !== 'alertdialog') {
      await user.click(overlay);
    }
    // onCancel should NOT have been called from click outside
    // (it may be called if Radix routes through onOpenChange, but AlertDialog blocks pointer-outside by default)
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('Escape routes through onCancel', async () => {
    const onCancel = vi.fn();
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(
      <AlertDialog
        open={true}
        onAction={onAction}
        onCancel={onCancel}
        title="Delete?"
        description="Gone forever."
      />,
    );
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('has displayName AlertDialog', () => {
    expect(AlertDialog.displayName).toBe('AlertDialog');
  });

  it('custom action/cancel labels rendered correctly', () => {
    render(
      <AlertDialog
        open={true}
        onAction={vi.fn()}
        onCancel={vi.fn()}
        title="Remove?"
        description="Will be removed."
        actionLabel="Remove"
        cancelLabel="Keep"
      />,
    );
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
  });

  it('action button uses destructive styling class', () => {
    render(
      <AlertDialog
        open={true}
        onAction={vi.fn()}
        onCancel={vi.fn()}
        title="Delete?"
        description="Gone forever."
      />,
    );

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass(
      styles.actionButton,
    );
  });

  it('cancel button appears before action button in DOM', () => {
    render(
      <AlertDialog
        open={true}
        onAction={vi.fn()}
        onCancel={vi.fn()}
        title="Delete?"
        description="Gone forever."
      />,
    );
    const buttons = screen.getAllByRole('button');
    const cancelIndex = buttons.findIndex(
      (b) => b.textContent === 'Cancel',
    );
    const actionIndex = buttons.findIndex(
      (b) => b.textContent === 'Delete',
    );
    expect(cancelIndex).toBeLessThan(actionIndex);
  });
});
