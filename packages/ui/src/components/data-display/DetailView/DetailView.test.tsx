import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DetailView } from './DetailView';

import type { DetailSection } from './DetailView';

const testSections: DetailSection[] = [
  {
    title: 'General Information',
    fields: [
      { label: 'Name', value: 'Acme Corp' },
      { label: 'Status', value: 'Active' },
    ],
  },
  {
    title: 'Contact Details',
    fields: [
      { label: 'Email', value: 'info@acme.com' },
      { label: 'Phone', value: '+1 555-0123' },
    ],
  },
];

describe('DetailView', () => {
  it('renders sections with titles', () => {
    render(<DetailView sections={testSections} />);
    expect(screen.getByText('General Information')).toBeInTheDocument();
    expect(screen.getByText('Contact Details')).toBeInTheDocument();
  });

  it('renders field labels and values', () => {
    render(<DetailView sections={testSections} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('info@acme.com')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(
      <DetailView
        sections={testSections}
        actions={<button type="button">Edit</button>}
      />,
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('handles ReactNode values', () => {
    const sectionsWithNode: DetailSection[] = [
      {
        title: 'Info',
        fields: [
          {
            label: 'Status',
            value: <span data-testid="badge">Active</span>,
          },
        ],
      },
    ];
    render(<DetailView sections={sectionsWithNode} />);
    expect(screen.getByTestId('badge')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('loading state shows Skeleton component', () => {
    render(<DetailView sections={testSections} loading />);
    // Skeleton renders with aria-busy="true" and aria-label="Loading content"
    expect(screen.getByLabelText('Loading content')).toBeInTheDocument();
    // Field values should not be rendered during loading
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
  });

  it('applies data-density attribute', () => {
    const { container } = render(
      <DetailView sections={testSections} density="compact" />,
    );
    expect(container.firstChild).toHaveAttribute('data-density', 'compact');
  });

  it('defaults to comfortable density', () => {
    const { container } = render(<DetailView sections={testSections} />);
    expect(container.firstChild).toHaveAttribute('data-density', 'comfortable');
  });

  it('handles empty sections gracefully', () => {
    const emptySections: DetailSection[] = [
      { title: 'Empty Section', fields: [] },
    ];
    render(<DetailView sections={emptySections} />);
    expect(screen.getByText('Empty Section')).toBeInTheDocument();
  });

  it('renders span=2 field with data-span attribute', () => {
    const sectionsWithSpan: DetailSection[] = [
      {
        title: 'Info',
        fields: [
          { label: 'Description', value: 'A long description', span: 2 },
        ],
      },
    ];
    const { container } = render(<DetailView sections={sectionsWithSpan} />);
    const spanField = container.querySelector('[data-span="2"]');
    expect(spanField).toBeInTheDocument();
    expect(screen.getByText('A long description')).toBeInTheDocument();
  });

  it('has displayName set to DetailView', () => {
    expect(DetailView.displayName).toBe('DetailView');
  });

  it('renders dividers between sections', () => {
    const { container } = render(<DetailView sections={testSections} />);
    const dividers = container.querySelectorAll('hr');
    expect(dividers.length).toBe(1); // One divider between two sections
  });
});
