import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const SCRIPT_PATH = resolve(REPO_ROOT, 'scripts/scaffold-smoke-test.sh');

describe('scaffold smoke test script', () => {
  it('exists in the repository root scripts directory', () => {
    expect(existsSync(SCRIPT_PATH)).toBe(true);
  });

  it('orchestrates scaffold, install, typecheck, test, lint, and cleanup', () => {
    const script = readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('#!/usr/bin/env bash');
    expect(script).toContain('set -euo pipefail');
    expect(script).toContain('trap cleanup EXIT');
    expect(script).toContain('node tools/create-hexalith-module/dist/index.js');
    expect(script).toContain('pnpm install --frozen-lockfile');
    expect(script).toContain('pnpm install --no-frozen-lockfile');
    expect(script).toContain('pnpm tsc --noEmit');
    expect(script).toContain('pnpm test');
    expect(script).toContain('pnpm lint');
    expect(script).toContain('rm -rf "$OUTPUT_DIR" "$WORKSPACE_DIR"');
  });
});