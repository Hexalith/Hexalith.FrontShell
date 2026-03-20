import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageLayout } from './PageLayout';

describe('PageLayout', () => {
  it('renders children in the content area', () => {
    render(<PageLayout>Content here</PageLayout>);
    expect(screen.getByRole('main')).toHaveTextContent('Content here');
  });

  it('renders title in page header when provided', () => {
    render(<PageLayout title="Dashboard">Content</PageLayout>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
  });

  it('renders subtitle when provided with title', () => {
    render(
      <PageLayout title="Dashboard" subtitle="Overview of metrics">
        Content
      </PageLayout>,
    );
    expect(screen.getByText('Overview of metrics')).toBeInTheDocument();
  });

  it('does not render subtitle without title', () => {
    render(<PageLayout subtitle="Orphaned subtitle">Content</PageLayout>);
    expect(screen.queryByText('Orphaned subtitle')).not.toBeInTheDocument();
  });

  it('does not render header when neither title nor actions are provided', () => {
    render(<PageLayout>Content</PageLayout>);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('does not render header when actions is null', () => {
    render(<PageLayout actions={null}>Content</PageLayout>);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('renders header when only actions are provided', () => {
    render(
      <PageLayout actions={<button>Save</button>}>Content</PageLayout>,
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders header with both title and actions', () => {
    render(
      <PageLayout title="Settings" actions={<button>Save</button>}>
        Content
      </PageLayout>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('applies root CSS class', () => {
    const { container } = render(<PageLayout>Content</PageLayout>);
    expect(container.firstChild).toHaveClass('root');
  });

  it('merges custom className with root class', () => {
    const { container } = render(
      <PageLayout className="custom-page">Content</PageLayout>,
    );
    expect(container.firstChild).toHaveClass('root');
    expect(container.firstChild).toHaveClass('custom-page');
  });

  it('renders content in main element', () => {
    render(<PageLayout>Main content</PageLayout>);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('pageContent');
  });
});
