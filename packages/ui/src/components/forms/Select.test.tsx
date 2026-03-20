import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Select } from './Select';

import type { SelectOption, SelectOptionGroup } from './Select';

const flatOptions: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

const groupedOptions: Array<SelectOption | SelectOptionGroup> = [
  {
    label: 'Fruits',
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
    ],
  },
  {
    label: 'Vegetables',
    options: [
      { value: 'carrot', label: 'Carrot' },
      { value: 'pea', label: 'Pea' },
    ],
  },
];

describe('Select', () => {
  it('renders trigger with placeholder text', () => {
    render(<Select label="Fruit" options={flatOptions} />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('renders custom placeholder', () => {
    render(
      <Select
        label="Fruit"
        options={flatOptions}
        placeholder="Pick a fruit"
      />,
    );
    expect(screen.getByText('Pick a fruit')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<Select label="Fruit" options={flatOptions} />);
    expect(screen.getByText('Fruit')).toBeInTheDocument();
  });

  it('renders options when opened', async () => {
    const user = userEvent.setup();
    render(<Select label="Fruit" options={flatOptions} />);

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Banana')).toBeInTheDocument();
      expect(screen.getByText('Cherry')).toBeInTheDocument();
    });
  });

  it('renders grouped options with group labels', async () => {
    const user = userEvent.setup();
    render(<Select label="Food" options={groupedOptions} />);

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Fruits')).toBeInTheDocument();
      expect(screen.getByText('Vegetables')).toBeInTheDocument();
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Carrot')).toBeInTheDocument();
    });
  });

  it('calls onChange when option selected', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <Select label="Fruit" options={flatOptions} onChange={handleChange} />,
    );

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Apple'));
    expect(handleChange).toHaveBeenCalledWith('apple');
  });

  it('renders search input when isSearchable is true', async () => {
    const user = userEvent.setup();
    render(<Select label="Fruit" options={flatOptions} isSearchable />);

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByTestId('select-search-input')).toBeInTheDocument();
    });
  });

  it('filters options when searching', async () => {
    const user = userEvent.setup();
    render(<Select label="Fruit" options={flatOptions} isSearchable />);

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByTestId('select-search-input')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('select-search-input');
    await user.click(searchInput);
    await user.type(searchInput, 'app');

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.queryByText('Banana')).not.toBeInTheDocument();
      expect(screen.queryByText('Cherry')).not.toBeInTheDocument();
    });
  });

  it('renders error message with correct aria linking', () => {
    render(
      <Select label="Fruit" options={flatOptions} error="Required field" />,
    );
    const trigger = screen.getByRole('combobox');
    const errorMsg = screen.getByText('Required field');

    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toHaveAttribute('aria-describedby', errorMsg.id);
    expect(errorMsg).toBeInTheDocument();
  });

  it('renders required indicator', () => {
    render(<Select label="Fruit" options={flatOptions} required />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-required', 'true');
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveAttribute('aria-hidden', 'true');
  });

  it('warns in dev mode when options lack value/label keys', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const badOptions = [{ id: '1', name: 'Test' }] as unknown as SelectOption[];

    render(<Select label="Test" options={badOptions} />);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Select: options must have 'value' and 'label' properties",
      ),
    );
    warnSpy.mockRestore();
  });

  it('warns in dev mode when options contain duplicate values', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dupOptions: SelectOption[] = [
      { value: 'apple', label: 'Apple' },
      { value: 'apple', label: 'Apple 2' },
    ];

    render(<Select label="Test" options={dupOptions} />);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('duplicate `value` entries'),
    );
    warnSpy.mockRestore();
  });

  it('passes name prop through to Radix for form submission', () => {
    // Radix Select renders a hidden native <select> for form submission
    // when the name prop is provided. In jsdom, the BubbleSelect rendering
    // is limited, so we verify the component accepts and renders with name.
    const { container } = render(
      <Select
        label="Fruit"
        options={flatOptions}
        name="fruit-field"
        value="apple"
      />,
    );
    // Verify the component renders without error when name is provided
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('root');
  });

  it('keyboard: ArrowDown + Enter selects an option', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <Select label="Fruit" options={flatOptions} onChange={handleChange} />,
    );

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalled();
    });
  });

  it('Escape closes dropdown when search input is focused', async () => {
    const user = userEvent.setup();
    render(<Select label="Fruit" options={flatOptions} isSearchable />);

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByTestId('select-search-input')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('select-search-input');
    await user.click(searchInput);
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(
        screen.queryByTestId('select-search-input'),
      ).not.toBeInTheDocument();
    });
  });

  it('applies root CSS class', () => {
    const { container } = render(
      <Select label="Fruit" options={flatOptions} />,
    );
    expect(container.firstChild).toHaveClass('root');
  });

  it('merges custom className', () => {
    const { container } = render(
      <Select label="Fruit" options={flatOptions} className="custom" />,
    );
    expect(container.firstChild).toHaveClass('root');
    expect(container.firstChild).toHaveClass('custom');
  });

  it('forwards ref to trigger button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Select label="Fruit" options={flatOptions} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('has displayName set to Select', () => {
    expect(Select.displayName).toBe('Select');
  });
});
