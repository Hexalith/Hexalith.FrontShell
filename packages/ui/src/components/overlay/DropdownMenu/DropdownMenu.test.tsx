import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DropdownMenu } from './DropdownMenu';

describe('DropdownMenu', () => {
  const defaultItems = [
    { label: 'Edit', onSelect: vi.fn() },
    { label: 'Duplicate', onSelect: vi.fn() },
  ];

  it('renders trigger element', () => {
    render(
      <DropdownMenu trigger={<button>Actions</button>} items={defaultItems} />,
    );
    expect(
      screen.getByRole('button', { name: 'Actions' }),
    ).toBeInTheDocument();
  });

  it('opens menu on trigger click', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu trigger={<button>Actions</button>} items={defaultItems} />,
    );
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('renders all menu items with labels', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu trigger={<button>Actions</button>} items={defaultItems} />,
    );
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Duplicate')).toBeInTheDocument();
    });
  });

  it('calls onSelect when item clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <DropdownMenu
        trigger={<button>Actions</button>}
        items={[{ label: 'Edit', onSelect }]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Edit'));
    expect(onSelect).toHaveBeenCalled();
  });

  it('closes menu after item selection', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu
        trigger={<button>Actions</button>}
        items={[{ label: 'Edit', onSelect: vi.fn() }]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Edit'));
    await waitFor(() => {
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });
  });

  it('disabled items do not trigger onSelect', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <DropdownMenu
        trigger={<button>Actions</button>}
        items={[{ label: 'Edit', onSelect, disabled: true }]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Edit'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('destructive items have data-destructive attribute', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu
        trigger={<button>Actions</button>}
        items={[{ label: 'Delete', onSelect: vi.fn(), destructive: true }]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => {
      const deleteItem = screen.getByText('Delete');
      expect(deleteItem.closest('[data-destructive]')).not.toBeNull();
    });
  });

  it('renders separators between items', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu
        trigger={<button>Actions</button>}
        items={[
          { label: 'Edit', onSelect: vi.fn() },
          { type: 'separator' as const },
          { label: 'Delete', onSelect: vi.fn(), destructive: true },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => {
      expect(screen.getByRole('separator')).toBeInTheDocument();
    });
  });

  it('renders group labels when groups provided', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu
        trigger={<button>Actions</button>}
        items={[
          {
            label: 'File',
            items: [{ label: 'Save', onSelect: vi.fn() }],
          },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => {
      expect(screen.getByText('File')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  it('keyboard: Escape closes menu', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu trigger={<button>Actions</button>} items={defaultItems} />,
    );
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });
  });

  it('keyboard: arrow keys navigate items and Enter selects', async () => {
    const onEdit = vi.fn();
    const onDuplicate = vi.fn();
    const user = userEvent.setup();

    render(
      <DropdownMenu
        trigger={<button>Actions</button>}
        items={[
          { label: 'Edit', onSelect: onEdit },
          { label: 'Duplicate', onSelect: onDuplicate },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('keyboard type-ahead focuses matching item and Enter selects it', async () => {
    const onEdit = vi.fn();
    const onDuplicate = vi.fn();
    const user = userEvent.setup();

    render(
      <DropdownMenu
        trigger={<button>Actions</button>}
        items={[
          { label: 'Edit', onSelect: onEdit },
          { label: 'Duplicate', onSelect: onDuplicate },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    await user.keyboard('d{Enter}');

    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('has displayName DropdownMenu', () => {
    expect(DropdownMenu.displayName).toBe('DropdownMenu');
  });

  it('controlled open/onOpenChange works', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DropdownMenu
        trigger={<button>Actions</button>}
        items={defaultItems}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
