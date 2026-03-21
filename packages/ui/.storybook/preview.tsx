import type { Preview } from '@storybook/react';
import { MockShellProvider } from '@hexalith/shell-api';

// Import tokens in @layer cascade order:
// @layer reset, tokens, primitives, components, density, module
import '../src/tokens/layers.css';
import '../src/tokens/reset.css';
import '../src/tokens/colors.css';
import '../src/tokens/spacing.css';
import '../src/tokens/typography.css';
import '../src/tokens/motion.css';
import '../src/tokens/interactive.css';
import '../src/tokens/z-index.css';
import '../src/tokens/radius.css';

function withShellProvider(Story: Parameters<NonNullable<Preview['decorators']>[number]>[0], context: Parameters<NonNullable<Preview['decorators']>[number]>[1]) {
  const theme = context.globals.theme === 'dark' ? 'dark' : 'light';

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  return (
    <MockShellProvider theme={theme}>
      <Story />
    </MockShellProvider>
  );
}

const preview: Preview = {
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for Storybook previews',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    withShellProvider,
  ],
  parameters: {
    viewport: {
      viewports: {
        tablet: {
          name: 'Tablet (1024px)',
          styles: { width: '1024px', height: '768px' },
        },
        desktop: {
          name: 'Desktop (1280px)',
          styles: { width: '1280px', height: '900px' },
        },
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: 'var(--color-surface-primary, #FAF9F7)' },
        { name: 'dark', value: 'var(--color-surface-primary, #1E1D19)' },
      ],
    },
    docs: {
      toc: true,
    },
  },
};

export default preview;
