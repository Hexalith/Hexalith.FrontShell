import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DatePicker } from './DatePicker';

describe('DatePicker', () => {
  it('renders with label', () => {
    render(<DatePicker label="Start date" />);
    expect(screen.getByText('Start date')).toBeInTheDocument();
  });

  it('shows placeholder when no date selected', () => {
    render(<DatePicker label="Start date" />);
    expect(screen.getByText('Select date...')).toBeInTheDocument();
  });

  it('shows custom placeholder', () => {
    render(<DatePicker label="Start date" placeholder="Pick a date" />);
    expect(screen.getByText('Pick a date')).toBeInTheDocument();
  });

  it('displays formatted date when value is set', () => {
    const date = new Date(2026, 0, 15); // Jan 15, 2026
    render(<DatePicker label="Start date" value={date} />);
    // Intl.DateTimeFormat formats vary by locale, check the date value is displayed
    const trigger = screen.getByRole('button');
    expect(trigger.textContent).toContain('2026');
    expect(trigger.textContent).toContain('15');
  });

  it('opens calendar popover on trigger click', async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Start date" />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      // react-day-picker renders a table for the calendar grid
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });

  it('opens on Enter and closes on Escape', async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Start date" />);

    const trigger = screen.getByRole('button');
    trigger.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    });
  });

  it('calls onChange when a date is selected', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    // Render with a specific month visible
    render(<DatePicker label="Start date" value={new Date(2026, 0, 1)} onChange={handleChange} />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    // Click on day 15
    const day15 = screen.getByRole('gridcell', { name: '15' });
    await user.click(day15.querySelector('button') ?? day15);

    expect(handleChange).toHaveBeenCalled();
    const selectedDate = handleChange.mock.calls[0][0];
    expect(selectedDate).toBeInstanceOf(Date);
    expect(selectedDate.getDate()).toBe(15);
  });

  it('closes popover after date selection', async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Start date" value={new Date(2026, 0, 1)} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    const day15 = screen.getByRole('gridcell', { name: '15' });
    await user.click(day15.querySelector('button') ?? day15);

    await waitFor(() => {
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    });
  });

  it('shows error message with aria-describedby', () => {
    render(<DatePicker label="Start date" error="Date required" id="start" />);
    const trigger = screen.getByRole('button');
    const errorMsg = screen.getByText('Date required');

    expect(trigger).toHaveAttribute('aria-describedby', 'start-error');
    expect(errorMsg).toHaveAttribute('id', 'start-error');
  });

  it('sets aria-invalid when error is present', () => {
    render(<DatePicker label="Start date" error="Date required" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows required indicator', () => {
    render(<DatePicker label="Start date" required />);
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveAttribute('aria-hidden', 'true');
  });

  it('disabled state prevents opening', async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Start date" disabled />);

    const trigger = screen.getByRole('button');
    expect(trigger).toBeDisabled();

    await user.click(trigger);

    // Calendar should not appear
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('passes the name attribute to the trigger button', () => {
    render(<DatePicker label="Start date" name="startDate" />);
    expect(screen.getByRole('button')).toHaveAttribute('name', 'startDate');
  });

  it('minDate and maxDate disable out-of-range dates', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <DatePicker
        label="Start date"
        value={new Date(2026, 2, 15)}
        minDate={new Date(2026, 2, 10)}
        maxDate={new Date(2026, 2, 20)}
        onChange={handleChange}
      />,
    );

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    const day5 = screen.getByRole('button', { name: /march 5.*2026/i });
    const day15 = screen.getByRole('button', { name: /march 15.*2026/i });
    const day25 = screen.getByRole('button', { name: /march 25.*2026/i });

    expect(day5).toBeDisabled();
    expect(day25).toBeDisabled();
    expect(day15).not.toBeDisabled();

    await user.click(day5);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('forwards ref to trigger button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<DatePicker label="Start date" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('has displayName set to DatePicker', () => {
    expect(DatePicker.displayName).toBe('DatePicker');
  });
});
