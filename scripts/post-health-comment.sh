#!/usr/bin/env bash
# Post Design System Health report as GitHub Actions step summary.
# Reads packages/ui/health-report.json and formats it for $GITHUB_STEP_SUMMARY.

set -euo pipefail

REPORT="packages/ui/health-report.json"

if [ ! -f "$REPORT" ]; then
  echo "Warning: $REPORT not found — skipping step summary"
  exit 0
fi

node --input-type=module - "$REPORT" >> "$GITHUB_STEP_SUMMARY" <<'EOF'
import { readFileSync } from 'node:fs';

const reportPath = process.argv[2];
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const toUpper = (value) => String(value ?? 'skipped').toUpperCase();
const compliant = report.total - report.violations;
const lines = [
  `## Design System Health: ${report.score}%`,
  '',
  `- Token Compliance: ${report.score}% (${compliant}/${report.total} declarations)`,
  `- Token Parity (Light/Dark): ${toUpper(report.tokenParity)}`,
  `- Contrast Matrix: ${toUpper(report.contrastMatrix)}`,
  `- Prop Budget: ${toUpper(report.propBudget)}`,
  `- Accessibility (Playwright CT): ${toUpper(report.accessibility)}`,
  `- Import Boundaries: ${toUpper(report.importBoundaries)}`,
  `- Inline Style Ban: ${toUpper(report.inlineStyleBan)}`,
];

if (report.warnOnly) {
  lines.push('- Migration Mode: WARN-ONLY (coexisting module detected)');
}

if (report.violations > 0) {
  const details = Array.isArray(report.details) ? report.details : [];
  lines.push('', `<details><summary>${report.violations} violation(s)</summary>`, '', '```');
  lines.push(...details.slice(0, 20));
  if (details.length > 20) {
    lines.push(`... and ${details.length - 20} more`);
  }
  lines.push('```', '</details>');
}

console.log(lines.join('\n'));
EOF

echo "Design System Health summary written to step summary"
