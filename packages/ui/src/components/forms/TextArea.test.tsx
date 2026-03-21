import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TextArea } from './TextArea';

describe('TextArea', () => {
  it('renders label associated with textarea via htmlFor/id', () => {
    render(<TextArea label="Description" />);
    const textarea = screen.getByLabelText('Description');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('auto-generates id when not provided', () => {
    render(<TextArea label="Notes" />);
    const textarea = screen.getByLabelText('Notes');
    expect(textarea).toHaveAttribute('id');
    expect(textarea.id).toBeTruthy();
  });

  it('renders error message linked via aria-describedby', () => {
    render(<TextArea label="Bio" error="Too short" id="bio" />);
    const textarea = screen.getByLabelText('Bio');
    const errorMsg = screen.getByText('Too short');

    expect(textarea).toHaveAttribute('aria-describedby', 'bio-error');
    expect(errorMsg).toHaveAttribute('id', 'bio-error');
  });

  it('sets aria-invalid when error is present', () => {
    render(<TextArea label="Bio" error="Too short" />);
    expect(screen.getByLabelText('Bio')).toHaveAttribute('aria-invalid', 'true');
  });

  it('fires onChange with string value', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TextArea label="Notes" onChange={handleChange} />);

    await user.type(screen.getByLabelText('Notes'), 'hello');
    expect(handleChange).toHaveBeenCalledWith('h');
    expect(handleChange).toHaveBeenCalledTimes(5);
  });

  it('shows required indicator when required', () => {
    render(<TextArea label="Notes" required />);
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveAttribute('aria-hidden', 'true');
  });

  it('sets aria-required when required', () => {
    render(<TextArea label="Notes" required />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
  });

  it('applies disabled state', () => {
    render(<TextArea label="Notes" disabled />);
    expect(screen.getByLabelText('Notes')).toBeDisabled();
  });

  it('forwards ref to textarea element', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<TextArea label="Notes" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('respects rows prop', () => {
    render(<TextArea label="Notes" rows={5} />);
    expect(screen.getByLabelText('Notes')).toHaveAttribute('rows', '5');
  });

  it('defaults to 3 rows', () => {
    render(<TextArea label="Notes" />);
    expect(screen.getByLabelText('Notes')).toHaveAttribute('rows', '3');
  });

  it('respects resize prop via CSS custom property', () => {
    render(<TextArea label="Notes" resize="none" />);
    const textarea = screen.getByLabelText('Notes');
    expect(textarea).toHaveAttribute('data-resize', 'none');
  });

  it('has displayName set to TextArea', () => {
    expect(TextArea.displayName).toBe('TextArea');
  });

  it('passes name attribute', () => {
    render(<TextArea label="Notes" name="notes" />);
    expect(screen.getByLabelText('Notes')).toHaveAttribute('name', 'notes');
  });

  it('calls onBlur when textarea loses focus', async () => {
    const user = userEvent.setup();
    const handleBlur = vi.fn();
    render(<TextArea label="Notes" onBlur={handleBlur} />);

    await user.click(screen.getByLabelText('Notes'));
    await user.tab();
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});
