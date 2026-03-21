import React from 'react';

import { ErrorBoundary } from './ErrorBoundary';

import type { Meta, StoryObj } from '@storybook/react';

function BuggyComponent() {
  throw new Error('Unexpected error in tenant configuration module');
}

function ErrorBoundaryDemo() {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div>
          <h3>Something went wrong</h3>
          <p>{error.message}</p>
          <button onClick={reset}>Try Again</button>
        </div>
      )}
    >
      <BuggyComponent />
    </ErrorBoundary>
  );
}

const meta = {
  title: '@hexalith/ui/Feedback/ErrorBoundary',
  component: ErrorBoundaryDemo,
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorBoundaryDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
