import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Sidebar } from './Sidebar';

import type { NavigationItem } from './Sidebar';

const mockItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <span data-testid="icon-dashboard">D</span> },
  { id: 'orders', label: 'Orders', href: '/orders', icon: <span data-testid="icon-orders">O</span> },
  { id: 'products', label: 'Products', href: '/products' },
];

const categorizedItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <span>D</span> },
  { id: 'orders', label: 'Orders', href: '/orders', category: 'Commerce', icon: <span>O</span> },
  { id: 'invoices', label: 'Invoices', href: '/invoices', category: 'Commerce', icon: <span>I</span> },
  { id: 'users', label: 'Users', href: '/users', category: 'Admin', icon: <span>U</span> },
  { id: 'settings', label: 'Settings', href: '/settings', category: 'Admin', icon: <span>S</span> },
];

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('Sidebar', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('renders all navigation items with correct labels', () => {
    render(<Sidebar items={mockItems} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
  });

  it('renders item icons when provided', () => {
    render(<Sidebar items={mockItems} />);
    expect(screen.getByTestId('icon-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('icon-orders')).toBeInTheDocument();
  });

  it('active item has aria-current="page" attribute', () => {
    render(<Sidebar items={mockItems} activeItemId="orders" />);
    const activeLink = screen.getByText('Orders').closest('a');
    expect(activeLink).toHaveAttribute('aria-current', 'page');
  });

  it('active item has data-active attribute', () => {
    render(<Sidebar items={mockItems} activeItemId="orders" />);
    const activeLink = screen.getByText('Orders').closest('a');
    expect(activeLink).toHaveAttribute('data-active', 'true');
  });

  it('non-active items do NOT have aria-current', () => {
    render(<Sidebar items={mockItems} activeItemId="orders" />);
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).not.toHaveAttribute('aria-current');
  });

  it('calls onItemClick with correct item when item is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Sidebar items={mockItems} onItemClick={handleClick} />);

    await user.click(screen.getByText('Orders'));
    expect(handleClick).toHaveBeenCalledWith(mockItems[1]);
  });

  it('items have correct href attributes', () => {
    render(<Sidebar items={mockItems} />);
    const link = screen.getByText('Orders').closest('a');
    expect(link).toHaveAttribute('href', '/orders');
  });

  describe('collapsed mode', () => {
    it('renders icons only, labels are hidden', () => {
      render(<Sidebar items={mockItems} isCollapsed />);
      expect(screen.getByTestId('icon-dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Orders')).not.toBeInTheDocument();
    });

    it('search is hidden when sidebar is collapsed', () => {
      render(<Sidebar items={mockItems} isCollapsed />);
      expect(screen.queryByLabelText('Filter navigation')).not.toBeInTheDocument();
    });
  });

  describe('expanded mode', () => {
    it('renders both icons and labels', () => {
      render(<Sidebar items={mockItems} isCollapsed={false} />);
      expect(screen.getByTestId('icon-dashboard')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('calls onCollapsedChange when collapse toggle is clicked', async () => {
    const user = userEvent.setup();
    const handleCollapse = vi.fn();
    render(<Sidebar items={mockItems} onCollapsedChange={handleCollapse} />);

    await user.click(screen.getByLabelText('Collapse sidebar'));
    expect(handleCollapse).toHaveBeenCalledWith(true);
  });

  it('toggle shows "Expand sidebar" label when collapsed', () => {
    render(<Sidebar items={mockItems} isCollapsed />);
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  it('defaults to collapsed mode below the lg breakpoint when uncontrolled', () => {
    mockMatchMedia(true);
    render(<Sidebar items={mockItems} />);

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  it('defaults to expanded mode at the lg breakpoint when uncontrolled', () => {
    mockMatchMedia(false);
    render(<Sidebar items={mockItems} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
  });

  it('renders a fallback initial for collapsed items without an icon', () => {
    render(<Sidebar items={mockItems} isCollapsed />);
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  describe('search', () => {
    it('renders search input when isSearchable is true (default)', () => {
      render(<Sidebar items={mockItems} />);
      expect(screen.getByLabelText('Filter navigation')).toBeInTheDocument();
    });

    it('hides search input when isSearchable is false', () => {
      render(<Sidebar items={mockItems} isSearchable={false} />);
      expect(screen.queryByLabelText('Filter navigation')).not.toBeInTheDocument();
    });

    it('filters items by label on input', async () => {
      const user = userEvent.setup();
      render(<Sidebar items={mockItems} />);

      await user.type(screen.getByLabelText('Filter navigation'), 'ord');
      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Products')).not.toBeInTheDocument();
    });

    it('filter is case-insensitive', async () => {
      const user = userEvent.setup();
      render(<Sidebar items={mockItems} />);

      await user.type(screen.getByLabelText('Filter navigation'), 'ORD');
      expect(screen.getByText('Orders')).toBeInTheDocument();
    });

    it('clearing search shows all items again', async () => {
      const user = userEvent.setup();
      render(<Sidebar items={mockItems} />);

      const input = screen.getByLabelText('Filter navigation');
      await user.type(input, 'ord');
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();

      await user.clear(input);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
    });

    it('shows "No results" when no items match', async () => {
      const user = userEvent.setup();
      render(<Sidebar items={mockItems} />);

      await user.type(screen.getByLabelText('Filter navigation'), 'zzzzz');
      expect(screen.getByText('No results')).toBeInTheDocument();
    });

    it('escape key clears search', async () => {
      const user = userEvent.setup();
      render(<Sidebar items={mockItems} />);

      const input = screen.getByLabelText('Filter navigation');
      await user.type(input, 'ord');
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('grouped sections', () => {
    it('items with same category are grouped under a section header', () => {
      render(<Sidebar items={categorizedItems} />);
      expect(screen.getByText('Commerce')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('uncategorized items appear outside any group', () => {
      render(<Sidebar items={categorizedItems} />);
      // Dashboard is uncategorized — should be visible and not inside a group header section
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('group headers can be collapsed and expanded', async () => {
      const user = userEvent.setup();
      render(<Sidebar items={categorizedItems} />);

      // Commerce group should show its items
      expect(screen.getByText('Orders')).toBeInTheDocument();

      // Click Commerce header to collapse
      await user.click(screen.getByText('Commerce'));

      // After collapse, check the collapsible trigger state
      const commerceHeader = screen.getByText('Commerce').closest('button');
      expect(commerceHeader).toHaveAttribute('data-state', 'closed');
    });

    it('collapsing a group hides its items', async () => {
      const user = userEvent.setup();
      render(<Sidebar items={categorizedItems} />);

      expect(screen.getByText('Orders')).toBeInTheDocument();

      // Click Commerce header to collapse
      await user.click(screen.getByText('Commerce'));

      const commerceHeader = screen.getByText('Commerce').closest('button');
      expect(commerceHeader).toHaveAttribute('data-state', 'closed');
      expect(screen.queryByText('Orders')).not.toBeInTheDocument();

      await user.click(screen.getByText('Commerce'));
      expect(screen.getByText('Orders')).toBeVisible();
    });
  });

  it('merges className via clsx', () => {
    render(<Sidebar items={mockItems} className="custom-class" />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('root', 'custom-class');
  });

  it('renders header slot content when provided', () => {
    render(<Sidebar items={mockItems} header={<div data-testid="header-content">Logo</div>} />);
    expect(screen.getByTestId('header-content')).toBeInTheDocument();
  });

  it('renders footer slot content when provided', () => {
    render(<Sidebar items={mockItems} footer={<div data-testid="footer-content">User Info</div>} />);
    expect(screen.getByTestId('footer-content')).toBeInTheDocument();
  });

  describe('empty items', () => {
    it('renders header/footer with no nav area and no search field when items is empty', () => {
      render(
        <Sidebar
          items={[]}
          header={<div data-testid="header-content">Logo</div>}
          footer={<div data-testid="footer-content">User</div>}
        />,
      );
      expect(screen.getByTestId('header-content')).toBeInTheDocument();
      expect(screen.getByTestId('footer-content')).toBeInTheDocument();
      expect(screen.queryByLabelText('Filter navigation')).not.toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  it('has correct displayName', () => {
    expect(Sidebar.displayName).toBe('Sidebar');
  });
});
