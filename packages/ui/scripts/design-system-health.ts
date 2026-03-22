/**
 * Design System Health Gate
 *
 * Runs 3 checks NOT covered by existing tools:
 * 1. Token compliance (via computeComplianceScore against CSS module files)
 * 2. Token parity (light/dark theme token presence)
 * 3. Prop budget (declared props count per component)
 *
 * CI orchestrates `pnpm lint`, `pnpm test:ct`, and `pnpm health` as
 * separate parallel steps — this gate does NOT re-invoke lint or test:ct.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

import { validateContrastMatrix } from '../src/utils/contrastMatrix.js';

const SRC_DIR = resolve(import.meta.dirname, '..', 'src');
const TOKENS_DIR = resolve(SRC_DIR, 'tokens');
const COMPONENTS_DIR = resolve(SRC_DIR, 'components');
const REPO_ROOT = resolve(import.meta.dirname, '..', '..');
const MODULES_DIR = resolve(REPO_ROOT, 'modules');

// ─── Check 1: Token Compliance ───

const HARDCODED_PATTERNS = [
  /#[0-9a-fA-F]{3,8}\b/,
  /\b(?:rgba?|hsla?)\s*\(/,
];

const ALLOWED_VALUES = new Set([
  'transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'none',
  '#root',
]);

function findCssModules(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...findCssModules(full));
    } else if (entry.endsWith('.module.css')) {
      files.push(full);
    }
  }
  return files;
}

function checkTokenCompliance(): { total: number; violations: number; details: string[] } {
  const cssFiles = findCssModules(COMPONENTS_DIR);
  let total = 0;
  let violations = 0;
  const details: string[] = [];

  for (const file of cssFiles) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line || line.startsWith('/*') || line.startsWith('*') || line.startsWith('//') ||
          line.startsWith('.') || line.startsWith('&') || line.startsWith('@') ||
          line === '}' || line === '{' || !line.includes(':')) {
        continue;
      }

      if (line.includes('stylelint-disable')) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const value = line.slice(colonIdx + 1).replace(/;$/, '').trim();
      const withoutVars = value.replace(/var\s*\([^)]*\)/g, '');
      const withoutUrls = withoutVars.replace(/url\s*\([^)]*\)/g, '');

      let isViolation = false;
      for (const pattern of HARDCODED_PATTERNS) {
        let cleaned = withoutUrls;
        for (const allowed of ALLOWED_VALUES) {
          cleaned = cleaned.replace(new RegExp(`\\b${allowed}\\b`, 'gi'), '');
        }
        if (pattern.test(cleaned)) {
          isViolation = true;
          break;
        }
      }

      total++;
      if (isViolation) {
        violations++;
        details.push(`  ${relative(SRC_DIR, file)}:${i + 1} — ${line.trim()}`);
      }
    }
  }

  return { total, violations, details };
}

// ─── Check 2: Token Parity (Light/Dark) ───

function checkTokenParity(): { pass: boolean; details: string[] } {
  const colorsFile = resolve(TOKENS_DIR, 'colors.css');
  const content = readFileSync(colorsFile, 'utf8');
  const details: string[] = [];

  const lightMatch = content.match(/:root,\s*:root\[data-theme="light"\]\s*\{([^}]+)\}/s);
  const darkMatch = content.match(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/s);

  if (!lightMatch || !darkMatch) {
    return { pass: false, details: ['Could not parse light/dark theme blocks from colors.css'] };
  }

  const extractTokens = (block: string) => {
    const tokens = new Set<string>();
    const regex = /(--color-[a-z0-9-]+)\s*:/g;
    let match;
    while ((match = regex.exec(block)) !== null) {
      tokens.add(match[1]);
    }
    return tokens;
  };

  const lightTokens = extractTokens(lightMatch[1]);
  const darkTokens = extractTokens(darkMatch[1]);

  for (const token of lightTokens) {
    if (!darkTokens.has(token)) {
      details.push(`  Missing in dark theme: ${token}`);
    }
  }

  for (const token of darkTokens) {
    if (!lightTokens.has(token)) {
      details.push(`  Missing in light theme: ${token}`);
    }
  }

  return { pass: details.length === 0, details };
}

// ─── Check 2b: Contrast Matrix ───

function checkContrastMatrix(): { pass: boolean; details: string[] } {
  const { results, pass } = validateContrastMatrix();
  const details = results
    .filter((result) => !result.pass)
    .map(
      (result) =>
        `  ${result.theme}: ${result.pair} ${result.ratio}:1 (required ${result.required}:1)`,
    );

  return { pass, details };
}

// ─── Check 3: Prop Budget ───

const COMPLEX_COMPONENTS = new Set([
  'Table', 'Form', 'DetailView', 'Sidebar', 'DropdownMenu', 'Popover', 'PageLayout',
  'DatePicker', 'TextArea', // Form inputs with additional constraints (min/max dates, rows, resize)
]);

function findComponentFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...findComponentFiles(full));
    } else if (entry.endsWith('.tsx') && !entry.includes('.test.') && !entry.includes('.spec.') && !entry.includes('.stories.')) {
      files.push(full);
    }
  }
  return files;
}

function extractBalancedBody(content: string, openIdx: number): string | null {
  let depth = 1;
  let i = openIdx + 1;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }
  if (depth !== 0) return null;
  return content.slice(openIdx + 1, i - 1);
}

function checkPropBudget(): { pass: boolean; details: string[] } {
  const files = findComponentFiles(COMPONENTS_DIR);
  const details: string[] = [];
  let pass = true;

  for (const file of files) {
    const content = readFileSync(file, 'utf8');

    const headerRegex = /export\s+interface\s+(\w+Props)\s*(?:extends\s+[^{]+)?\{/g;
    let match;

    while ((match = headerRegex.exec(content)) !== null) {
      const interfaceName = match[1];
      const openIdx = match.index + match[0].length - 1;
      const body = extractBalancedBody(content, openIdx);
      if (!body) continue;

      const props = body
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') &&
                 !trimmed.startsWith('*') && (trimmed.includes(':') || trimmed.includes('?:'));
        });

      const declaredCount = props.length;
      const componentName = interfaceName.replace('Props', '');
      const isComplex = COMPLEX_COMPONENTS.has(componentName);
      const limit = isComplex ? 20 : 12;

      if (declaredCount > limit) {
        pass = false;
        details.push(`  ${componentName}: ${declaredCount} props (limit: ${limit}, ${isComplex ? 'complex' : 'simple'})`);
      }
    }
  }

  return { pass, details };
}

// ─── External Gate Status ───

type ExternalGateStatus = 'pass' | 'fail' | 'skipped';

function resolveExternalGateStatus(value: string | undefined): ExternalGateStatus {
  if (value === 'success') {
    return 'pass';
  }

  if (value === 'failure') {
    return 'fail';
  }

  return 'skipped';
}

// ─── Migration Status Detection ───

function findManifestFiles(dir: string): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...findManifestFiles(full));
    } else if (entry === 'manifest.ts') {
      files.push(full);
    }
  }

  return files;
}

function detectCoexistingModules(): string[] {
  const manifestFiles = findManifestFiles(MODULES_DIR);
  return manifestFiles
    .filter((file) => /migrationStatus\s*:\s*['"]coexisting['"]/.test(readFileSync(file, 'utf8')))
    .map((file) => relative(REPO_ROOT, file));
}

// ─── Main ───

interface HealthReport {
  score: number;
  total: number;
  violations: number;
  tokenParity: 'pass' | 'fail';
  contrastMatrix: 'pass' | 'fail';
  propBudget: 'pass' | 'fail';
  accessibility: ExternalGateStatus;
  importBoundaries: ExternalGateStatus;
  inlineStyleBan: ExternalGateStatus;
  warnOnly: boolean;
  coexistingModules: string[];
  details: string[];
}

function main() {
  const coexistingModules = detectCoexistingModules();
  const warnOnly = process.argv.includes('--warn-only') || coexistingModules.length > 0;
  const lintStatus = resolveExternalGateStatus(process.env.LINT_STATUS);
  const a11yStatus = resolveExternalGateStatus(process.env.A11Y_STATUS);

  console.log('Design System Health Gate');
  console.log('========================\n');

  let allPass = true;

  const compliance = checkTokenCompliance();
  const score = compliance.total > 0
    ? parseFloat(((compliance.total - compliance.violations) / compliance.total * 100).toFixed(1))
    : 100;
  const compliancePass = score === 100;
  console.log(`1. Token Compliance: ${compliancePass ? 'PASS' : 'FAIL'} (${score}% — ${compliance.total - compliance.violations}/${compliance.total} declarations compliant)`);
  if (compliance.details.length > 0) {
    console.log('   Violations:');
    for (const d of compliance.details.slice(0, 10)) console.log(d);
    if (compliance.details.length > 10) console.log(`   ... and ${compliance.details.length - 10} more`);
  }
  if (!compliancePass) allPass = false;

  const parity = checkTokenParity();
  console.log(`\n2. Token Parity (Light/Dark): ${parity.pass ? 'PASS' : 'FAIL'}`);
  if (parity.details.length > 0) {
    for (const d of parity.details) console.log(d);
  }
  if (!parity.pass) allPass = false;

  const contrast = checkContrastMatrix();
  console.log(`\n3. Contrast Matrix: ${contrast.pass ? 'PASS' : 'FAIL'}`);
  if (contrast.details.length > 0) {
    for (const d of contrast.details) console.log(d);
  }
  if (!contrast.pass) allPass = false;

  const propBudget = checkPropBudget();
  console.log(`\n4. Prop Budget: ${propBudget.pass ? 'PASS' : 'FAIL'}`);
  if (propBudget.details.length > 0) {
    for (const d of propBudget.details) console.log(d);
  }
  if (!propBudget.pass) allPass = false;

  console.log(`\n5. Accessibility (Playwright CT): ${a11yStatus.toUpperCase()}`);
  console.log(`6. Import Boundaries (via lint): ${lintStatus.toUpperCase()}`);
  console.log(`7. Inline Style Ban (via lint): ${lintStatus.toUpperCase()}`);

  if (a11yStatus === 'fail' || lintStatus === 'fail') {
    allPass = false;
  }

  if (coexistingModules.length > 0) {
    console.log(`\nCoexisting modules detected (${coexistingModules.length}) — running in warn-only mode:`);
    for (const modulePath of coexistingModules) {
      console.log(`  ${modulePath}`);
    }
  }

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Design System Health: ${allPass ? 'PASS' : 'FAIL'}${warnOnly ? ' (warn-only mode)' : ''}`);

  // Write machine-readable JSON report
  const report: HealthReport = {
    score,
    total: compliance.total,
    violations: compliance.violations,
    tokenParity: parity.pass ? 'pass' : 'fail',
    contrastMatrix: contrast.pass ? 'pass' : 'fail',
    propBudget: propBudget.pass ? 'pass' : 'fail',
    accessibility: a11yStatus,
    importBoundaries: lintStatus,
    inlineStyleBan: lintStatus,
    warnOnly,
    coexistingModules,
    details: [
      ...compliance.details,
      ...parity.details,
      ...contrast.details,
      ...propBudget.details,
    ],
  };

  const reportPath = resolve(import.meta.dirname, '..', 'health-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`\nJSON report written to health-report.json`);

  if (!allPass && !warnOnly) {
    process.exit(1);
  }
}

main();
