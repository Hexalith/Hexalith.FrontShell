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

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const SRC_DIR = resolve(import.meta.dirname, '..', 'src');
const TOKENS_DIR = resolve(SRC_DIR, 'tokens');
const COMPONENTS_DIR = resolve(SRC_DIR, 'components');

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

// ─── Main ───

function main() {
  console.log('Design System Health Gate');
  console.log('========================\n');

  let allPass = true;

  const compliance = checkTokenCompliance();
  const score = compliance.total > 0
    ? Math.round(((compliance.total - compliance.violations) / compliance.total) * 100)
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

  const propBudget = checkPropBudget();
  console.log(`\n3. Prop Budget: ${propBudget.pass ? 'PASS' : 'FAIL'}`);
  if (propBudget.details.length > 0) {
    for (const d of propBudget.details) console.log(d);
  }
  if (!propBudget.pass) allPass = false;

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Design System Health: ${allPass ? 'PASS' : 'FAIL'}`);

  if (!allPass) {
    process.exit(1);
  }
}

main();
