import { z } from 'zod';

import { Form, FormField } from './index';
import { Inline } from '../../layout/Inline';
import { Stack } from '../../layout/Stack';
import { Button } from '../Button';
import { Input } from '../Input';
import { Select } from '../Select';
import { TextArea } from '../TextArea';

import type { Meta, StoryObj } from '@storybook/react';

const tenantSchema = z.object({
  name: z.string().min(3, 'Tenant name must be at least 3 characters'),
  description: z.string().optional(),
  region: z.string().min(1, 'Please select a region'),
});

function CreateTenantForm() {
  return (
    <Form
      schema={tenantSchema}
      onSubmit={(data) => {
        console.log('Tenant created:', data);
      }}
      defaultValues={{ name: '', description: '', region: '' }}
    >
      <Stack gap="md">
        <FormField name="name">
          <Input label="Tenant Name" placeholder="e.g. Contoso Electronics" required />
        </FormField>
        <FormField name="description">
          <TextArea label="Description" placeholder="Describe this tenant environment" rows={3} />
        </FormField>
        <FormField name="region">
          <Select
            label="Region"
            placeholder="Select region"
            required
            options={[
              { value: 'europe-west', label: 'Europe West' },
              { value: 'north-america-east', label: 'North America East' },
              { value: 'asia-pacific', label: 'Asia Pacific' },
            ]}
          />
        </FormField>
        <Inline gap="sm" justify="end">
          <Button variant="ghost" type="reset">Cancel</Button>
          <Button variant="primary" type="submit">Create Tenant</Button>
        </Inline>
      </Stack>
    </Form>
  );
}

const meta = {
  title: '@hexalith/ui/Forms/Form',
  component: CreateTenantForm,
  tags: ['autodocs'],
} satisfies Meta<typeof CreateTenantForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
