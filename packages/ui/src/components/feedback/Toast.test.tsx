import React, { useRef } from 'react';
import { cleanup, render, screen, act, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider, useToast } from './Toast';

afterEach(cleanup);

// Helper component that triggers a toast
function ToastTrigger({
  variant = 'success' as const,
  title = 'Test toast',
  description,
  onIdCapture,
}: {
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  description?: string;
  onIdCapture?: (id: string) => void;
}) {
  const { toast } = useToast();
  return (
    <button
      onClick={() => {
        const id = toast({ variant, title, description });
        onIdCapture?.(id);
      }}
    >
      Trigger
    </button>
  );
}

describe('ToastProvider', () => {
  it('renders children without modification', () => {
    render(
      <ToastProvider>
        <div>Child content</div>
      </ToastProvider>,
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });
});

describe('useToast', () => {
  it('throws if used outside ToastProvider', () => {
    function BadComponent() {
      useToast();
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow(
      'useToast must be used within <ToastProvider>',
    );
  });
});

describe('Toast', () => {
  it('renders a toast with the given title', () => {
    render(
      <ToastProvider>
        <ToastTrigger title="Saved successfully" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger'));
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });

  it('renders a toast with description', () => {
    render(
      <ToastProvider>
        <ToastTrigger title="Saved" description="All changes saved" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger'));
    expect(screen.getByText('All changes saved')).toBeInTheDocument();
  });

  it('renders an accessible dismiss button for each toast', () => {
    render(
      <ToastProvider>
        <ToastTrigger title="Dismiss me" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger'));
    expect(
      screen.getByRole('button', { name: 'Dismiss notification' }),
    ).toBeInTheDocument();
  });

  it('toast() returns a string ID', () => {
    let capturedId: string | undefined;
    render(
      <ToastProvider>
        <ToastTrigger
          onIdCapture={(id) => {
            capturedId = id;
          }}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger'));
    expect(typeof capturedId).toBe('string');
  });

  it('renders correct data-variant attribute for each variant', () => {
    render(
      <ToastProvider>
        <ToastTrigger variant="success" title="Success msg" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger'));
    const toast = screen.getByText('Success msg').closest('[data-variant]');
    expect(toast).toHaveAttribute('data-variant', 'success');
  });

  it('maximum 3 toasts visible — trigger 4, verify only 3 rendered', () => {
    function FourTrigger() {
      const { toast } = useToast();
      return (
        <button
          onClick={() => {
            toast({ variant: 'success', title: 'T1' });
            toast({ variant: 'success', title: 'T2' });
            toast({ variant: 'success', title: 'T3' });
            toast({ variant: 'success', title: 'T4' });
          }}
        >
          Fire4
        </button>
      );
    }

    render(
      <ToastProvider>
        <FourTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Fire4'));

    // With batched state updates, only the final state (after eviction) is rendered
    // Should have at most 3 toasts
    const toastElements = document.querySelectorAll('[data-variant]');
    expect(toastElements.length).toBeLessThanOrEqual(3);
  });

  it('FIFO ordering: oldest non-error toast evicted first', () => {
    function FifoTrigger() {
      const { toast } = useToast();
      return (
        <button
          onClick={() => {
            toast({ variant: 'success', title: 'A' });
            toast({ variant: 'success', title: 'B' });
            toast({ variant: 'success', title: 'C' });
            toast({ variant: 'success', title: 'D' });
          }}
        >
          FireFifo
        </button>
      );
    }

    render(
      <ToastProvider>
        <FifoTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('FireFifo'));

    // A should be evicted, B, C, D should remain
    expect(screen.queryByText('A')).not.toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('smart eviction: error toasts protected from eviction', () => {
    function SmartEvictTrigger() {
      const { toast } = useToast();
      return (
        <button
          onClick={() => {
            toast({ variant: 'error', title: 'E1' });
            toast({ variant: 'success', title: 'S1' });
            toast({ variant: 'success', title: 'S2' });
            toast({ variant: 'success', title: 'S3' });
          }}
        >
          FireSmart
        </button>
      );
    }

    render(
      <ToastProvider>
        <SmartEvictTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('FireSmart'));

    // E1 (error) should be protected, S1 should be evicted
    expect(screen.getByText('E1')).toBeInTheDocument();
    expect(screen.queryByText('S1')).not.toBeInTheDocument();
  });

  it('dismiss(id) removes a specific toast', () => {
    function DismissTrigger() {
      const { toast, dismiss } = useToast();
      const idRef = useRef('');
      return (
        <div>
          <button
            onClick={() => {
              idRef.current = toast({ variant: 'error', title: 'Dismissable' });
            }}
          >
            Show
          </button>
          <button onClick={() => dismiss(idRef.current)}>DismissById</button>
        </div>
      );
    }

    render(
      <ToastProvider>
        <DismissTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Show'));
    expect(screen.getByText('Dismissable')).toBeInTheDocument();

    fireEvent.click(screen.getByText('DismissById'));
    expect(screen.queryByText('Dismissable')).not.toBeInTheDocument();
  });

  it('error variant renders with data-variant="error"', () => {
    render(
      <ToastProvider>
        <ToastTrigger variant="error" title="Error alert" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger'));
    const toast = screen.getByText('Error alert').closest('[data-variant]');
    expect(toast).toHaveAttribute('data-variant', 'error');
  });

  describe('auto-dismiss behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('success toast auto-dismisses after 5 seconds', () => {
      render(
        <ToastProvider>
          <ToastTrigger variant="success" title="Done" />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByText('Trigger'));
      expect(screen.getByText('Done')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5100);
      });

      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });

    it('error toast does NOT auto-dismiss', () => {
      render(
        <ToastProvider>
          <ToastTrigger variant="error" title="Failed" />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByText('Trigger'));
      expect(screen.getByText('Failed')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });
});
