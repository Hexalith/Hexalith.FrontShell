import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders as <button> element', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button').tagName).toBe('BUTTON');
  });

  it('defaults to variant="secondary"', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button')).toHaveAttribute(
      'data-variant',
      'secondary',
    );
  });

  it('defaults to size="md"', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'md');
  });

  it('defaults to type="button"', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('applies variant="primary" as data attribute', () => {
    render(<Button variant="primary">Test</Button>);
    expect(screen.getByRole('button')).toHaveAttribute(
      'data-variant',
      'primary',
    );
  });

  it('applies variant="ghost" as data attribute', () => {
    render(<Button variant="ghost">Test</Button>);
    expect(screen.getByRole('button')).toHaveAttribute(
      'data-variant',
      'ghost',
    );
  });

  it('applies size="sm" as data attribute', () => {
    render(<Button size="sm">Test</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'sm');
  });

  it('applies size="lg" as data attribute', () => {
    render(<Button size="lg">Test</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'lg');
  });

  it('fires onClick on click', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Click me
      </Button>,
    );

    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies disabled attribute', () => {
    render(<Button disabled>Test</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies root CSS class', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('root');
  });

  it('merges custom className with root class', () => {
    render(<Button className="custom">Test</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('root');
    expect(btn).toHaveClass('custom');
  });

  it('forwards ref to button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Test</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.tagName).toBe('BUTTON');
  });

  it('sets type="submit" when specified', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('has displayName set to Button', () => {
    expect(Button.displayName).toBe('Button');
  });
});
