import React, { useState } from 'react';

import { Modal } from './Modal';
import { Button } from '../../forms/Button';
import { Input } from '../../forms/Input';
import { Stack } from '../../layout/Stack';

import type { Meta, StoryObj } from '@storybook/react';

function ModalDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Edit Tenant</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit Tenant"
        description="Update the tenant configuration for Contoso Electronics."
      >
        <Stack gap="md">
          <Input label="Tenant Name" value="Contoso Electronics" />
          <Input label="Contact Email" value="admin@contoso.com" />
        </Stack>
      </Modal>
    </>
  );
}

const meta = {
  title: '@hexalith/ui/Overlay/Modal',
  component: ModalDemo,
  tags: ['autodocs'],
} satisfies Meta<typeof ModalDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
