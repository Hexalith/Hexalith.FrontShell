import { readFileSync } from 'node:fs';

import { describe, it, expect } from 'vitest';

import {
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  validateThemeContrast,
  validateFocusRingContrast,
  validateContrastMatrix,
  lightTheme,
  darkTheme,
} from './contrastMatrix';

const colorsCss = readFileSync(new URL('../tokens/colors.css', import.meta.url), 'utf8');

/**
 * Resolve var(--name) references in a CSS section to their primitive hex values.
 * Primitives are looked up from the full CSS since they live in :root.
 */
function resolveColorVar(section: string, semanticVar: string, fullCss: string = section): string | null {
  const escapedVar = semanticVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = section.match(new RegExp(`${escapedVar}:\\s*([^;]+);`));
  if (!match) return null;
  const value = match[1].trim();
  const varRef = value.match(/^var\(([^)]+)\)$/);
  if (!varRef) return value;
  const escapedPrim = varRef[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const primMatch = fullCss.match(new RegExp(`${escapedPrim}:\\s*([^;]+);`));
  return primMatch ? primMatch[1].trim() : null;
}

// ─── Core calculations ───

describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#FF0000')).toEqual([255, 0, 0]);
    expect(hexToRgb('#00FF00')).toEqual([0, 255, 0]);
    expect(hexToRgb('#0000FF')).toEqual([0, 0, 255]);
  });

  it('parses 3-digit hex', () => {
    expect(hexToRgb('#FFF')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000')).toEqual([0, 0, 0]);
  });

  it('handles lowercase', () => {
    expect(hexToRgb('#ff8800')).toEqual([255, 136, 0]);
  });
});

describe('relativeLuminance', () => {
  it('returns 0 for black', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 4);
  });

  it('returns 1 for white', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 4);
  });

  it('returns ~0.2126 for pure red', () => {
    expect(relativeLuminance('#FF0000')).toBeCloseTo(0.2126, 3);
  });
});

describe('contrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  it('returns 1:1 for same colors', () => {
    expect(contrastRatio('#888888', '#888888')).toBeCloseTo(1, 1);
  });

  it('is commutative', () => {
    const a = contrastRatio('#1E1D19', '#FAF9F7');
    const b = contrastRatio('#FAF9F7', '#1E1D19');
    expect(a).toBeCloseTo(b, 4);
  });
});

// ─── Light theme contrast ───

describe('light theme contrast', () => {
  it('text-primary on surface-primary >= 7:1', () => {
    const ratio = contrastRatio(lightTheme.textPrimary, lightTheme.surfacePrimary);
    expect(ratio).toBeGreaterThanOrEqual(7);
  });

  it('text-secondary on surface-primary >= 4.5:1', () => {
    const ratio = contrastRatio(lightTheme.textSecondary, lightTheme.surfacePrimary);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('text-tertiary on surface-primary >= 3:1', () => {
    const ratio = contrastRatio(lightTheme.textTertiary, lightTheme.surfacePrimary);
    expect(ratio).toBeGreaterThanOrEqual(3);
  });
});

// ─── Dark theme contrast ───

describe('dark theme contrast', () => {
  it('text-primary on surface-primary >= 7:1', () => {
    const ratio = contrastRatio(darkTheme.textPrimary, darkTheme.surfacePrimary);
    expect(ratio).toBeGreaterThanOrEqual(7);
  });

  it('text-secondary on surface-primary >= 4.5:1', () => {
    const ratio = contrastRatio(darkTheme.textSecondary, darkTheme.surfacePrimary);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('text-tertiary on surface-primary >= 3:1', () => {
    const ratio = contrastRatio(darkTheme.textTertiary, darkTheme.surfacePrimary);
    expect(ratio).toBeGreaterThanOrEqual(3);
  });
});

// ─── Focus ring contrast (3 surfaces x 2 themes = 6 checks) ───

describe('focus ring contrast', () => {
  const surfaces: (keyof typeof lightTheme)[] = ['surfacePrimary', 'surfaceSecondary', 'surfaceElevated'];

  for (const surface of surfaces) {
    it(`light focus-ring on ${surface} >= 3:1`, () => {
      const ratio = contrastRatio(lightTheme.focusRing, lightTheme[surface]);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it(`dark focus-ring on ${surface} >= 3:1`, () => {
      const ratio = contrastRatio(darkTheme.focusRing, darkTheme[surface]);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });
  }
});

// ─── Validation functions ───

describe('validateThemeContrast', () => {
  it('returns results for all text pairs', () => {
    const results = validateThemeContrast(lightTheme, 'light');
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.pass)).toBe(true);
  });

  it('all dark theme pairs pass', () => {
    const results = validateThemeContrast(darkTheme, 'dark');
    expect(results.every((r) => r.pass)).toBe(true);
  });
});

describe('validateFocusRingContrast', () => {
  it('returns 6 results (3 surfaces x 2 themes)', () => {
    const results = validateFocusRingContrast();
    expect(results).toHaveLength(6);
  });

  it('all focus ring checks pass', () => {
    const results = validateFocusRingContrast();
    expect(results.every((r) => r.pass)).toBe(true);
  });
});

describe('validateContrastMatrix', () => {
  it('overall matrix passes', () => {
    const { results, pass } = validateContrastMatrix();
    expect(pass).toBe(true);
    expect(results.length).toBe(12); // 3 text x 2 themes + 3 surfaces x 2 themes
  });
});

describe('theme snapshots stay aligned with colors.css', () => {
  it('light theme values match exported CSS tokens', () => {
    // CSS uses var() references to primitives; resolve them before comparing
    const lightSection = colorsCss.split('data-theme="dark"')[0];
    expect(resolveColorVar(lightSection, '--color-text-primary')).toBe(lightTheme.textPrimary);
    expect(resolveColorVar(lightSection, '--color-text-secondary')).toBe(lightTheme.textSecondary);
    expect(resolveColorVar(lightSection, '--color-text-tertiary')).toBe(lightTheme.textTertiary);
    expect(resolveColorVar(lightSection, '--color-surface-primary')).toBe(lightTheme.surfacePrimary);
    expect(resolveColorVar(lightSection, '--color-surface-secondary')).toBe(lightTheme.surfaceSecondary);
    expect(resolveColorVar(lightSection, '--color-focus-ring')).toBe(lightTheme.focusRing);
  });

  it('dark theme values match exported CSS tokens', () => {
    // CSS uses var() references; resolve via primitives from full CSS
    const darkSection = colorsCss.split('data-theme="dark"')[1] ?? '';
    expect(resolveColorVar(darkSection, '--color-text-primary', colorsCss)).toBe(darkTheme.textPrimary);
    expect(resolveColorVar(darkSection, '--color-text-secondary', colorsCss)).toBe(darkTheme.textSecondary);
    expect(resolveColorVar(darkSection, '--color-text-tertiary', colorsCss)).toBe(darkTheme.textTertiary);
    expect(resolveColorVar(darkSection, '--color-surface-primary', colorsCss)).toBe(darkTheme.surfacePrimary);
    expect(resolveColorVar(darkSection, '--color-surface-secondary', colorsCss)).toBe(darkTheme.surfaceSecondary);
    expect(resolveColorVar(darkSection, '--color-focus-ring', colorsCss)).toBe(darkTheme.focusRing);
  });
});
