import { cleanup, render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Skeleton } from './Skeleton';

afterEach(cleanup);

describe('Skeleton', () => {
  it('renders table variant with correct number of rows', () => {
    const { container } = render(<Skeleton variant="table" rows={3} />);
    expect(container.querySelector('[data-variant="table"]')).toBeInTheDocument();
    // Header + 3 data rows
    const rows = container.querySelectorAll('[class*="tableRow"]');
    expect(rows).toHaveLength(3);
  });

  it('renders table variant with default 5 rows', () => {
    const { container } = render(<Skeleton variant="table" />);
    const rows = container.querySelectorAll('[class*="tableRow"]');
    expect(rows).toHaveLength(5);
  });

  it('renders form variant with correct number of fields', () => {
    const { container } = render(<Skeleton variant="form" fields={3} />);
    expect(container.querySelector('[data-variant="form"]')).toBeInTheDocument();
    const fields = container.querySelectorAll('[class*="formField"]');
    expect(fields).toHaveLength(3);
  });

  it('renders form variant with default 4 fields', () => {
    const { container } = render(<Skeleton variant="form" />);
    const fields = container.querySelectorAll('[class*="formField"]');
    expect(fields).toHaveLength(4);
  });

  it('renders detail variant without error', () => {
    const { container } = render(<Skeleton variant="detail" />);
    expect(container.querySelector('[data-variant="detail"]')).toBeInTheDocument();
  });

  it('renders card variant without error', () => {
    const { container } = render(<Skeleton variant="card" />);
    expect(container.querySelector('[data-variant="card"]')).toBeInTheDocument();
  });

  it('has correct aria attributes', () => {
    render(<Skeleton variant="table" />);
    const skeleton = screen.getByLabelText('Loading content');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  });

  it('merges className', () => {
    const { container } = render(<Skeleton variant="table" className="custom" />);
    expect(container.firstElementChild).toHaveClass('custom');
  });

  describe('isReady behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders when isReady is false', () => {
      const { container } = render(<Skeleton variant="table" isReady={false} />);
      expect(container.querySelector('[data-variant="table"]')).toBeInTheDocument();
    });

    it('still renders when isReady is true before 300ms (minimum duration)', () => {
      const { container } = render(<Skeleton variant="table" isReady={true} />);
      // Timer hasn't fired yet, so skeleton should still be visible
      expect(container.querySelector('[data-variant="table"]')).toBeInTheDocument();
    });

    it('unmounts when isReady is true and 300ms elapsed', () => {
      const { container } = render(<Skeleton variant="table" isReady={true} />);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(container.querySelector('[data-variant="table"]')).not.toBeInTheDocument();
    });

    it('always renders when isReady is not provided', () => {
      const { container } = render(<Skeleton variant="table" />);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(container.querySelector('[data-variant="table"]')).toBeInTheDocument();
    });

    it('disappears immediately when isReady set after 300ms has passed', () => {
      const { container, rerender } = render(
        <Skeleton variant="table" isReady={false} />,
      );

      // Wait past the 300ms minimum
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Skeleton still visible because isReady is false
      expect(container.querySelector('[data-variant="table"]')).toBeInTheDocument();

      // Now set isReady to true — should disappear immediately
      rerender(<Skeleton variant="table" isReady={true} />);
      expect(container.querySelector('[data-variant="table"]')).not.toBeInTheDocument();
    });
  });
});
