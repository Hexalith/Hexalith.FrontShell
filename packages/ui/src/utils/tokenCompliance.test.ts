import stylelint from 'stylelint';
import { describe, it, expect, afterEach } from 'vitest';

import { computeComplianceScore } from './complianceScore';
import plugins from './tokenCompliance';

async function lint(code: string, rules: Record<string, unknown>) {
  const result = await stylelint.lint({
    code,
    config: {
      plugins: plugins as unknown as string[],
      rules,
    },
  });
  return result.results[0];
}

// ─── Rule 1: no-hardcoded-colors ───

describe('hexalith/no-hardcoded-colors', () => {
  const rule = { 'hexalith/no-hardcoded-colors': true };

  it('passes for var() token references', async () => {
    const r = await lint('a { color: var(--color-text-primary); }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('passes for transparent', async () => {
    const r = await lint('a { background: transparent; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('passes for currentColor', async () => {
    const r = await lint('a { border-color: currentColor; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('passes for inherit', async () => {
    const r = await lint('a { color: inherit; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('ignores custom property definitions', async () => {
    const r = await lint(':root { --my-color: #f5f5f5; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('flags 6-digit hex colors', async () => {
    const r = await lint('a { color: #f5f5f5; }', rule);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].rule).toBe('hexalith/no-hardcoded-colors');
  });

  it('flags 3-digit hex colors', async () => {
    const r = await lint('a { color: #fff; }', rule);
    expect(r.warnings).toHaveLength(1);
  });

  it('flags rgb()', async () => {
    const r = await lint('a { color: rgb(255, 0, 0); }', rule);
    expect(r.warnings).toHaveLength(1);
  });

  it('flags rgba()', async () => {
    const r = await lint('a { color: rgba(255, 0, 0, 0.5); }', rule);
    expect(r.warnings).toHaveLength(1);
  });

  it('flags hsl()', async () => {
    const r = await lint('a { color: hsl(0, 100%, 50%); }', rule);
    expect(r.warnings).toHaveLength(1);
  });

  it('flags oklch()', async () => {
    const r = await lint('a { color: oklch(0.5 0.2 240); }', rule);
    expect(r.warnings).toHaveLength(1);
  });

  it('flags color-mix()', async () => {
    const r = await lint('a { color: color-mix(in srgb, red 50%, blue); }', rule);
    expect(r.warnings).toHaveLength(1);
  });

  it('flags hardcoded color in border shorthand', async () => {
    const r = await lint('a { border: 1px solid #ccc; }', rule);
    expect(r.warnings).toHaveLength(1);
  });

  it('passes for border with transparent', async () => {
    const r = await lint('a { border: 1px solid transparent; }', rule);
    expect(r.warnings).toHaveLength(0);
  });
});

// ─── Rule 2: no-hardcoded-spacing ───

describe('hexalith/no-hardcoded-spacing', () => {
  const rule = { 'hexalith/no-hardcoded-spacing': true };

  it('passes for var() references', async () => {
    const r = await lint('a { margin: var(--spacing-4); }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('passes for 0', async () => {
    const r = await lint('a { margin: 0; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('passes for auto', async () => {
    const r = await lint('a { margin: 0 auto; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('passes for values in the 4px scale (16px)', async () => {
    const r = await lint('a { padding: 16px; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('passes for rem equivalents (1rem = 16px)', async () => {
    const r = await lint('a { padding: 1rem; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('passes for percentages', async () => {
    const r = await lint('a { margin: 50%; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('ignores non-spacing properties', async () => {
    const r = await lint('a { width: 200px; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('flags values not in the scale (10px)', async () => {
    const r = await lint('a { margin: 10px; }', rule);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].rule).toBe('hexalith/no-hardcoded-spacing');
  });

  it('flags values not in the scale (5px)', async () => {
    const r = await lint('a { padding: 5px; }', rule);
    expect(r.warnings).toHaveLength(1);
  });

  it('flags calc() with hardcoded px', async () => {
    const r = await lint('a { margin: calc(100% - 16px); }', rule);
    expect(r.warnings).toHaveLength(1);
  });
});

// ─── Rule 3: no-hardcoded-typography ───

describe('hexalith/no-hardcoded-typography', () => {
  const rule = { 'hexalith/no-hardcoded-typography': true };

  it('passes for var() references', async () => {
    const r = await lint('a { font-size: var(--font-size-body); }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('passes for scale values (1rem)', async () => {
    const r = await lint('a { font-size: 1rem; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('passes for inherit', async () => {
    const r = await lint('a { font-size: inherit; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('flags values not in the scale (14px)', async () => {
    const r = await lint('a { font-size: 14px; }', rule);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].rule).toBe('hexalith/no-hardcoded-typography');
  });

  it('flags values not in the scale (1.1rem)', async () => {
    const r = await lint('a { font-size: 1.1rem; }', rule);
    expect(r.warnings).toHaveLength(1);
  });
});

// ─── Rule 4: no-hardcoded-motion ───

describe('hexalith/no-hardcoded-motion', () => {
  const rule = { 'hexalith/no-hardcoded-motion': true };

  it('passes for var() references', async () => {
    const r = await lint('a { transition-duration: var(--transition-duration-default); }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('passes for 0s', async () => {
    const r = await lint('a { transition-duration: 0s; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('flags hardcoded transition-duration', async () => {
    const r = await lint('a { transition-duration: 300ms; }', rule);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].rule).toBe('hexalith/no-hardcoded-motion');
  });

  it('flags hardcoded animation-duration', async () => {
    const r = await lint('a { animation-duration: 0.5s; }', rule);
    expect(r.warnings).toHaveLength(1);
  });
});

// ─── Rule 5: no-important ───

describe('hexalith/no-important', () => {
  const rule = { 'hexalith/no-important': true };

  it('passes without !important', async () => {
    const r = await lint('a { color: var(--color-text-primary); }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('flags !important', async () => {
    const r = await lint('a { color: red !important; }', rule);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].rule).toBe('hexalith/no-important');
  });
});

// ─── Rule 6: no-hardcoded-custom-props ───

describe('hexalith/no-hardcoded-custom-props', () => {
  const rule = { 'hexalith/no-hardcoded-custom-props': true };

  it('passes for var() values in custom props', async () => {
    const r = await lint(':root { --my-color: var(--color-text-primary); }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('passes for primitive token definitions', async () => {
    const r = await lint(':root { --primitive-color-gray-50: #FAF9F7; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('flags custom props with hardcoded hex', async () => {
    const r = await lint('.component { --my-custom-bg: #f5f5f5; }', rule);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].rule).toBe('hexalith/no-hardcoded-custom-props');
  });

  it('flags custom props with rgb()', async () => {
    const r = await lint('.component { --overlay: rgba(0,0,0,0.5); }', rule);
    expect(r.warnings).toHaveLength(1);
  });

  it('flags custom props with hardcoded spacing literals', async () => {
    const r = await lint('.component { --custom-gap: 16px; }', rule);
    expect(r.warnings).toHaveLength(1);
  });
});

// ─── Rule 7: theme-parity ───

describe('hexalith/theme-parity', () => {
  const rule = { 'hexalith/theme-parity': true };

  it('passes when light and dark tokens match', async () => {
    const r = await lint(
      ':root[data-theme="light"] { --color-text-primary: #1E1D19; }\n' +
      ':root[data-theme="dark"] { --color-text-primary: #E8E6E1; }',
      rule,
    );
    expect(r.warnings).toHaveLength(0);
  });

  it('flags token in light missing from dark', async () => {
    const r = await lint(
      ':root[data-theme="light"] { --color-text-primary: #1E1D19; --color-text-secondary: #4D4A42; }\n' +
      ':root[data-theme="dark"] { --color-text-primary: #E8E6E1; }',
      rule,
    );
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].text).toContain('--color-text-secondary');
  });

  it('skips primitive tokens in parity check', async () => {
    const r = await lint(
      ':root[data-theme="light"] { --primitive-color-gray-50: #FAF9F7; --color-text-primary: #1E1D19; }\n' +
      ':root[data-theme="dark"] { --color-text-primary: #E8E6E1; }',
      rule,
    );
    expect(r.warnings).toHaveLength(0);
  });

  it('does nothing when only one theme exists', async () => {
    const r = await lint(':root[data-theme="light"] { --color-text-primary: #1E1D19; }', rule);
    expect(r.warnings).toHaveLength(0);
  });

  it('flags spatial token mismatches across themes', async () => {
    const r = await lint(
      ':root[data-theme="light"] { --spacing-cell: var(--primitive-space-3); }\n' +
      ':root[data-theme="dark"] { --spacing-cell: var(--primitive-space-2); }',
      rule,
    );
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].text).toContain('identical values across themes');
  });
});

// ─── Dual mode ───

describe('dual mode (development/ci)', () => {
  const original = process.env.HEXALITH_SCANNER_MODE;

  afterEach(() => {
    if (original !== undefined) {
      process.env.HEXALITH_SCANNER_MODE = original;
    } else {
      delete process.env.HEXALITH_SCANNER_MODE;
    }
  });

  it('reports warnings in development mode', async () => {
    process.env.HEXALITH_SCANNER_MODE = 'development';
    const r = await lint('a { color: #f5f5f5; }', { 'hexalith/no-hardcoded-colors': true });
    expect(r.warnings[0].severity).toBe('warning');
  });

  it('reports errors in ci mode', async () => {
    process.env.HEXALITH_SCANNER_MODE = 'ci';
    const r = await lint('a { color: #f5f5f5; }', { 'hexalith/no-hardcoded-colors': true });
    expect(r.warnings[0].severity).toBe('error');
  });
});

// ─── Compliance Score ───

describe('computeComplianceScore', () => {
  it('returns 100 for no violations', () => {
    expect(computeComplianceScore(100, 0)).toBe(100);
  });

  it('returns 0 for all violations', () => {
    expect(computeComplianceScore(100, 100)).toBe(0);
  });

  it('calculates percentage correctly', () => {
    expect(computeComplianceScore(200, 10)).toBe(95);
  });

  it('returns 100 for empty files', () => {
    expect(computeComplianceScore(0, 0)).toBe(100);
  });
});
