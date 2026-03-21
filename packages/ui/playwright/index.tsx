import { beforeMount } from '@playwright/experimental-ct-react/hooks';
import { MockShellProvider } from '@hexalith/shell-api';
import '../src/tokens/layers.css';
import '../src/tokens/reset.css';
import '../src/tokens/colors.css';
import '../src/tokens/spacing.css';
import '../src/tokens/typography.css';
import '../src/tokens/motion.css';
import '../src/tokens/interactive.css';
import '../src/tokens/z-index.css';
import '../src/tokens/radius.css';

beforeMount(async ({ App }) => {
  // Set body background to follow theme tokens so axe-core computes
  // correct contrast against the actual theme background
  document.body.style.backgroundColor = 'var(--color-surface-primary)';
  document.body.style.color = 'var(--color-text-primary)';
  return (
    <MockShellProvider>
      <App />
    </MockShellProvider>
  );
});
