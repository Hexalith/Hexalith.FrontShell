import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { Checkbox } from '../Checkbox';
import { DatePicker } from '../DatePicker';
import { Input } from '../Input';
import { Select } from '../Select';
import { TextArea } from '../TextArea';
import { Form } from './Form';
import { FormField } from './FormField';
import { useFormStatus } from './useFormStatus';

const TestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

const WithCheckboxSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  agree: z.literal(true, {
    errorMap: () => ({ message: 'Must agree' }),
  }),
});

function SubmitStatusDisplay() {
  const { isSubmitting, isDirty } = useFormStatus();
  return (
    <div>
      <span data-testid="submitting">{String(isSubmitting)}</span>
      <span data-testid="dirty">{String(isDirty)}</span>
    </div>
  );
}

describe('Form', () => {
  it('renders form element with children', () => {
    const handleSubmit = vi.fn();
    render(
      <Form schema={TestSchema} onSubmit={handleSubmit}>
        <FormField name="name">
          <Input label="Name" />
        </FormField>
      </Form>,
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('validates on submit and shows field-level error messages from Zod', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(
      <Form schema={TestSchema} onSubmit={handleSubmit} defaultValues={{ name: '', email: '' }}>
        <FormField name="name">
          <Input label="Name" />
        </FormField>
        <FormField name="email">
          <Input label="Email" />
        </FormField>
        <button type="submit">Submit</button>
      </Form>,
    );

    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Invalid email')).toBeInTheDocument();
    });
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with typed data on valid submission', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(
      <Form schema={TestSchema} onSubmit={handleSubmit} defaultValues={{ name: '', email: '' }}>
        <FormField name="name">
          <Input label="Name" />
        </FormField>
        <FormField name="email">
          <Input label="Email" />
        </FormField>
        <button type="submit">Submit</button>
      </Form>,
    );

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'John');
    await user.type(inputs[1], 'john@example.com');
    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        { name: 'John', email: 'john@example.com' },
        expect.anything(),
      );
    });
  });

  it('resets form to default values on reset', async () => {
    const user = userEvent.setup();
    const handleReset = vi.fn();
    render(
      <Form
        schema={TestSchema}
        onSubmit={vi.fn()}
        onReset={handleReset}
        defaultValues={{ name: 'Initial', email: '' }}
      >
        <FormField name="name">
          <Input label="Name" />
        </FormField>
        <button type="reset">Reset</button>
      </Form>,
    );

    const nameInput = screen.getByRole('textbox');
    await user.clear(nameInput);
    await user.type(nameInput, 'Changed');
    expect(nameInput).toHaveValue('Changed');

    await user.click(screen.getByText('Reset'));

    await waitFor(() => {
      expect(nameInput).toHaveValue('Initial');
    });
    expect(handleReset).toHaveBeenCalled();
  });

  it('FormField connects child Input to form state', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(
      <Form schema={TestSchema} onSubmit={handleSubmit} defaultValues={{ name: '', email: '' }}>
        <FormField name="name">
          <Input label="Name" />
        </FormField>
        <button type="submit">Submit</button>
      </Form>,
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'Test');

    expect(input).toHaveValue('Test');
  });

  it('FormField auto-detects required from Zod schema', () => {
    render(
      <Form schema={TestSchema} onSubmit={vi.fn()}>
        <FormField name="name">
          <Input label="Name" />
        </FormField>
      </Form>,
    );

    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
  });

  it('applies data-density attribute for comfortable density', () => {
    const { container } = render(
      <Form schema={TestSchema} onSubmit={vi.fn()} density="comfortable">
        <span>content</span>
      </Form>,
    );

    const form = container.querySelector('form');
    expect(form).toHaveAttribute('data-density', 'comfortable');
  });

  it('applies data-density attribute for compact density', () => {
    const { container } = render(
      <Form schema={TestSchema} onSubmit={vi.fn()} density="compact">
        <span>content</span>
      </Form>,
    );

    const form = container.querySelector('form');
    expect(form).toHaveAttribute('data-density', 'compact');
  });

  it('defaults to comfortable density', () => {
    const { container } = render(
      <Form schema={TestSchema} onSubmit={vi.fn()}>
        <span>content</span>
      </Form>,
    );

    const form = container.querySelector('form');
    expect(form).toHaveAttribute('data-density', 'comfortable');
  });

  it('disabled prop disables all form fields', () => {
    render(
      <Form schema={TestSchema} onSubmit={vi.fn()} disabled>
        <FormField name="name">
          <Input label="Name" />
        </FormField>
      </Form>,
    );

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('useFormStatus returns isDirty correctly', async () => {
    const user = userEvent.setup();
    render(
      <Form schema={TestSchema} onSubmit={vi.fn()} defaultValues={{ name: '', email: '' }}>
        <FormField name="name">
          <Input label="Name" />
        </FormField>
        <SubmitStatusDisplay />
      </Form>,
    );

    expect(screen.getByTestId('dirty')).toHaveTextContent('false');

    await user.type(screen.getByRole('textbox'), 'x');

    await waitFor(() => {
      expect(screen.getByTestId('dirty')).toHaveTextContent('true');
    });
  });

  it('works with Checkbox as FormField child', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(
      <Form schema={WithCheckboxSchema} onSubmit={handleSubmit} defaultValues={{ name: 'John' }}>
        <FormField name="name">
          <Input label="Name" />
        </FormField>
        <FormField name="agree">
          <Checkbox label="I agree" />
        </FormField>
        <button type="submit">Submit</button>
      </Form>,
    );

    // Submit without checking — should show error
    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Must agree')).toBeInTheDocument();
    });

    // Check and submit
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        { name: 'John', agree: true },
        expect.anything(),
      );
    });
  });

  it('works with TextArea as FormField child', async () => {
    const TextAreaSchema = z.object({
      notes: z.string().min(1, 'Notes required'),
    });
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(
      <Form schema={TextAreaSchema} onSubmit={handleSubmit} defaultValues={{ notes: '' }}>
        <FormField name="notes">
          <TextArea label="Notes" />
        </FormField>
        <button type="submit">Submit</button>
      </Form>,
    );

    await user.type(screen.getByRole('textbox'), 'Some notes');
    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        { notes: 'Some notes' },
        expect.anything(),
      );
    });
  });

  it('works with Select as FormField child', async () => {
    const SelectSchema = z.object({
      role: z.string().min(1, 'Role required'),
    });
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(
      <Form schema={SelectSchema} onSubmit={handleSubmit} defaultValues={{ role: '' }}>
        <FormField name="role">
          <Select
            label="Role"
            options={[
              { label: 'Admin', value: 'admin' },
              { label: 'User', value: 'user' },
            ]}
          />
        </FormField>
        <button type="submit">Submit</button>
      </Form>,
    );

    // Submit without selecting → should show error
    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Role required')).toBeInTheDocument();
    });
  });

  it('works with DatePicker as FormField child', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    const DateSchema = z.object({
      startDate: z.date(),
    });

    render(
      <Form
        schema={DateSchema}
        onSubmit={handleSubmit}
        defaultValues={{ startDate: new Date(2026, 0, 1) }}
      >
        <FormField name="startDate">
          <DatePicker label="Start date" />
        </FormField>
        <button type="submit">Submit</button>
      </Form>,
    );

    await user.click(screen.getByRole('button', { name: 'Start date' }));

    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    const day15 = screen.getByRole('gridcell', { name: '15' });
    await user.click(day15.querySelector('button') ?? day15);
    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled();
    });

    const submitted = handleSubmit.mock.calls[0][0] as { startDate: Date };
    expect(submitted.startDate).toBeInstanceOf(Date);
    expect(submitted.startDate.getDate()).toBe(15);
  });

  it('has displayName set to Form', () => {
    expect((Form as { displayName?: string }).displayName).toBe('Form');
  });
});
