import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders label associated with checkbox', () => {
    render(<Checkbox label="Agree to terms" />);
    const checkbox = screen.getByLabelText('Agree to terms');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('type', 'checkbox');
  });

  it('calls onChange with boolean value on click', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Checkbox label="Agree" onChange={handleChange} />);

    await user.click(screen.getByLabelText('Agree'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when unchecking', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Checkbox label="Agree" checked onChange={handleChange} />);

    await user.click(screen.getByLabelText('Agree'));
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('renders error message linked via aria-describedby', () => {
    render(<Checkbox label="Agree" error="Must agree" id="agree" />);
    const checkbox = screen.getByLabelText('Agree');
    const errorMsg = screen.getByText('Must agree');

    expect(checkbox).toHaveAttribute('aria-describedby', 'agree-error');
    expect(errorMsg).toHaveAttribute('id', 'agree-error');
  });

  it('sets aria-invalid when error is present', () => {
    render(<Checkbox label="Agree" error="Must agree" />);
    expect(screen.getByLabelText('Agree')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows required indicator when required', () => {
    render(<Checkbox label="Agree" required />);
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveAttribute('aria-hidden', 'true');
  });

  it('sets aria-required when required', () => {
    render(<Checkbox label="Agree" required />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-required', 'true');
  });

  it('applies disabled state', () => {
    render(<Checkbox label="Agree" disabled />);
    expect(screen.getByLabelText('Agree')).toBeDisabled();
  });

  it('toggles via Space key', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Checkbox label="Agree" onChange={handleChange} />);

    const checkbox = screen.getByLabelText('Agree');
    checkbox.focus();
    await user.keyboard(' ');
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('forwards ref to input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox label="Agree" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('checkbox');
  });

  it('has displayName set to Checkbox', () => {
    expect(Checkbox.displayName).toBe('Checkbox');
  });

  it('passes name attribute', () => {
    render(<Checkbox label="Agree" name="agree" />);
    expect(screen.getByLabelText('Agree')).toHaveAttribute('name', 'agree');
  });

  it('calls onBlur when checkbox loses focus', async () => {
    const user = userEvent.setup();
    const handleBlur = vi.fn();
    render(<Checkbox label="Agree" onBlur={handleBlur} />);

    await user.click(screen.getByLabelText('Agree'));
    await user.tab();
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});
