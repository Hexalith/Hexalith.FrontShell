import { execSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const sleep = (ms: number) =>
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

describe('CSS layer smoke', () => {
  it('preserves @layer components in built dist CSS', () => {
    const distCssPath = resolve(process.cwd(), 'dist/index.css');
    const distDir = dirname(distCssPath);
    const lockPath = resolve(distDir, '.layer-smoke-lock');

    mkdirSync(distDir, { recursive: true });

    // Always build (under a lock) so we assert evidence from the current source,
    // not a potentially stale `dist/` from previous runs.
    let lockFd: number | null = null;
    try {
      lockFd = openSync(lockPath, 'wx');
    } catch (err: unknown) {
      const maybeCode =
        typeof err === 'object' && err !== null && 'code' in err
          ? (err as { code?: unknown }).code
          : undefined;
      if (maybeCode !== 'EEXIST') throw err;
    }

    if (lockFd != null) {
      try {
        // execSync is safe here: the command is a hardcoded string with no user input
        execSync('pnpm run build', { stdio: 'ignore' });
      } finally {
        closeSync(lockFd);
        // Best-effort cleanup; if it fails we don't want the test to hard-fail.
        try {
          unlinkSync(lockPath);
        } catch {
          // ignore
        }
      }
    } else {
      const start = Date.now();
      while (existsSync(lockPath) && Date.now() - start < 10_000) {
        sleep(100);
      }

      expect(existsSync(distCssPath)).toBe(true);
    }

    const css = readFileSync(distCssPath, 'utf8');
    expect(css).toContain('@layer components');
    expect(css).toContain('PageLayout.module.css');
  }, 30_000);
});
