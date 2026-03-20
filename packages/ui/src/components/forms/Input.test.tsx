import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Input } from './Input';

describe('Input', () => {
  it('renders label associated with input via htmlFor/id', () => {
    render(<Input label="Name" />);
    const input = screen.getByLabelText('Name');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('auto-generates id when not provided', () => {
    render(<Input label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id');
    expect(input.id).toBeTruthy();
  });

  it('uses provided id', () => {
    render(<Input label="Email" id="custom-id" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'custom-id');
  });

  it('generates unique ids for multiple instances', () => {
    render(
      <>
        <Input label="First" />
        <Input label="Second" />
      </>,
    );
    const first = screen.getByLabelText('First');
    const second = screen.getByLabelText('Second');
    expect(first.id).not.toBe(second.id);
  });

  it('shows required indicator when required', () => {
    render(<Input label="Name" required />);
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveAttribute('aria-hidden', 'true');
  });

  it('sets aria-required when required', () => {
    render(<Input label="Name" required />);
    expect(screen.getByRole('textbox')).toHaveAttribute(
      'aria-required',
      'true',
    );
  });

  it('does not set aria-required when not required', () => {
    render(<Input label="Name" />);
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-required');
  });

  it('renders error message linked via aria-describedby', () => {
    render(<Input label="Email" error="Invalid email" id="email" />);
    const input = screen.getByLabelText('Email');
    const errorMsg = screen.getByText('Invalid email');

    expect(input).toHaveAttribute('aria-describedby', 'email-error');
    expect(errorMsg).toHaveAttribute('id', 'email-error');
  });

  it('sets aria-invalid when error is present', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('does not set aria-invalid when no error', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
  });

  it('does not render error message when no error', () => {
    render(<Input label="Email" />);
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });

  it('fires onChange with string value', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input label="Name" onChange={handleChange} />);

    await user.type(screen.getByLabelText('Name'), 'hello');
    expect(handleChange).toHaveBeenCalledWith('h');
    expect(handleChange).toHaveBeenCalledTimes(5);
  });

  it('applies disabled state', () => {
    render(<Input label="Name" disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });

  it('applies root CSS class', () => {
    const { container } = render(<Input label="Name" />);
    expect(container.firstChild).toHaveClass('root');
  });

  it('merges custom className', () => {
    const { container } = render(<Input label="Name" className="custom" />);
    expect(container.firstChild).toHaveClass('root');
    expect(container.firstChild).toHaveClass('custom');
  });

  it('forwards ref to input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input label="Name" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('passes name attribute', () => {
    render(<Input label="Email" name="email" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('name', 'email');
  });

  it('defaults to type="text"', () => {
    render(<Input label="Name" />);
    expect(screen.getByLabelText('Name')).toHaveAttribute('type', 'text');
  });

  it('has displayName set to Input', () => {
    expect(Input.displayName).toBe('Input');
  });
});
