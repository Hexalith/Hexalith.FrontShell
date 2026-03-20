/**
 * Maps to design token --spacing-{value}. Enforces the 4px/8px rhythm.
 * Values are strings (not numbers) to signal these are token references, not raw pixels.
 * This prevents arithmetic (gap={base + 1}) which would bypass the design system.
 *
 * '0' = 0px, '1' = 4px, '2' = 8px, '3' = 12px, '4' = 16px (default),
 * '5' = 24px, '6' = 32px, '7' = 48px, '8' = 64px
 */
export type SpacingScale = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
