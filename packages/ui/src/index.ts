// Category order: Layout -> Forms -> Feedback -> Navigation -> Overlay -> Data Display

// --- Layout ---
export { PageLayout } from './components/layout/PageLayout';
export type { PageLayoutProps } from './components/layout/PageLayout';
export { Stack } from './components/layout/Stack';
export type { StackProps } from './components/layout/Stack';
export { Inline } from './components/layout/Inline';
export type { InlineProps } from './components/layout/Inline';
export { Divider } from './components/layout/Divider';
export type { DividerProps } from './components/layout/Divider';
export type { SpacingScale } from './components/layout/types';

// --- Forms ---
export { Button } from './components/forms/Button';
export type { ButtonProps } from './components/forms/Button';
export { Input } from './components/forms/Input';
export type { InputProps } from './components/forms/Input';
export { Select } from './components/forms/Select';
export type {
  SelectProps,
  SelectOption,
  SelectOptionGroup,
} from './components/forms/Select';

// --- Overlay ---
export { Tooltip } from './components/overlay/Tooltip';
export type { TooltipProps } from './components/overlay/Tooltip';

// --- Utilities ---
export { computeComplianceScore } from './utils/complianceScore';
export {
  contrastRatio,
  relativeLuminance,
  hexToRgb,
  validateContrastMatrix,
  validateThemeContrast,
  validateFocusRingContrast,
  lightTheme,
  darkTheme,
} from './utils/contrastMatrix';
export type { ThemeColors, ContrastResult } from './utils/contrastMatrix';
