import stylelint from 'stylelint';

import type { ChildNode } from 'postcss';

const { createPlugin, utils } = stylelint;

// ─── Configuration ───

function getSeverity(): 'warning' | 'error' {
  const mode = process.env.HEXALITH_SCANNER_MODE || 'development';
  return mode === 'ci' ? 'error' : 'warning';
}

// ─── Constants ───

const COLOR_ALLOWLIST = new Set([
  'transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'none',
]);

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;
const COLOR_FUNC_RE = /\b(?:rgba?|hsla?|oklch|color-mix)\s*\(/i;

const SPACING_PROPERTIES = new Set([
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'margin-inline', 'margin-block', 'margin-inline-start', 'margin-inline-end',
  'margin-block-start', 'margin-block-end',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'padding-inline', 'padding-block', 'padding-inline-start', 'padding-inline-end',
  'padding-block-start', 'padding-block-end',
  'gap', 'row-gap', 'column-gap',
]);

const SPACING_SCALE_PX = new Set([0, 4, 8, 12, 16, 24, 32, 48, 64]);
const SPACING_SCALE_REM = new Set([0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]);

const FONT_SIZE_SCALE_REM = new Set([0.64, 0.8, 1, 1.25, 1.563, 1.953, 2.441]);
const FONT_SIZE_SCALE_PX = new Set([10.24, 12.8, 16, 20, 25.008, 31.248, 39.056]);

const MOTION_PROPERTIES = new Set(['transition-duration', 'animation-duration']);
const SPATIAL_TOKEN_PREFIXES = ['--spacing-', '--radius-', '--size-'];

// ─── Utilities ───

function stripVarAndUrl(value: string): string {
  return value.replace(/var\s*\([^)]*\)/g, '').replace(/url\s*\([^)]*\)/g, '');
}

function stripAllowedKeywords(value: string): string {
  let result = value;
  for (const keyword of COLOR_ALLOWLIST) {
    result = result.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '');
  }
  return result;
}

function hasHardcodedColor(value: string): boolean {
  const stripped = stripAllowedKeywords(stripVarAndUrl(value));
  return HEX_RE.test(stripped) || COLOR_FUNC_RE.test(stripped);
}

function isValidSpacingValue(part: string): boolean {
  const trimmed = part.trim();
  if (!trimmed || ['0', 'auto', 'inherit', 'initial', 'unset', 'none'].includes(trimmed)) return true;
  if (trimmed.startsWith('var(')) return true;
  if (/%|vh|vw|dvh|dvw|svh|svw/.test(trimmed)) return true;

  const pxMatch = trimmed.match(/^(-?\d+\.?\d*)px$/);
  if (pxMatch) return SPACING_SCALE_PX.has(Math.abs(parseFloat(pxMatch[1])));

  const remMatch = trimmed.match(/^(-?\d+\.?\d*)rem$/);
  if (remMatch) return SPACING_SCALE_REM.has(Math.abs(parseFloat(remMatch[1])));

  return true;
}

function hasHardcodedPxInCalc(value: string): boolean {
  const calcMatches = value.match(/calc\s*\([^)]+\)/gi);
  if (!calcMatches) return false;
  return calcMatches.some((calc) => /\d+\.?\d*px/.test(calc));
}

function isValidFontSize(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.startsWith('var(')) return true;
  if (
    [
      'inherit', 'initial', 'unset', 'smaller', 'larger',
      'xx-small', 'x-small', 'small', 'medium', 'large', 'x-large', 'xx-large', 'xxx-large',
    ].includes(trimmed)
  ) return true;
  if (/%/.test(trimmed)) return true;
  if (/em$/.test(trimmed) && !/rem$/.test(trimmed)) return true;

  const remMatch = trimmed.match(/^(\d+\.?\d*)rem$/);
  if (remMatch) return FONT_SIZE_SCALE_REM.has(parseFloat(remMatch[1]));

  const pxMatch = trimmed.match(/^(\d+\.?\d*)px$/);
  if (pxMatch) return FONT_SIZE_SCALE_PX.has(parseFloat(pxMatch[1]));

  return true;
}

function nearestSpacingToken(value: string): string {
  const pxMatch = value.match(/(\d+\.?\d*)px/);
  if (pxMatch) {
    const num = parseFloat(pxMatch[1]);
    const scale = [0, 4, 8, 12, 16, 24, 32, 48, 64];
    const nearest = scale.reduce((a, b) => (Math.abs(b - num) < Math.abs(a - num) ? b : a));
    const index = scale.indexOf(nearest);
    return `var(--spacing-${index})`;
  }
  return 'a spacing token (e.g., var(--spacing-2))';
}

