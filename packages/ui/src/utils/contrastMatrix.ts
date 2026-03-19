/**
 * WCAG contrast ratio calculator and design token contrast validator.
 * Validates that text and focus ring tokens meet accessibility requirements.
 */

// ─── WCAG Contrast Calculation ───

/** Parse a hex color string to RGB components (0-255). */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  let r: number, g: number, b: number;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  }
  return [r, g, b];
}

/** Convert an sRGB channel (0-255) to linear light. */
function linearize(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Compute relative luminance per WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Compute WCAG contrast ratio between two colors (hex strings). Returns ratio >= 1. */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Token Definitions (resolved hex values for validation) ───

export interface ThemeColors {
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  surfacePrimary: string;
  surfaceSecondary: string;
  surfaceElevated: string;
  focusRing: string;
}

export const lightTheme: ThemeColors = {
  textPrimary: '#1E1D19',
  textSecondary: '#4D4A42',
  textTertiary: '#6B685E',
  surfacePrimary: '#FAF9F7',
  surfaceSecondary: '#F3F2EE',
  surfaceElevated: '#FFFFFF',
  focusRing: '#5B6AD0',
};

export const darkTheme: ThemeColors = {
  textPrimary: '#E8E6E1',
  textSecondary: '#B0ADA3',
  textTertiary: '#8C897E',
  surfacePrimary: '#1E1D19',
  surfaceSecondary: '#33312B',
  surfaceElevated: '#3E3C35',
  focusRing: '#7B85E8',
};

// ─── Contrast Validation ───

export interface ContrastResult {
  pair: string;
  theme: string;
  ratio: number;
  required: number;
  pass: boolean;
}

/** Validate all required contrast pairs for a given theme. */
export function validateThemeContrast(theme: ThemeColors, themeName: string): ContrastResult[] {
  const results: ContrastResult[] = [];

  const textPairs: [string, string, string, number][] = [
    ['text-primary', theme.textPrimary, theme.surfacePrimary, 7],
    ['text-secondary', theme.textSecondary, theme.surfacePrimary, 4.5],
    ['text-tertiary', theme.textTertiary, theme.surfacePrimary, 3],
  ];

  for (const [name, fg, bg, required] of textPairs) {
    const ratio = contrastRatio(fg, bg);
    results.push({
      pair: `${name} on surface-primary`,
      theme: themeName,
      ratio: Math.round(ratio * 100) / 100,
      required,
      pass: ratio >= required,
    });
  }

  return results;
}

/** Validate focus ring contrast against all surfaces (3 surfaces x 2 themes = 6 checks). */
export function validateFocusRingContrast(): ContrastResult[] {
  const results: ContrastResult[] = [];
  const required = 3;
  const themes: [string, ThemeColors][] = [
    ['light', lightTheme],
    ['dark', darkTheme],
  ];
  const surfaces: (keyof ThemeColors)[] = ['surfacePrimary', 'surfaceSecondary', 'surfaceElevated'];
  const surfaceLabels: Record<string, string> = {
    surfacePrimary: 'surface-primary',
    surfaceSecondary: 'surface-secondary',
    surfaceElevated: 'surface-elevated',
  };

  for (const [themeName, theme] of themes) {
    for (const surface of surfaces) {
      const ratio = contrastRatio(theme.focusRing, theme[surface]);
      results.push({
        pair: `focus-ring on ${surfaceLabels[surface]}`,
        theme: themeName,
        ratio: Math.round(ratio * 100) / 100,
        required,
        pass: ratio >= required,
      });
    }
  }

  return results;
}

/** Run the full contrast validation matrix. Returns all results and an overall pass/fail. */
export function validateContrastMatrix(): { results: ContrastResult[]; pass: boolean } {
  const results = [
    ...validateThemeContrast(lightTheme, 'light'),
    ...validateThemeContrast(darkTheme, 'dark'),
    ...validateFocusRingContrast(),
  ];

  return {
    results,
    pass: results.every((r) => r.pass),
  };
}
