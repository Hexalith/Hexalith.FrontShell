import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorDisplay } from './ErrorDisplay';

afterEach(cleanup);

describe('ErrorDisplay', () => {
  it('renders default title "Something went wrong"', () => {
    render(<ErrorDisplay error="An error occurred" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders custom title when provided', () => {
    render(<ErrorDisplay error="fail" title="Custom Error" />);
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
  });

  it('renders error message from string', () => {
    render(<ErrorDisplay error="Connection failed" />);
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('renders error message from Error object', () => {
    const error = new Error('Something broke');
    render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    render(<ErrorDisplay error="fail" onRetry={() => {}} />);
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('retry button fires onRetry callback', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorDisplay error="fail" onRetry={onRetry} />);

    await user.click(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does NOT render retry button when onRetry not provided', () => {
    render(<ErrorDisplay error="fail" />);
    expect(screen.queryByText('Try again')).not.toBeInTheDocument();
  });

  it('renders stack trace details for Error objects in dev mode', () => {
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test.tsx:1';
    render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Stack trace')).toBeInTheDocument();
  });

  it('has role="alert" for accessibility', () => {
    render(<ErrorDisplay error="fail" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('merges className', () => {
    const { container } = render(
      <ErrorDisplay error="fail" className="custom" />,
    );
    expect(container.firstElementChild).toHaveClass('custom');
  });
});
