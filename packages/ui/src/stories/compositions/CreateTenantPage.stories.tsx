import { z } from 'zod';

import { Button } from '../../components/forms/Button';
import { Checkbox } from '../../components/forms/Checkbox';
import { Form, FormField } from '../../components/forms/Form';
import { Input } from '../../components/forms/Input';
import { Select } from '../../components/forms/Select';
import { TextArea } from '../../components/forms/TextArea';
import { Divider } from '../../components/layout/Divider';
import { Inline } from '../../components/layout/Inline';
import { PageLayout } from '../../components/layout/PageLayout';
import { Stack } from '../../components/layout/Stack';

import type { Meta, StoryObj } from '@storybook/react';

const createTenantSchema = z.object({
  name: z.string().min(3, 'Tenant name must be at least 3 characters'),
  description: z.string().optional(),
  region: z.string().min(1, 'Please select a region'),
  defaultLanguage: z.string().min(1, 'Please select a language'),
  defaultCurrency: z.string().min(1, 'Please select a currency'),
  enableSSO: z.boolean().optional(),
});

export function CreateTenantPage() {
  return (
    <PageLayout
      title="Create Tenant"
      subtitle="Set up a new tenant environment for your organization"
    >
      <Form
        schema={createTenantSchema}
        onSubmit={(data) => {
          console.log('Submitted:', data);
        }}
        defaultValues={{
          name: '',
          description: '',
          region: '',
          defaultLanguage: 'en-US',
          defaultCurrency: 'USD',
          enableSSO: false,
        }}
      >
        <Stack gap="lg">
          <Stack gap="md">
            <FormField name="name">
              <Input
                label="Tenant Name"
                placeholder="e.g. Contoso Electronics"
                required
              />
            </FormField>
            <FormField name="description">
              <TextArea
                label="Description"
                placeholder="Brief description of this tenant's purpose"
                rows={3}
              />
            </FormField>
          </Stack>

          <Divider />

          <Stack gap="md">
            <FormField name="region">
              <Select
                label="Region"
                placeholder="Select deployment region"
                required
                options={[
                  { value: 'europe-west', label: 'Europe West' },
                  { value: 'north-america-east', label: 'North America East' },
                  { value: 'asia-pacific', label: 'Asia Pacific' },
                ]}
              />
            </FormField>
            <FormField name="defaultLanguage">
              <Select
                label="Default Language"
                options={[
                  { value: 'en-US', label: 'English (US)' },
                  { value: 'de-DE', label: 'German' },
                  { value: 'fr-FR', label: 'French' },
                  { value: 'ja-JP', label: 'Japanese' },
                ]}
              />
            </FormField>
            <FormField name="defaultCurrency">
              <Select
                label="Default Currency"
                options={[
                  { value: 'USD', label: 'US Dollar (USD)' },
                  { value: 'EUR', label: 'Euro (EUR)' },
                  { value: 'GBP', label: 'British Pound (GBP)' },
                  { value: 'JPY', label: 'Japanese Yen (JPY)' },
                ]}
              />
            </FormField>
          </Stack>

          <Divider />

          <FormField name="enableSSO">
            <Checkbox label="Enable Single Sign-On (SSO) for this tenant" />
          </FormField>

          <Inline gap="sm" justify="end">
            <Button variant="ghost" type="reset">Cancel</Button>
            <Button variant="primary" type="submit">Create Tenant</Button>
          </Inline>
        </Stack>
      </Form>
    </PageLayout>
  );
}

const meta = {
  title: '@hexalith/ui/Compositions/Create Tenant Form',
  component: CreateTenantPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof CreateTenantPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