function hasHardcodedSpacingLiteral(value: string): boolean {
  const stripped = stripVarAndUrl(value);

  return /(^|[\s,(])(?:-?\d+\.?\d*)(?:px|rem)\b/i.test(stripped);
}

function isSpatialToken(token: string): boolean {
  return SPATIAL_TOKEN_PREFIXES.some((prefix) => token.startsWith(prefix));
}

// ─── Rule 1: no-hardcoded-colors ───

const noHardcodedColorsName = 'hexalith/no-hardcoded-colors';
const noHardcodedColorsMessages = utils.ruleMessages(noHardcodedColorsName, {
  rejected: (value: string) =>
    `Unexpected hardcoded color "${value}". Use a design token (e.g., var(--color-text-primary)).`,
});

const noHardcodedColors = createPlugin(noHardcodedColorsName, ((primary) => {
  return (root, result) => {
    const valid = utils.validateOptions(result, noHardcodedColorsName, { actual: primary, possible: [true] });
    if (!valid) return;
    root.walkDecls((decl) => {
      if (decl.prop.startsWith('--')) return;
      if (hasHardcodedColor(decl.value)) {
        utils.report({
          message: noHardcodedColorsMessages.rejected(decl.value),
          node: decl,
          result,
          ruleName: noHardcodedColorsName,
          severity: getSeverity(),
        });
      }
    });
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any);

// ─── Rule 2: no-hardcoded-spacing ───

const noHardcodedSpacingName = 'hexalith/no-hardcoded-spacing';
const noHardcodedSpacingMessages = utils.ruleMessages(noHardcodedSpacingName, {
  rejected: (value: string) =>
    `Unexpected hardcoded spacing "${value}". Use ${nearestSpacingToken(value)}.`,
  rejectedCalc: () =>
    'Hardcoded value in calc() for spacing. Use tokens in calc (e.g., calc(100% - var(--spacing-4))).',
});

const noHardcodedSpacing = createPlugin(noHardcodedSpacingName, ((primary) => {
  return (root, result) => {
    const valid = utils.validateOptions(result, noHardcodedSpacingName, { actual: primary, possible: [true] });
    if (!valid) return;
    root.walkDecls((decl) => {
      if (decl.prop.startsWith('--')) return;
      if (!SPACING_PROPERTIES.has(decl.prop)) return;
      const value = decl.value;
      if (hasHardcodedPxInCalc(value)) {
        utils.report({
          message: noHardcodedSpacingMessages.rejectedCalc(),
          node: decl,
          result,
          ruleName: noHardcodedSpacingName,
          severity: getSeverity(),
        });
        return;
      }
      const parts = value.split(/\s+/);
      for (const part of parts) {
        if (!isValidSpacingValue(part)) {
          utils.report({
            message: noHardcodedSpacingMessages.rejected(part),
            node: decl,
            result,
            ruleName: noHardcodedSpacingName,
            severity: getSeverity(),
          });
          return;
        }
      }
    });
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any);

// ─── Rule 3: no-hardcoded-typography ───

const noHardcodedTypographyName = 'hexalith/no-hardcoded-typography';
const noHardcodedTypographyMessages = utils.ruleMessages(noHardcodedTypographyName, {
  rejected: (value: string) =>
    `Font-size "${value}" is not in the 7-step type scale. Use a font-size token (e.g., var(--font-size-body)).`,
});

const noHardcodedTypography = createPlugin(noHardcodedTypographyName, ((primary) => {
  return (root, result) => {
    const valid = utils.validateOptions(result, noHardcodedTypographyName, { actual: primary, possible: [true] });
    if (!valid) return;
    root.walkDecls('font-size', (decl) => {
      if (decl.prop.startsWith('--')) return;
      if (!isValidFontSize(decl.value)) {
        utils.report({
          message: noHardcodedTypographyMessages.rejected(decl.value),
          node: decl,
          result,
          ruleName: noHardcodedTypographyName,
          severity: getSeverity(),
        });
      }
    });
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any);

// ─── Rule 4: no-hardcoded-motion ───

const noHardcodedMotionName = 'hexalith/no-hardcoded-motion';
const noHardcodedMotionMessages = utils.ruleMessages(noHardcodedMotionName, {
  rejected: (value: string) =>
    `Hardcoded duration "${value}". Use a motion token (e.g., var(--transition-duration-default)).`,
});

const noHardcodedMotion = createPlugin(noHardcodedMotionName, ((primary) => {
  return (root, result) => {
    const valid = utils.validateOptions(result, noHardcodedMotionName, { actual: primary, possible: [true] });
    if (!valid) return;
    root.walkDecls((decl) => {
      if (decl.prop.startsWith('--')) return;
      if (!MOTION_PROPERTIES.has(decl.prop)) return;
      const value = decl.value.trim();
      if (value.startsWith('var(')) return;
      if (['inherit', 'initial', 'unset', '0s', '0ms'].includes(value)) return;
      utils.report({
        message: noHardcodedMotionMessages.rejected(value),
        node: decl,
        result,
        ruleName: noHardcodedMotionName,
        severity: getSeverity(),
      });
    });
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any);

// ─── Rule 5: no-important ───

const noImportantName = 'hexalith/no-important';
const noImportantMessages = utils.ruleMessages(noImportantName, {
  rejected: () => '!important is not allowed. Use CSS layers and specificity management instead.',
});

const noImportant = createPlugin(noImportantName, ((primary) => {
  return (root, result) => {
    const valid = utils.validateOptions(result, noImportantName, { actual: primary, possible: [true] });
    if (!valid) return;
    root.walkDecls((decl) => {
      if (decl.important) {
        utils.report({
          message: noImportantMessages.rejected(),
          node: decl,
          result,
          ruleName: noImportantName,
          severity: getSeverity(),
        });
      }
    });
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any);

// ─── Rule 6: no-hardcoded-custom-props ───

const noHardcodedCustomPropsName = 'hexalith/no-hardcoded-custom-props';
const noHardcodedCustomPropsMessages = utils.ruleMessages(noHardcodedCustomPropsName, {
  rejected: (prop: string) =>
    `Custom property "${prop}" contains hardcoded color or spacing values. Use design tokens instead.`,
});

const noHardcodedCustomProps = createPlugin(noHardcodedCustomPropsName, ((primary) => {
  return (root, result) => {
    const valid = utils.validateOptions(result, noHardcodedCustomPropsName, { actual: primary, possible: [true] });
    if (!valid) return;
    root.walkDecls(/^--/, (decl) => {
      if (decl.prop.startsWith('--primitive-')) return;
      if (hasHardcodedColor(decl.value) || hasHardcodedSpacingLiteral(decl.value)) {
        utils.report({
          message: noHardcodedCustomPropsMessages.rejected(decl.prop),
          node: decl,
          result,
          ruleName: noHardcodedCustomPropsName,
          severity: getSeverity(),
        });
      }
    });
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any);

// ─── Rule 7: theme-parity ───

const themeParityName = 'hexalith/theme-parity';
const themeParityMessages = utils.ruleMessages(themeParityName, {
  missingDark: (token: string) =>
    `Semantic token "${token}" defined in light theme but missing in dark theme.`,
  missingLight: (token: string) =>
    `Semantic token "${token}" defined in dark theme but missing in light theme.`,
});

const themeParity = createPlugin(themeParityName, ((primary) => {
  return (root, result) => {
    const valid = utils.validateOptions(result, themeParityName, { actual: primary, possible: [true] });
    if (!valid) return;

    const lightTokens = new Map<string, string>();
    const darkTokens = new Map<string, string>();
    let lightNode: ChildNode = root.first!;
    let darkNode: ChildNode = root.first!;

    root.walkRules((rule) => {
      const selector = rule.selector;
      const isLight = /data-theme=["']light["']/.test(selector);
      const isDark = /data-theme=["']dark["']/.test(selector);

      if (isLight) {
        lightNode = rule;
        rule.walkDecls(/^--/, (decl) => {
          if (!decl.prop.startsWith('--primitive-')) lightTokens.set(decl.prop, decl.value.trim());
        });
      }
      if (isDark) {
        darkNode = rule;
        rule.walkDecls(/^--/, (decl) => {
          if (!decl.prop.startsWith('--primitive-')) darkTokens.set(decl.prop, decl.value.trim());
        });
      }
    });

    if (lightTokens.size === 0 || darkTokens.size === 0) return;

    for (const [token, lightValue] of lightTokens) {
      if (!darkTokens.has(token)) {
        utils.report({
          message: themeParityMessages.missingDark(token),
          node: lightNode,
          result,
          ruleName: themeParityName,
          severity: getSeverity(),
        });
        continue;
      }

      if (isSpatialToken(token) && darkTokens.get(token) !== lightValue) {
        utils.report({
          message: `Spatial token "${token}" must have identical values across themes (light: ${lightValue}, dark: ${darkTokens.get(token)}).`,
          node: darkNode,
          result,
          ruleName: themeParityName,
          severity: getSeverity(),
        });
      }
    }
    for (const token of darkTokens.keys()) {
      if (!lightTokens.has(token)) {
        utils.report({
          message: themeParityMessages.missingLight(token),
          node: darkNode,
          result,
          ruleName: themeParityName,
          severity: getSeverity(),
        });
      }
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any);

// ─── Default export: all plugins ───

export default [
  noHardcodedColors,
  noHardcodedSpacing,
  noHardcodedTypography,
  noHardcodedMotion,
  noImportant,
  noHardcodedCustomProps,
  themeParity,
];
