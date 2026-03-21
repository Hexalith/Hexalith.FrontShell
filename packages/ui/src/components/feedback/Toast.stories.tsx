import React from 'react';

import { ToastProvider, useToast } from './Toast';
import { Button } from '../forms/Button';
import { Inline } from '../layout/Inline';

import type { Meta, StoryObj } from '@storybook/react';

function ToastDemo() {
  const { toast } = useToast();

  return (
    <Inline gap="sm" wrap>
      <Button
        variant="primary"
        onClick={() => toast({ variant: 'success', title: 'Tenant created successfully', description: 'Contoso Electronics is now provisioning in Europe West.' })}
      >
        Success
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast({ variant: 'error', title: 'Failed to create tenant', description: 'Region Europe West is currently at capacity. Try North America East.' })}
      >
        Error
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast({ variant: 'warning', title: 'Tenant nearing member limit', description: 'Contoso Electronics has 48 of 50 allowed members.' })}
      >
        Warning
      </Button>
      <Button
        variant="ghost"
        onClick={() => toast({ variant: 'info', title: 'Maintenance scheduled', description: 'System maintenance on March 25, 2026 at 02:00 UTC.' })}
      >
        Info
      </Button>
    </Inline>
  );
}

function ToastStory() {
  return (
    <ToastProvider>
      <ToastDemo />
    </ToastProvider>
  );
}

const meta = {
  title: '@hexalith/ui/Feedback/Toast',
  component: ToastStory,
  tags: ['autodocs'],
} satisfies Meta<typeof ToastStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
