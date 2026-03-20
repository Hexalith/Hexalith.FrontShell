import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Tabs } from './Tabs';

import type { TabItem } from './Tabs';

const mockItems: TabItem[] = [
  { id: 'tab1', label: 'First Tab', content: <div>First content</div> },
  { id: 'tab2', label: 'Second Tab', content: <div>Second content</div> },
  { id: 'tab3', label: 'Third Tab', content: <div>Third content</div> },
];

describe('Tabs', () => {
  it('renders all tab triggers with correct labels', () => {
    render(<Tabs items={mockItems} />);
    expect(screen.getByText('First Tab')).toBeInTheDocument();
    expect(screen.getByText('Second Tab')).toBeInTheDocument();
    expect(screen.getByText('Third Tab')).toBeInTheDocument();
  });

  it('first tab is active by default when no defaultValue or value provided', () => {
    render(<Tabs items={mockItems} />);
    expect(screen.getByText('First content')).toBeInTheDocument();
  });

  it('renders content for the active tab', () => {
    render(<Tabs items={mockItems} />);
    expect(screen.getByText('First content')).toBeInTheDocument();
    // Inactive tab content should not be visible
    expect(screen.queryByText('Second content')).not.toBeInTheDocument();
  });

  it('defaultValue sets initial active tab', () => {
    render(<Tabs items={mockItems} defaultValue="tab2" />);
    expect(screen.getByText('Second content')).toBeInTheDocument();
    expect(screen.queryByText('First content')).not.toBeInTheDocument();
  });

  it('value + onValueChange works in controlled mode', () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <Tabs items={mockItems} value="tab1" onValueChange={handleChange} />,
    );
    expect(screen.getByText('First content')).toBeInTheDocument();

    rerender(<Tabs items={mockItems} value="tab2" onValueChange={handleChange} />);
    expect(screen.getByText('Second content')).toBeInTheDocument();
  });

  it('calls onValueChange when a tab is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Tabs items={mockItems} onValueChange={handleChange} />);

    await user.click(screen.getByText('Second Tab'));
    expect(handleChange).toHaveBeenCalledWith('tab2');
  });

  it('keyboard: arrow keys move focus between tabs', async () => {
    const user = userEvent.setup();
    render(<Tabs items={mockItems} />);

    // Focus the first tab
    await user.click(screen.getByText('First Tab'));
    expect(screen.getByText('First Tab')).toHaveFocus();

    // Arrow right moves to next tab
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('Second Tab')).toHaveFocus();
  });

  it('disabled tab cannot be activated', async () => {
    const user = userEvent.setup();
    const itemsWithDisabled: TabItem[] = [
      { id: 'tab1', label: 'First Tab', content: <div>First content</div> },
      { id: 'tab2', label: 'Disabled Tab', content: <div>Disabled content</div>, disabled: true },
      { id: 'tab3', label: 'Third Tab', content: <div>Third content</div> },
    ];
    const handleChange = vi.fn();
    render(<Tabs items={itemsWithDisabled} onValueChange={handleChange} />);

    await user.click(screen.getByText('Disabled Tab'));
    // Disabled tab click should not trigger value change to tab2
    expect(handleChange).not.toHaveBeenCalledWith('tab2');
    // First content should still be visible
    expect(screen.getByText('First content')).toBeInTheDocument();
  });

  it('disabled tab has correct visual state', () => {
    const itemsWithDisabled: TabItem[] = [
      { id: 'tab1', label: 'First Tab', content: <div>First content</div> },
      { id: 'tab2', label: 'Disabled Tab', content: <div>Disabled content</div>, disabled: true },
    ];
    render(<Tabs items={itemsWithDisabled} />);

    const disabledTab = screen.getByText('Disabled Tab');
    expect(disabledTab).toHaveAttribute('data-disabled', '');
  });

  it('merges className via clsx', () => {
    const { container } = render(<Tabs items={mockItems} className="custom-class" />);
    const root = container.firstElementChild;
    expect(root).toHaveClass('root', 'custom-class');
  });

  it('correct ARIA roles present: tablist, tab, tabpanel', () => {
    render(<Tabs items={mockItems} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('has correct displayName', () => {
    expect(Tabs.displayName).toBe('Tabs');
  });
});
