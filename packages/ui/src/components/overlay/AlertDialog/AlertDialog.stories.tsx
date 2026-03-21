import React, { useState } from 'react';

import { AlertDialog } from './AlertDialog';
import { Button } from '../../forms/Button';

import type { Meta, StoryObj } from '@storybook/react';

function AlertDialogDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>Delete Tenant</Button>
      <AlertDialog
        open={open}
        onAction={() => {
          console.log('Tenant deleted');
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
        title="Delete Tenant"
        description="This action cannot be undone. All data for Contoso Electronics will be permanently removed, including members, orders, and configuration."
        actionLabel="Delete"
        cancelLabel="Cancel"
      />
    </>
  );
}

const meta = {
  title: '@hexalith/ui/Overlay/AlertDialog',
  component: AlertDialogDemo,
  tags: ['autodocs'],
} satisfies Meta<typeof AlertDialogDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
